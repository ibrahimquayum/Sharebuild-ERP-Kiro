import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { safeAuditLog } from '@/lib/audit';
import { reverseCashBankTransaction } from '@/lib/cash-bank';
import { getAccessContext, hasPermission, hasProjectAccess } from '@/lib/access-control';
import { isSubcontractorSupplierType } from '@/lib/project-vendor-ledger';

const reverseSchema = z.object({
  reason: z.string().trim().min(3, 'A reversal reason is required.'),
});

export async function POST(req: NextRequest, { params }: { params: { id: string; paymentId: string } }) {
  const context = await getAccessContext();
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const companyId = context.companyId;
  const userId = context.userId;

  const parsed = reverseSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });

  const payment = await prisma.supplierPayment.findFirst({
    where: { id: params.paymentId, payableId: params.id, payable: { supplier: { companyId } } },
    include: { payable: { include: { phase: { select: { auditLockedAt: true } }, supplier: { select: { supplierType: true } } } } },
  });
  if (!payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
  const module = isSubcontractorSupplierType(payment.payable.supplier.supplierType) ? 'subcontractors' : 'suppliers';
  if (!hasPermission(context, module, 'reverseAdjust')) return NextResponse.json({ error: 'Insufficient permissions.' }, { status: 403 });
  if (!hasProjectAccess(context, payment.payable.projectId)) return NextResponse.json({ error: 'You are not assigned to this project.' }, { status: 403 });
  if (payment.reversedAt || payment.status === 'REVERSED') return NextResponse.json({ error: 'Payment is already reversed.' }, { status: 400 });
  if (payment.payable.reversedAt) return NextResponse.json({ error: 'Cannot reverse payment for a reversed bill.' }, { status: 400 });
  if (payment.payable.phase?.auditLockedAt) return NextResponse.json({ error: 'This phase is audit locked. Unlock with an audit reason before changing accounting records.' }, { status: 423 });

  const updated = await prisma.$transaction(async (tx) => {
    const reversed = await tx.supplierPayment.update({
      where: { id: payment.id },
      data: {
        status: 'REVERSED',
        reversedAt: new Date(),
        reversedById: userId,
        reversalReason: parsed.data.reason,
      },
    });
    const newPaid = Math.max(Number(payment.payable.paidAmount) - Number(payment.amount), 0);
    const netPayable = Number(payment.payable.netPayableAmount ?? payment.payable.totalAmount);
    const retentionRemaining = Math.max(Number(payment.payable.retentionAmount ?? 0) - Number(payment.payable.retentionReleasedAmount ?? 0), 0);
    const newDue = Math.max(netPayable - retentionRemaining - newPaid, 0);
    await tx.supplierPayable.update({
      where: { id: payment.payableId },
      data: {
        paidAmount: newPaid,
        dueAmount: newDue,
        status: newDue <= 0 && retentionRemaining <= 0 ? 'PAID' : newPaid > 0 ? 'PARTIALLY_PAID' : 'UNPAID',
      },
    });
    await reverseCashBankTransaction(tx, {
      sourceType: payment.payable.supplier.supplierType === 'LABOUR_CONTRACTOR' ? 'SUBCONTRACTOR_PAYMENT' : 'SUPPLIER_PAYMENT',
      sourceId: payment.id,
      userId,
      reason: parsed.data.reason,
    });
    return reversed;
  });

  await safeAuditLog({
    userId,
    projectId: payment.payable.projectId,
    action: 'UPDATE',
    entityType: payment.payable.supplier.supplierType === 'LABOUR_CONTRACTOR' ? 'subcontractor_payment_reversal' : 'supplier_payment_reversal',
    entityId: payment.id,
    oldValues: { status: payment.status, amount: payment.amount },
    newValues: { status: updated.status, reason: parsed.data.reason },
    context: 'supplier payment reverse',
  });

  return NextResponse.json(updated);
}

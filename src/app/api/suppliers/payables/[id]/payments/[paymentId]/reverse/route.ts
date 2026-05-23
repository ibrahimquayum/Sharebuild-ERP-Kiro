import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { safeAuditLog } from '@/lib/audit';
import { can } from '@/lib/permissions';
import { reverseCashBankTransaction } from '@/lib/cash-bank';

const reverseSchema = z.object({
  reason: z.string().trim().min(3, 'A reversal reason is required.'),
});

export async function POST(req: NextRequest, { params }: { params: { id: string; paymentId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const companyId = (session.user as any).companyId;
  const userId = (session.user as any).id;
  const role = (session.user as any).role;
  if (!can(role, 'suppliers', 'reverseAdjust') && !can(role, 'subcontractors', 'reverseAdjust')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const parsed = reverseSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });

  const payment = await prisma.supplierPayment.findFirst({
    where: { id: params.paymentId, payableId: params.id, payable: { supplier: { companyId } } },
    include: { payable: { include: { phase: { select: { auditLockedAt: true } }, supplier: { select: { supplierType: true } } } } },
  });
  if (!payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
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
    const newDue = Math.max(Number(payment.payable.totalAmount) - newPaid, 0);
    await tx.supplierPayable.update({
      where: { id: payment.payableId },
      data: {
        paidAmount: newPaid,
        dueAmount: newDue,
        status: newDue <= 0 ? 'PAID' : newPaid > 0 ? 'PARTIALLY_PAID' : 'UNPAID',
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

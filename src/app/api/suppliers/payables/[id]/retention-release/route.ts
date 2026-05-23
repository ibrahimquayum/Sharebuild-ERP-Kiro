import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { can } from '@/lib/permissions';
import { safeAuditLog } from '@/lib/audit';
import { assertAccountBelongsToCompany, createCashBankTransactionFromSupplierPayment } from '@/lib/cash-bank';

const schema = z.object({
  amount: z.number().positive(),
  accountId: z.string().min(1),
  paymentMethod: z.enum(['CASH', 'CHEQUE', 'BANK_TRANSFER', 'MOBILE_BANKING', 'OTHER']).default('BANK_TRANSFER'),
  paidAt: z.string(),
  reference: z.string().optional(),
  notes: z.string().optional(),
  chequeNo: z.string().optional(),
  chequeDate: z.string().optional(),
  bankName: z.string().optional(),
  chequeBranchName: z.string().optional(),
  chequeMaturityDate: z.string().optional(),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const companyId = (session.user as any).companyId;
  const userId = (session.user as any).id;
  const role = (session.user as any).role;
  if (!can(role, 'suppliers', 'create') && !can(role, 'subcontractors', 'create')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const data = parsed.data;
  await assertAccountBelongsToCompany(data.accountId, companyId);

  const payable = await prisma.supplierPayable.findFirst({
    where: { id: params.id, supplier: { companyId }, reversedAt: null },
    include: { supplier: { select: { supplierType: true } }, phase: { select: { auditLockedAt: true } } },
  });
  if (!payable) return NextResponse.json({ error: 'Bill not found' }, { status: 404 });
  if (payable.phase?.auditLockedAt) return NextResponse.json({ error: 'This phase is audit locked. Unlock with an audit reason before changing accounting records.' }, { status: 423 });

  const outstandingRetention = Math.max(Number(payable.retentionAmount ?? 0) - Number(payable.retentionReleasedAmount ?? 0), 0);
  if (outstandingRetention <= 0) return NextResponse.json({ error: 'No retention remains to release.' }, { status: 400 });
  if (data.amount > outstandingRetention) return NextResponse.json({ error: 'Release amount cannot exceed outstanding retention.' }, { status: 400 });

  const payment = await prisma.$transaction(async (tx) => {
    const created = await tx.supplierPayment.create({
      data: {
        payableId: payable.id,
        accountId: data.accountId,
        amount: data.amount,
        paymentMethod: data.paymentMethod,
        reference: data.reference,
        notes: data.notes ? `Retention release: ${data.notes}` : 'Retention release',
        paidAt: new Date(data.paidAt),
        chequeNo: data.chequeNo,
        chequeDate: data.chequeDate ? new Date(data.chequeDate) : undefined,
        bankName: data.bankName,
        chequeBranchName: data.chequeBranchName,
        chequeMaturityDate: data.chequeMaturityDate ? new Date(data.chequeMaturityDate) : undefined,
        status: data.paymentMethod === 'CHEQUE' ? 'ISSUED' : 'CLEARED',
        chequeStatus: data.paymentMethod === 'CHEQUE' ? 'ISSUED' : undefined,
      },
    });

    const releasedTotal = Number(payable.retentionReleasedAmount ?? 0) + data.amount;
    const remainingRetention = Math.max(Number(payable.retentionAmount ?? 0) - releasedTotal, 0);
    await tx.supplierPayable.update({
      where: { id: payable.id },
      data: {
        paidAmount: { increment: data.amount },
        retentionReleasedAmount: releasedTotal,
        retentionStatus:
          remainingRetention <= 0 ? 'RELEASED' : releasedTotal > 0 ? 'PARTIALLY_RELEASED' : 'HELD',
        status:
          Number(payable.dueAmount) <= 0 && remainingRetention <= 0 ? 'PAID' : Number(payable.paidAmount) + data.amount > 0 ? 'PARTIALLY_PAID' : payable.status,
      },
    });

    await createCashBankTransactionFromSupplierPayment(
      tx,
      created.id,
      payable.supplier.supplierType === 'LABOUR_CONTRACTOR' ? 'SUBCONTRACTOR_PAYMENT' : 'SUPPLIER_PAYMENT',
      userId,
    );

    return created;
  });

  await safeAuditLog({
    userId,
    projectId: payable.projectId,
    action: 'CREATE',
    entityType: 'retention_release',
    entityId: payment.id,
    newValues: { payableId: payable.id, amount: data.amount },
    context: 'retention release',
  });

  return NextResponse.json(payment, { status: 201 });
}

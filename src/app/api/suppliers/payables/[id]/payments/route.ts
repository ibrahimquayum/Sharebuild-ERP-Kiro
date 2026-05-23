import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { safeAuditLog } from '@/lib/audit';
import { assertAccountBelongsToCompany, createCashBankTransactionFromSupplierPayment } from '@/lib/cash-bank';

const createSchema = z.object({
  accountId: z.string().min(1),
  amount: z.number().positive(),
  paymentMethod: z.enum(['CASH', 'CHEQUE', 'BANK_TRANSFER', 'MOBILE_BANKING', 'OTHER']).default('BANK_TRANSFER'),
  chequeNo: z.string().optional(),
  chequeDate: z.string().optional(),
  bankName: z.string().optional(),
  chequeBranchName: z.string().optional(),
  chequeMaturityDate: z.string().optional(),
  reference: z.string().optional(),
  paidAt: z.string().optional(),
  notes: z.string().optional(),
  chequeStatus: z.enum(['ISSUED', 'CLEARED', 'BOUNCED', 'CANCELLED']).optional(),
});

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const companyId = (session.user as any).companyId;
  const payable = await prisma.supplierPayable.findFirst({
    where: { id: params.id, supplier: { companyId } },
    include: {
      supplier: { select: { id: true, name: true, supplierType: true } },
      payments: { orderBy: { paidAt: 'desc' } },
    },
  });

  if (!payable) return NextResponse.json({ error: 'Payable not found' }, { status: 404 });
  return NextResponse.json(payable);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const companyId = (session.user as any).companyId;
  const userId = (session.user as any).id;

  const payable = await prisma.supplierPayable.findFirst({
    where: { id: params.id, supplier: { companyId } },
    include: {
      phase: { select: { auditLockedAt: true } },
      supplier: { select: { supplierType: true } },
    },
  });

  if (!payable) return NextResponse.json({ error: 'Payable not found' }, { status: 404 });
  if (payable.reversedAt) return NextResponse.json({ error: 'Cannot pay a reversed bill.' }, { status: 400 });
  if (payable.phase?.auditLockedAt) {
    return NextResponse.json(
      { error: 'This phase is audit locked. Unlock with an audit reason before changing accounting records.' },
      { status: 423 },
    );
  }

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const data = parsed.data;
  await assertAccountBelongsToCompany(data.accountId, companyId);

  const maxAllowed = Number(payable.dueAmount);
  if (data.amount > maxAllowed) {
    return NextResponse.json(
      { error: `Payment amount (BDT ${data.amount}) exceeds outstanding due (BDT ${maxAllowed}).` },
      { status: 400 },
    );
  }

  const payment = await prisma.$transaction(async (tx) => {
    const created = await tx.supplierPayment.create({
      data: {
        payableId: params.id,
        accountId: data.accountId,
        amount: data.amount,
        paymentMethod: data.paymentMethod,
        chequeNo: data.chequeNo,
        chequeDate: data.chequeDate ? new Date(data.chequeDate) : undefined,
        bankName: data.bankName,
        chequeBranchName: data.chequeBranchName,
        chequeMaturityDate: data.chequeMaturityDate ? new Date(data.chequeMaturityDate) : undefined,
        reference: data.reference,
        paidAt: data.paidAt ? new Date(data.paidAt) : new Date(),
        notes: data.notes,
        status: data.paymentMethod === 'CHEQUE' ? data.chequeStatus ?? 'ISSUED' : 'CLEARED',
        chequeStatus: data.paymentMethod === 'CHEQUE' ? data.chequeStatus ?? 'ISSUED' : undefined,
      },
    });

    await tx.supplierPayable.update({
      where: { id: params.id },
      data: {
        paidAmount: { increment: data.amount },
        dueAmount: { decrement: data.amount },
        status: (() => {
          const newPaid = Number(payable.paidAmount) + data.amount;
          const total = Number(payable.netPayableAmount ?? payable.totalAmount);
          const retentionRemaining = Math.max(Number(payable.retentionAmount ?? 0) - Number(payable.retentionReleasedAmount ?? 0), 0);
          if (newPaid >= total && retentionRemaining <= 0) return 'PAID';
          if (newPaid > 0) return 'PARTIALLY_PAID';
          return 'UNPAID';
        })(),
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
    entityType: 'supplier_payment',
    entityId: payment.id,
    newValues: payment,
    context: 'supplier payment create',
  });

  return NextResponse.json(payment, { status: 201 });
}

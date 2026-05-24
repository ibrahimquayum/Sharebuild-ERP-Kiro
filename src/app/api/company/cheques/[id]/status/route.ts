import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { safeAuditLog } from '@/lib/audit';
import { refreshDemandStatus } from '@/lib/accounting';
import { assertApiCompanyWidePermission } from '@/lib/access-control';

const statusSchema = z.object({
  status: z.enum(['CLEARED', 'BOUNCED', 'CANCELLED']),
  reason: z.string().trim().min(2).optional(),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const access = await assertApiCompanyWidePermission('cheques', 'reverseAdjust');
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  const companyId = access.context.companyId;
  const userId = access.context.userId;

  const parsed = statusSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const cheque = await prisma.chequeLog.findFirst({
    where: { id: params.id, companyId },
  });
  if (!cheque) return NextResponse.json({ error: 'Cheque not found' }, { status: 404 });
  if (cheque.status !== 'PENDING') {
    return NextResponse.json({ error: 'Only pending cheques can be updated from the register.' }, { status: 400 });
  }
  if (parsed.data.status !== 'CLEARED' && !parsed.data.reason?.trim()) {
    return NextResponse.json({ error: 'A reason is required for bounced or cancelled cheques.' }, { status: 400 });
  }

  const updated = await prisma.$transaction(async (tx) => {
    const updateData: Record<string, unknown> = {
      status: parsed.data.status,
      notes: parsed.data.reason ?? cheque.notes ?? undefined,
    };
    if (parsed.data.status === 'CLEARED') updateData.clearedDate = new Date();
    if (parsed.data.status === 'BOUNCED') updateData.bouncedDate = new Date();
    if (parsed.data.status === 'CANCELLED') updateData.cancelledDate = new Date();

    const updatedCheque = await tx.chequeLog.update({
      where: { id: cheque.id },
      data: updateData,
    });

    const linkedTransactions = await tx.cashBankTransaction.findMany({
      where: { sourceType: cheque.sourceType, sourceId: cheque.sourceId },
    });

    if (parsed.data.status === 'CLEARED') {
      if (linkedTransactions.length > 0) {
        await tx.cashBankTransaction.updateMany({
          where: { id: { in: linkedTransactions.map((transaction) => transaction.id) }, status: 'DRAFT' },
          data: { status: 'POSTED' },
        });
      }
      return updatedCheque;
    }

    if (linkedTransactions.length > 0) {
      await tx.cashBankTransaction.updateMany({
        where: { id: { in: linkedTransactions.map((transaction) => transaction.id) }, status: { in: ['DRAFT', 'POSTED'] } },
        data: {
          status: 'CANCELLED',
          reversalReason: parsed.data.reason,
          reversedAt: new Date(),
          reversedById: userId,
        },
      });
    }

    if (cheque.sourceType === 'BUYER_COLLECTION' && cheque.sourceId) {
      const collection = await tx.collection.findUnique({
        where: { id: cheque.sourceId },
        include: { allocations: { select: { demandId: true } }, demand: { select: { id: true } } },
      });
      if (collection && collection.status !== 'REVERSED') {
        await tx.collection.update({
          where: { id: collection.id },
          data: {
            status: 'REVERSED',
            reversedAt: new Date(),
            reversedById: userId,
            reversalReason: parsed.data.reason,
          },
        });
        const demandIds = new Set(collection.allocations.map((allocation) => allocation.demandId));
        if (collection.demandId) demandIds.add(collection.demandId);
        for (const demandId of Array.from(demandIds)) {
          await refreshDemandStatus(tx, demandId);
        }
      }
    }

    if ((cheque.sourceType === 'SUPPLIER_PAYMENT' || cheque.sourceType === 'SUBCONTRACTOR_PAYMENT') && cheque.sourceId) {
      const payment = await tx.supplierPayment.findUnique({
        where: { id: cheque.sourceId },
        include: { payable: true },
      });
      if (payment && !payment.reversedAt && payment.status !== 'REVERSED') {
        const newPaid = Math.max(Number(payment.payable.paidAmount) - Number(payment.amount), 0);
        const netPayable = Number(payment.payable.netPayableAmount ?? payment.payable.totalAmount);
        const newDue = Math.max(netPayable - newPaid, 0);
        await tx.supplierPayment.update({
          where: { id: payment.id },
          data: {
            status: 'REVERSED',
            reversedAt: new Date(),
            reversedById: userId,
            reversalReason: parsed.data.reason,
            chequeStatus: parsed.data.status,
          },
        });
        await tx.supplierPayable.update({
          where: { id: payment.payableId },
          data: {
            paidAmount: newPaid,
            dueAmount: newDue,
            status: newDue <= 0 ? 'PAID' : newPaid > 0 ? 'PARTIALLY_PAID' : 'UNPAID',
          },
        });
      }
    }

    return updatedCheque;
  });

  await safeAuditLog({
    userId,
    projectId: cheque.projectId,
    action: 'UPDATE',
    entityType: 'cheque_status',
    entityId: cheque.id,
    oldValues: { status: cheque.status },
    newValues: { status: updated.status, reason: parsed.data.reason },
    context: 'cheque status update',
  });

  return NextResponse.json(updated);
}

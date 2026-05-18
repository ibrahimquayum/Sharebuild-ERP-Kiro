import type { Prisma, PrismaClient } from '@prisma/client';

export const FINAL_EXPENSE_STATUSES = ['APPROVED', 'PAID', 'PARTIALLY_PAID'] as const;
export const ACTIVE_COLLECTION_STATUS = 'APPROVED';

type TxClient = PrismaClient | Prisma.TransactionClient;

export async function getDemandPaidAmount(db: TxClient, demandId: string) {
  const [allocated, legacy] = await Promise.all([
    db.collectionAllocation.aggregate({
      where: { demandId, collection: { status: { not: 'REVERSED' } } },
      _sum: { amount: true },
    }),
    db.collection.aggregate({
      where: { demandId, status: { not: 'REVERSED' } },
      _sum: { amount: true },
    }),
  ]);

  const allocatedAmount = Number(allocated._sum.amount ?? 0);
  if (allocatedAmount > 0) return allocatedAmount;
  return Number(legacy._sum.amount ?? 0);
}

export async function refreshDemandStatus(db: TxClient, demandId: string) {
  const demand = await db.demand.findUnique({ where: { id: demandId }, select: { id: true, amount: true, status: true, dueDate: true } });
  if (!demand || demand.status === 'CANCELLED') return;

  const paid = await getDemandPaidAmount(db, demand.id);
  const amount = Number(demand.amount);
  const isOverdue = demand.dueDate ? demand.dueDate.getTime() < Date.now() : false;
  const status = paid >= amount
    ? 'FULLY_PAID'
    : paid > 0
      ? 'PARTIALLY_PAID'
      : isOverdue
        ? 'OVERDUE'
        : 'ISSUED';

  await db.demand.update({ where: { id: demand.id }, data: { status } });
}

export function isPhaseLocked(phase: { auditLockedAt?: Date | null }) {
  return Boolean(phase.auditLockedAt);
}

export function lockedPhaseMessage() {
  return 'This phase is audit locked. Unlock with an audit reason before changing accounting records.';
}

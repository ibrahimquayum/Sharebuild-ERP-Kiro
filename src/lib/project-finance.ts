import { prisma } from '@/lib/prisma';

export async function getProjectFinanceSummary(projectId: string) {
  const [
    demandAgg,
    collectionAgg,
    expenseAgg,
    supplierPayableAgg,
    subcontractorPayableAgg,
    pendingApprovalCount,
    missingVoucherCount,
  ] = await Promise.all([
    prisma.demand.aggregate({
      where: { unit: { projectId }, status: { not: 'CANCELLED' } },
      _sum: { amount: true },
    }),
    prisma.collection.aggregate({
      where: { phase: { projectId } },
      _sum: { amount: true },
    }),
    prisma.expense.aggregate({
      where: { phase: { projectId } },
      _sum: { amount: true },
    }),
    prisma.supplierPayable.aggregate({
      where: {
        projectId,
        supplier: { supplierType: { not: 'LABOUR_CONTRACTOR' } },
      },
      _sum: { dueAmount: true, totalAmount: true, paidAmount: true },
    }),
    prisma.supplierPayable.aggregate({
      where: {
        projectId,
        supplier: { supplierType: 'LABOUR_CONTRACTOR' },
      },
      _sum: { dueAmount: true, totalAmount: true, paidAmount: true },
    }),
    prisma.expense.count({
      where: { phase: { projectId }, status: 'PENDING_APPROVAL' },
    }),
    prisma.expense.count({
      where: {
        phase: { projectId },
        documents: { none: {} },
        status: { in: ['APPROVED', 'PENDING_APPROVAL'] },
      },
    }),
  ]);

  const totalDemanded = Number(demandAgg._sum.amount ?? 0);
  const totalCollected = Number(collectionAgg._sum.amount ?? 0);
  const totalExpense = Number(expenseAgg._sum.amount ?? 0);
  const supplierPayable = Number(supplierPayableAgg._sum.dueAmount ?? 0);
  const subcontractorPayable = Number(subcontractorPayableAgg._sum.dueAmount ?? 0);

  return {
    totalDemanded,
    totalCollected,
    buyerDue: totalDemanded - totalCollected,
    totalExpense,
    supplierPayable,
    subcontractorPayable,
    projectBalance: totalCollected - totalExpense,
    surplusDeficit: totalCollected - totalExpense - supplierPayable - subcontractorPayable,
    missingVoucherCount,
    pendingApprovalCount,
    supplierBilled: Number(supplierPayableAgg._sum.totalAmount ?? 0),
    supplierPaid: Number(supplierPayableAgg._sum.paidAmount ?? 0),
    subcontractorBilled: Number(subcontractorPayableAgg._sum.totalAmount ?? 0),
    subcontractorPaid: Number(subcontractorPayableAgg._sum.paidAmount ?? 0),
  };
}

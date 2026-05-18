import { prisma } from '@/lib/prisma';
import { FINAL_EXPENSE_STATUSES } from '@/lib/accounting';

export async function getProjectFinanceSummary(projectId: string) {
  const [
    demandAgg,
    collectionAgg,
    approvedExpenseAgg,
    pendingExpenseAgg,
    supplierPayableAgg,
    subcontractorPayableAgg,
    allocationAgg,
    pendingApprovalCount,
    missingVoucherCount,
  ] = await Promise.all([
    prisma.demand.aggregate({
      where: { unit: { projectId }, status: { not: 'CANCELLED' } },
      _sum: { amount: true },
    }),
    prisma.collection.aggregate({
      where: { phase: { projectId }, status: { not: 'REVERSED' } },
      _sum: { amount: true },
    }),
    prisma.expense.aggregate({
      where: { phase: { projectId }, status: { in: [...FINAL_EXPENSE_STATUSES] }, reversedAt: null },
      _sum: { amount: true },
    }),
    prisma.expense.aggregate({
      where: { phase: { projectId }, status: 'PENDING_APPROVAL', reversedAt: null },
      _sum: { amount: true },
    }),
    prisma.supplierPayable.aggregate({
      where: {
        projectId,
        supplier: { supplierType: { not: 'LABOUR_CONTRACTOR' } },
        reversedAt: null,
      },
      _sum: { dueAmount: true, totalAmount: true, paidAmount: true },
    }),
    prisma.supplierPayable.aggregate({
      where: {
        projectId,
        supplier: { supplierType: 'LABOUR_CONTRACTOR' },
        reversedAt: null,
      },
      _sum: { dueAmount: true, totalAmount: true, paidAmount: true },
    }),
    prisma.collectionAllocation.aggregate({
      where: { demand: { unit: { projectId } }, collection: { status: { not: 'REVERSED' } } },
      _sum: { amount: true },
    }),
    prisma.expense.count({
      where: { phase: { projectId }, status: 'PENDING_APPROVAL', reversedAt: null },
    }),
    prisma.expense.count({
      where: {
        phase: { projectId },
        documents: { none: {} },
        status: { in: ['APPROVED', 'PENDING_APPROVAL'] },
        reversedAt: null,
      },
    }),
  ]);

  const totalDemanded = Number(demandAgg._sum.amount ?? 0);
  const totalCollected = Number(collectionAgg._sum.amount ?? 0);
  const totalExpense = Number(approvedExpenseAgg._sum.amount ?? 0);
  const pendingExpense = Number(pendingExpenseAgg._sum.amount ?? 0);
  const supplierPayable = Number(supplierPayableAgg._sum.dueAmount ?? 0);
  const subcontractorPayable = Number(subcontractorPayableAgg._sum.dueAmount ?? 0);
  const allocatedToDemand = Number(allocationAgg._sum.amount ?? 0);
  const buyerReceivable = Math.max(totalDemanded - allocatedToDemand, 0);
  const buyerAdvance = Math.max(totalCollected - allocatedToDemand, 0);
  const phaseBalances = await getProjectPhaseBalances(projectId);

  return {
    totalDemanded,
    totalCollected,
    buyerDue: buyerReceivable,
    buyerReceivable,
    buyerAdvance,
    totalExpense,
    pendingExpense,
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
    phaseBalances,
  };
}

export async function getProjectPhaseBalances(projectId: string) {
  const phases = await prisma.phase.findMany({
    where: { projectId, status: { notIn: ['CANCELLED', 'DUPLICATE'] } },
    select: { id: true, name: true, sequence: true, auditLockedAt: true },
    orderBy: [{ sequence: 'asc' }, { createdAt: 'asc' }],
  });

  let carryIn = 0;
  const rows = [];
  for (const phase of phases) {
    const [demandAgg, collectionAgg, expenseAgg, supplierAgg, subcontractorAgg] = await Promise.all([
      prisma.demand.aggregate({ where: { phaseId: phase.id, status: { not: 'CANCELLED' } }, _sum: { amount: true } }),
      prisma.collection.aggregate({ where: { phaseId: phase.id, status: { not: 'REVERSED' } }, _sum: { amount: true } }),
      prisma.expense.aggregate({ where: { phaseId: phase.id, status: { in: [...FINAL_EXPENSE_STATUSES] }, reversedAt: null }, _sum: { amount: true } }),
      prisma.supplierPayable.aggregate({ where: { phaseId: phase.id, supplier: { supplierType: { not: 'LABOUR_CONTRACTOR' } }, reversedAt: null }, _sum: { totalAmount: true, dueAmount: true } }),
      prisma.supplierPayable.aggregate({ where: { phaseId: phase.id, supplier: { supplierType: 'LABOUR_CONTRACTOR' }, reversedAt: null }, _sum: { totalAmount: true, dueAmount: true } }),
    ]);
    const demand = Number(demandAgg._sum.amount ?? 0);
    const collection = Number(collectionAgg._sum.amount ?? 0);
    const expense = Number(expenseAgg._sum.amount ?? 0);
    const supplierBill = Number(supplierAgg._sum.totalAmount ?? 0);
    const subcontractorBill = Number(subcontractorAgg._sum.totalAmount ?? 0);
    const balance = collection + carryIn - expense - supplierBill - subcontractorBill;
    rows.push({
      phaseId: phase.id,
      phaseName: phase.name,
      sequence: phase.sequence,
      auditLocked: Boolean(phase.auditLockedAt),
      demand,
      collection,
      expense,
      supplierBill,
      subcontractorBill,
      carryIn,
      balance,
      carryOut: balance,
    });
    carryIn = balance;
  }
  return rows;
}

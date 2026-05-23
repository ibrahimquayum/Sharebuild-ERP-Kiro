import { prisma } from '@/lib/prisma';
import { FINAL_EXPENSE_STATUSES } from '@/lib/accounting';
import { getProjectCashBankSummary } from '@/lib/cash-bank';

export async function getProjectFinanceSummary(projectId: string) {
  const [
    project,
    demandAgg,
    collectionAgg,
    approvedExpenseAgg,
    pendingExpenseAgg,
    assignedSupplierCount,
    assignedSubcontractorCount,
    supplierPayableAgg,
    subcontractorPayableAgg,
    taxDeductionAgg,
    retentionAgg,
    allocationAgg,
    pendingApprovalCount,
    missingVoucherCount,
  ] = await Promise.all([
    prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, defaultServiceChargePct: true },
    }),
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
    prisma.projectSupplier.count({
      where: { projectId, status: { not: 'CANCELLED' } },
    }),
    prisma.projectSubcontractor.count({
      where: { projectId, status: { not: 'CANCELLED' } },
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
    prisma.supplierPayable.aggregate({
      where: { projectId, reversedAt: null },
      _sum: { vatAmount: true, aitTdsAmount: true, otherDeductionAmount: true },
    }),
    prisma.supplierPayable.aggregate({
      where: { projectId, reversedAt: null },
      _sum: { retentionAmount: true, retentionReleasedAmount: true },
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
  const directExpenseTotal = Number(approvedExpenseAgg._sum.amount ?? 0);
  const pendingExpense = Number(pendingExpenseAgg._sum.amount ?? 0);
  const supplierPayable = Number(supplierPayableAgg._sum.dueAmount ?? 0);
  const subcontractorPayable = Number(subcontractorPayableAgg._sum.dueAmount ?? 0);
  const supplierBillCost = Number(supplierPayableAgg._sum.totalAmount ?? 0);
  const subcontractorBillCost = Number(subcontractorPayableAgg._sum.totalAmount ?? 0);
  const projectCostTotal = directExpenseTotal + supplierBillCost + subcontractorBillCost;
  const taxDeductionTotal = Number(taxDeductionAgg._sum.vatAmount ?? 0) + Number(taxDeductionAgg._sum.aitTdsAmount ?? 0) + Number(taxDeductionAgg._sum.otherDeductionAmount ?? 0);
  const retentionHeld = Math.max(Number(retentionAgg._sum.retentionAmount ?? 0) - Number(retentionAgg._sum.retentionReleasedAmount ?? 0), 0);
  const supplierPaid = Number(supplierPayableAgg._sum.paidAmount ?? 0);
  const subcontractorPaid = Number(subcontractorPayableAgg._sum.paidAmount ?? 0);
  const allocatedToDemand = Number(allocationAgg._sum.amount ?? 0);
  const buyerReceivable = Math.max(totalDemanded - allocatedToDemand, 0);
  const buyerAdvance = Math.max(totalCollected - allocatedToDemand, 0);
  const phaseBalances = await getProjectPhaseBalances(projectId);
  const cashBankSummary = await getProjectCashBankSummary(projectId);
  const cashIn = cashBankSummary?.totals.inflow ?? 0;
  const cashOut = cashBankSummary?.totals.outflow ?? 0;
  const netCashMovement = cashBankSummary?.totals.netMovement ?? 0;
  const accountBalance = cashBankSummary?.totals.accountBalance ?? 0;
  const pendingReceivedCheques = cashBankSummary?.totals.pendingReceivedCheques ?? 0;
  const pendingIssuedCheques = cashBankSummary?.totals.pendingIssuedCheques ?? 0;
  const bouncedCheques = cashBankSummary?.totals.bouncedCheques ?? 0;
  const accountsUsed = cashBankSummary?.accountsUsed ?? [];
  const serviceChargeAccrued = phaseBalances.reduce((sum, row) => sum + row.serviceCharge, 0);

  return {
    totalDemanded,
    totalCollected,
    buyerDue: buyerReceivable,
    buyerReceivable,
    buyerAdvance,
    totalExpense: projectCostTotal,
    directExpenseTotal,
    pendingExpense,
    taxDeductionTotal,
    retentionHeld,
    serviceChargeAccrued,
    supplierPayable,
    subcontractorPayable,
    projectBalance: totalCollected - projectCostTotal,
    surplusDeficit: totalCollected - projectCostTotal,
    cashPosition: netCashMovement,
    cashIn,
    cashOut,
    netCashMovement,
    accountBalance,
    pendingReceivedCheques,
    pendingIssuedCheques,
    bouncedCheques,
    accountsUsed,
    missingVoucherCount,
    pendingApprovalCount,
    assignedSupplierCount,
    assignedSubcontractorCount,
    supplierBilled: supplierBillCost,
    supplierBillCost,
    supplierPaid,
    subcontractorBilled: subcontractorBillCost,
    subcontractorBillCost,
    subcontractorPaid,
    projectCostTotal,
    phaseBalances,
  };
}

export async function getProjectPhaseBalances(projectId: string) {
  const [project, phases] = await Promise.all([
    prisma.project.findUnique({
      where: { id: projectId },
      select: { defaultServiceChargePct: true },
    }),
    prisma.phase.findMany({
      where: { projectId, status: { notIn: ['CANCELLED', 'DUPLICATE'] } },
      select: { id: true, name: true, sequence: true, auditLockedAt: true, serviceChargePct: true },
      orderBy: [{ sequence: 'asc' }, { createdAt: 'asc' }],
    }),
  ]);

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
    const serviceChargePct = Number(phase.serviceChargePct ?? project?.defaultServiceChargePct ?? 0);
    const serviceCharge = Number((((expense + supplierBill + subcontractorBill) * serviceChargePct) / 100).toFixed(2));
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
      serviceChargePct,
      serviceCharge,
      carryIn,
      balance,
      carryOut: balance,
    });
    carryIn = balance;
  }
  return rows;
}

export async function getFinalReconciliationPreview(projectId: string) {
  const [summary, project, allocations] = await Promise.all([
    getProjectFinanceSummary(projectId),
    prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, name: true, code: true, defaultServiceChargePct: true },
    }),
    prisma.unitBuyer.findMany({
      where: { unit: { projectId } },
      include: {
        buyer: { select: { id: true, name: true, phone: true } },
        unit: { select: { id: true, unitNo: true } },
      },
      orderBy: [{ buyerId: 'asc' }],
    }),
  ]);

  if (!project) return null;

  const finalSurplusDeficit = summary.projectBalance - summary.serviceChargeAccrued;
  const totals = allocations.reduce<Record<string, {
    buyerId: string;
    buyerName: string;
    units: string[];
    weight: number;
  }>>((map, allocation) => {
    const existing = map[allocation.buyerId] ?? {
      buyerId: allocation.buyerId,
      buyerName: allocation.buyer.name,
      units: [],
      weight: 0,
    };
    existing.units.push(`${allocation.unit.unitNo} (${Number(allocation.sharePercent)}%)`);
    existing.weight += Number(allocation.sharePercent) / 100;
    map[allocation.buyerId] = existing;
    return map;
  }, {});

  const totalWeight = Object.values(totals).reduce((sum, row) => sum + row.weight, 0) || 1;
  const absValue = Math.abs(finalSurplusDeficit);
  const direction = finalSurplusDeficit < 0 ? 'DEFICIT' : finalSurplusDeficit > 0 ? 'SURPLUS' : 'BALANCED';

  const distribution = Object.values(totals).map((row) => ({
    buyerId: row.buyerId,
    buyerName: row.buyerName,
    units: row.units.join(', '),
    weight: row.weight,
    sharePercent: Number(((row.weight / totalWeight) * 100).toFixed(2)),
    amount: Number(((absValue * row.weight) / totalWeight).toFixed(2)),
  })).sort((a, b) => b.weight - a.weight || a.buyerName.localeCompare(b.buyerName));

  return {
    project,
    summary,
    direction,
    finalSurplusDeficit,
    recommendation:
      direction === 'DEFICIT'
        ? 'Collect a final reconciliation demand after review.'
        : direction === 'SURPLUS'
          ? 'Review refund or buyer adjustment options before posting.'
          : 'No reconciliation demand is needed.',
    distribution,
  };
}

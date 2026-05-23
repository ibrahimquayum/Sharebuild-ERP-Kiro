import { FINAL_EXPENSE_STATUSES } from '@/lib/accounting';
import { getProjectCashBankSummary } from '@/lib/cash-bank';
import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

function numberValue(value: Prisma.Decimal | number | string | null | undefined) {
  return Number(value ?? 0);
}

function roundMoney(value: number) {
  return Number(value.toFixed(2));
}

function sumAmounts(values: Array<Prisma.Decimal | number | string | null | undefined>) {
  return values.reduce((sum: number, value) => sum + numberValue(value), 0);
}

function distributeWeightedAmount(
  totalAmount: number,
  rows: Array<{ key: string; weight: number }>,
) {
  if (!rows.length || totalAmount <= 0) return rows.map((row) => ({ ...row, amount: 0 }));

  const totalWeight = rows.reduce((sum, row) => sum + row.weight, 0) || 1;
  const raw = rows.map((row) => {
    const exact = (totalAmount * row.weight) / totalWeight;
    const base = Math.floor(exact * 100) / 100;
    return { ...row, exact, base, remainder: exact - base };
  });

  let remainingCents = Math.round((totalAmount - raw.reduce((sum, row) => sum + row.base, 0)) * 100);
  const ranked = [...raw].sort((a, b) => b.remainder - a.remainder || b.weight - a.weight || a.key.localeCompare(b.key));
  const bonus = new Map<string, number>();

  for (const row of ranked) {
    if (remainingCents <= 0) break;
    bonus.set(row.key, (bonus.get(row.key) ?? 0) + 0.01);
    remainingCents -= 1;
  }

  return raw.map((row) => ({
    ...row,
    amount: roundMoney(row.base + (bonus.get(row.key) ?? 0)),
  }));
}

export async function getProjectBuyerLedger(projectId: string) {
  const [memberships, surplusCredits] = await Promise.all([
    prisma.projectBuyer.findMany({
      where: { projectId },
      include: {
        buyer: {
          include: {
            unitAllocations: {
              where: { unit: { projectId } },
              include: { unit: { select: { id: true, unitNo: true } } },
            },
            demands: {
              where: { unit: { projectId }, status: { not: 'CANCELLED' } },
              include: {
                allocations: {
                  where: { collection: { status: { not: 'REVERSED' } } },
                  select: { amount: true },
                },
                collections: {
                  where: { status: { not: 'REVERSED' } },
                  select: { amount: true },
                },
                phase: { select: { name: true } },
                unit: { select: { id: true, unitNo: true } },
              },
              orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }],
            },
            collections: {
              where: { phase: { projectId }, status: { not: 'REVERSED' } },
              select: { amount: true, receivedDate: true },
            },
          },
        },
      },
      orderBy: { joinedAt: 'asc' },
    }),
    prisma.finalReconciliationLine.findMany({
      where: {
        reconciliation: {
          projectId,
          type: 'SURPLUS_CREDIT',
          status: 'POSTED',
          reversedAt: null,
        },
      },
      select: { buyerId: true, amount: true, settlementStatus: true },
    }),
  ]);

  const creditSummary = surplusCredits.reduce<Record<string, { active: number; refunded: number; adjusted: number }>>((map, row) => {
    const current = map[row.buyerId] ?? { active: 0, refunded: 0, adjusted: 0 };
    const amount = numberValue(row.amount);
    if (row.settlementStatus === 'OPEN_CREDIT' || row.settlementStatus === 'KEPT_AS_ADVANCE') {
      current.active += amount;
    }
    if (row.settlementStatus === 'REFUNDED') current.refunded += amount;
    if (row.settlementStatus === 'ADJUSTED') current.adjusted += amount;
    map[row.buyerId] = current;
    return map;
  }, {});

  return memberships.map(({ id: membershipId, buyer }) => {
    const demanded = buyer.demands.reduce((sum, demand) => sum + numberValue(demand.amount), 0);
    const allocated = buyer.demands.reduce((sum, demand) => {
      const allocationTotal = sumAmounts(demand.allocations.map((allocation) => allocation.amount));
      const legacyTotal = sumAmounts(demand.collections.map((collection) => collection.amount));
      return sum + (allocationTotal > 0 ? allocationTotal : legacyTotal);
    }, 0);
    const collected = sumAmounts(buyer.collections.map((collection) => collection.amount));
    const demandDueBeforeCredit = Math.max(demanded - allocated, 0);
    const cashAdvance = Math.max(collected - allocated, 0);
    const credit = creditSummary[buyer.id] ?? { active: 0, refunded: 0, adjusted: 0 };
    const reconciliationCredit = credit.active;
    const due = Math.max(demandDueBeforeCredit - reconciliationCredit, 0);
    const advance = cashAdvance + Math.max(reconciliationCredit - demandDueBeforeCredit, 0);
    const finalReconciliationDemand = buyer.demands
      .filter((demand) => demand.demandType === 'FINAL_RECONCILIATION')
      .reduce((sum, demand) => sum + numberValue(demand.amount), 0);
    const oldestDue = buyer.demands
      .filter((demand) => demand.dueDate && demand.status !== 'FULLY_PAID')
      .sort((a, b) => Number(a.dueDate) - Number(b.dueDate))[0]?.dueDate ?? null;

    return {
      membershipId,
      buyerId: buyer.id,
      buyerName: buyer.name,
      phone: buyer.phone,
      units: buyer.unitAllocations.map((allocation) => ({
        unitId: allocation.unit.id,
        unitNo: allocation.unit.unitNo,
        sharePercent: numberValue(allocation.sharePercent),
        relationship: allocation.relationship,
        isPayer: allocation.isPayer,
      })),
      unitsText: buyer.unitAllocations.map((allocation) => `${allocation.unit.unitNo} (${numberValue(allocation.sharePercent)}%)`).join(', '),
      demands: buyer.demands,
      demanded,
      allocated,
      paid: collected,
      collected,
      due,
      advance,
      reconciliationCredit,
      refundedReconciliationCredit: credit.refunded,
      adjustedReconciliationCredit: credit.adjusted,
      finalReconciliationDemand,
      oldestDue,
    };
  });
}

export async function getProjectPhaseBalances(projectId: string) {
  const [project, phases, serviceChargeEntries] = await Promise.all([
    prisma.project.findUnique({
      where: { id: projectId },
      select: { defaultServiceChargePct: true },
    }),
    prisma.phase.findMany({
      where: { projectId, status: { notIn: ['CANCELLED', 'DUPLICATE'] } },
      select: { id: true, name: true, sequence: true, auditLockedAt: true, serviceChargePct: true, status: true },
      orderBy: [{ sequence: 'asc' }, { createdAt: 'asc' }],
    }),
    prisma.serviceChargeEntry.findMany({
      where: { projectId, reversedAt: null },
      orderBy: [{ phaseId: 'asc' }, { updatedAt: 'desc' }],
    }),
  ]);

  const entriesByPhase = new Map<string, typeof serviceChargeEntries>();
  for (const entry of serviceChargeEntries) {
    const key = entry.phaseId ?? `project:${entry.id}`;
    const group = entriesByPhase.get(key) ?? [];
    group.push(entry);
    entriesByPhase.set(key, group);
  }

  let carryIn = 0;
  const rows: Array<{
    phaseId: string;
    phaseName: string;
    sequence: number;
    status: string;
    auditLocked: boolean;
    demand: number;
    collection: number;
    expense: number;
    supplierBill: number;
    subcontractorBill: number;
    supplierPayable: number;
    subcontractorPayable: number;
    taxDeduction: number;
    retentionHeld: number;
    phaseCost: number;
    serviceChargePct: number;
    serviceChargePreview: number;
    serviceChargeApproved: number;
    serviceChargeCalculated: number;
    serviceCharge: number;
    serviceChargeStatus: string;
    carryIn: number;
    balance: number;
    carryOut: number;
  }> = [];

  for (const phase of phases) {
    const [demandAgg, collectionAgg, expenseAgg, supplierAgg, subcontractorAgg, taxAgg, retentionAgg] = await Promise.all([
      prisma.demand.aggregate({ where: { phaseId: phase.id, status: { not: 'CANCELLED' } }, _sum: { amount: true } }),
      prisma.collection.aggregate({ where: { phaseId: phase.id, status: { not: 'REVERSED' } }, _sum: { amount: true } }),
      prisma.expense.aggregate({ where: { phaseId: phase.id, status: { in: [...FINAL_EXPENSE_STATUSES] }, reversedAt: null }, _sum: { amount: true } }),
      prisma.supplierPayable.aggregate({
        where: { phaseId: phase.id, supplier: { supplierType: { not: 'LABOUR_CONTRACTOR' } }, reversedAt: null },
        _sum: { totalAmount: true, dueAmount: true, vatAmount: true, aitTdsAmount: true, otherDeductionAmount: true, retentionAmount: true, retentionReleasedAmount: true },
      }),
      prisma.supplierPayable.aggregate({
        where: { phaseId: phase.id, supplier: { supplierType: 'LABOUR_CONTRACTOR' }, reversedAt: null },
        _sum: { totalAmount: true, dueAmount: true, vatAmount: true, aitTdsAmount: true, otherDeductionAmount: true, retentionAmount: true, retentionReleasedAmount: true },
      }),
      prisma.supplierPayable.aggregate({
        where: { phaseId: phase.id, reversedAt: null },
        _sum: { vatAmount: true, aitTdsAmount: true, otherDeductionAmount: true },
      }),
      prisma.supplierPayable.aggregate({
        where: { phaseId: phase.id, reversedAt: null },
        _sum: { retentionAmount: true, retentionReleasedAmount: true },
      }),
    ]);

    const expense = numberValue(expenseAgg._sum.amount);
    const supplierBill = numberValue(supplierAgg._sum.totalAmount);
    const subcontractorBill = numberValue(subcontractorAgg._sum.totalAmount);
    const phaseCost = expense + supplierBill + subcontractorBill;
      const phaseServiceChargePct = numberValue(phase.serviceChargePct);
      const serviceChargePct = phaseServiceChargePct > 0
        ? phaseServiceChargePct
        : numberValue(project?.defaultServiceChargePct ?? 0);
    const serviceChargePreview = roundMoney((phaseCost * serviceChargePct) / 100);
    const phaseEntries = entriesByPhase.get(phase.id) ?? [];
    const approvedEntries = phaseEntries.filter((entry) => entry.status === 'APPROVED');
    const calculatedEntries = phaseEntries.filter((entry) => ['CALCULATED', 'DRAFT'].includes(entry.status));
    const serviceChargeApproved = sumAmounts(approvedEntries.map((entry) => entry.serviceChargeAmount));
    const serviceChargeCalculated = sumAmounts(calculatedEntries.map((entry) => entry.serviceChargeAmount));
    const serviceCharge = serviceChargeApproved || serviceChargeCalculated || serviceChargePreview;
    const balance = numberValue(collectionAgg._sum.amount) + carryIn - phaseCost;

    rows.push({
      phaseId: phase.id,
      phaseName: phase.name,
      sequence: phase.sequence,
      status: phase.status,
      auditLocked: Boolean(phase.auditLockedAt),
      demand: numberValue(demandAgg._sum.amount),
      collection: numberValue(collectionAgg._sum.amount),
      expense,
      supplierBill,
      subcontractorBill,
      supplierPayable: numberValue(supplierAgg._sum.dueAmount),
      subcontractorPayable: numberValue(subcontractorAgg._sum.dueAmount),
      taxDeduction: numberValue(taxAgg._sum.vatAmount) + numberValue(taxAgg._sum.aitTdsAmount) + numberValue(taxAgg._sum.otherDeductionAmount),
      retentionHeld: Math.max(
        numberValue(retentionAgg._sum.retentionAmount) - numberValue(retentionAgg._sum.retentionReleasedAmount),
        0,
      ),
      phaseCost,
      serviceChargePct,
      serviceChargePreview,
      serviceChargeApproved,
      serviceChargeCalculated,
      serviceCharge,
      serviceChargeStatus: approvedEntries.length ? 'APPROVED' : calculatedEntries.length ? calculatedEntries[0].status : 'PREVIEW',
      carryIn,
      balance,
      carryOut: balance,
    });

    carryIn = balance;
  }

  return rows;
}

export async function getProjectServiceChargeLedger(projectId: string) {
  const [project, phaseBalances, entries] = await Promise.all([
    prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, name: true, defaultServiceChargePct: true },
    }),
    getProjectPhaseBalances(projectId),
    prisma.serviceChargeEntry.findMany({
      where: { projectId },
      include: { phase: { select: { id: true, name: true } } },
      orderBy: [{ phaseId: 'asc' }, { updatedAt: 'desc' }],
    }),
  ]);

  if (!project) return null;

  const activeEntries = entries.filter((entry) => !entry.reversedAt && entry.status !== 'REVERSED');
  const rows = phaseBalances
    .filter((row) => row.phaseCost > 0 || row.serviceChargePct > 0)
    .map((row) => {
      const phaseEntry = activeEntries.find((entry) => entry.phaseId === row.phaseId);
      const effectiveAmount = phaseEntry
        ? numberValue(phaseEntry.serviceChargeAmount)
        : row.serviceChargePreview;

        return {
          phaseId: row.phaseId,
          phaseName: row.phaseName,
          basisType: phaseEntry?.basisType ?? 'PHASE_TOTAL_COST',
          basisAmount: phaseEntry ? numberValue(phaseEntry.basisAmount) : row.phaseCost,
          percentage: phaseEntry ? numberValue(phaseEntry.percentage) : row.serviceChargePct,
          manualAmount: phaseEntry ? numberValue(phaseEntry.manualAmount) : 0,
          includedInDemand: phaseEntry?.includedInDemand ?? false,
          status: phaseEntry?.status ?? 'PREVIEW',
          settlementStatus: phaseEntry
            ? phaseEntry.includedInDemand && phaseEntry.settlementStatus === 'UNSETTLED'
              ? 'INCLUDED_IN_DEMAND'
              : phaseEntry.settlementStatus
            : 'UNSETTLED',
          settlementAccountId: phaseEntry?.settlementAccountId ?? '',
          settlementMethod: phaseEntry?.settlementMethod ?? null,
          settlementReference: phaseEntry?.settlementReference ?? '',
          settledAt: phaseEntry?.settledAt ?? null,
          serviceChargeAmount: effectiveAmount,
          previewAmount: row.serviceChargePreview,
          entryId: phaseEntry?.id,
          notes: phaseEntry?.notes ?? '',
        };
    });

  const manualRows = activeEntries
    .filter((entry) => !entry.phaseId)
      .map((entry) => ({
      phaseId: null,
      phaseName: 'Project-level manual entry',
      basisType: entry.basisType,
      basisAmount: numberValue(entry.basisAmount),
        percentage: numberValue(entry.percentage),
        manualAmount: numberValue(entry.manualAmount),
        includedInDemand: entry.includedInDemand,
        status: entry.status,
        settlementStatus: entry.includedInDemand && entry.settlementStatus === 'UNSETTLED' ? 'INCLUDED_IN_DEMAND' : entry.settlementStatus,
        settlementAccountId: entry.settlementAccountId ?? '',
        settlementMethod: entry.settlementMethod ?? null,
        settlementReference: entry.settlementReference ?? '',
        settledAt: entry.settledAt ?? null,
        serviceChargeAmount: numberValue(entry.serviceChargeAmount),
        previewAmount: 0,
        entryId: entry.id,
        notes: entry.notes ?? '',
      }));

  const approvedTotal = rows
    .filter((row) => row.status === 'APPROVED')
    .reduce((sum, row) => sum + row.serviceChargeAmount, 0) +
    manualRows.filter((row) => row.status === 'APPROVED').reduce((sum, row) => sum + row.serviceChargeAmount, 0);
    const calculatedTotal = rows
      .filter((row) => row.status === 'CALCULATED')
      .reduce((sum, row) => sum + row.serviceChargeAmount, 0) +
      manualRows.filter((row) => row.status === 'CALCULATED').reduce((sum, row) => sum + row.serviceChargeAmount, 0);
    const includedInDemandTotal = [...rows, ...manualRows]
      .filter((row) => row.settlementStatus === 'INCLUDED_IN_DEMAND')
      .reduce((sum, row) => sum + row.serviceChargeAmount, 0);
    const settledTotal = [...rows, ...manualRows]
      .filter((row) => row.settlementStatus === 'SETTLED')
      .reduce((sum, row) => sum + row.serviceChargeAmount, 0);
    const previewTotal = rows.reduce((sum, row) => sum + row.previewAmount, 0);
    const effectiveTotal = approvedTotal || calculatedTotal || previewTotal;

  return {
    project,
    rows: [...rows, ...manualRows],
    entries,
      totals: {
        approvedTotal,
        calculatedTotal,
        previewTotal,
        effectiveTotal,
        includedInDemandTotal,
        settledTotal,
        pendingCount: activeEntries.filter((entry) => entry.status !== 'APPROVED').length,
      },
    };
  }

export async function getProjectFinanceSummary(projectId: string) {
  const [
    project,
    collectionAgg,
    approvedExpenseAgg,
    pendingExpenseAgg,
    assignedSupplierCount,
    assignedSubcontractorCount,
    supplierPayableAgg,
    subcontractorPayableAgg,
    taxDeductionAgg,
    retentionAgg,
    pendingApprovalCount,
    missingVoucherCount,
    phaseBalances,
    buyerLedger,
    cashBankSummary,
    serviceChargeLedger,
    postedReconciliation,
  ] = await Promise.all([
    prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, defaultServiceChargePct: true },
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
    getProjectPhaseBalances(projectId),
    getProjectBuyerLedger(projectId),
    getProjectCashBankSummary(projectId),
    getProjectServiceChargeLedger(projectId),
    prisma.finalReconciliation.findFirst({
      where: { projectId, status: 'POSTED', reversedAt: null },
      orderBy: { postedAt: 'desc' },
    }),
  ]);

  const totalDemanded = buyerLedger.reduce((sum, row) => sum + row.demanded, 0);
  const totalCollected = numberValue(collectionAgg._sum.amount);
  const buyerReceivable = buyerLedger.reduce((sum, row) => sum + row.due, 0);
  const buyerAdvance = buyerLedger.reduce((sum, row) => sum + row.advance, 0);
  const directExpenseTotal = numberValue(approvedExpenseAgg._sum.amount);
  const pendingExpense = numberValue(pendingExpenseAgg._sum.amount);
  const supplierPayable = numberValue(supplierPayableAgg._sum.dueAmount);
  const subcontractorPayable = numberValue(subcontractorPayableAgg._sum.dueAmount);
  const supplierBillCost = numberValue(supplierPayableAgg._sum.totalAmount);
  const subcontractorBillCost = numberValue(subcontractorPayableAgg._sum.totalAmount);
  const projectCostTotal = directExpenseTotal + supplierBillCost + subcontractorBillCost;
  const taxDeductionTotal =
    numberValue(taxDeductionAgg._sum.vatAmount) +
    numberValue(taxDeductionAgg._sum.aitTdsAmount) +
    numberValue(taxDeductionAgg._sum.otherDeductionAmount);
  const retentionHeld = Math.max(
    numberValue(retentionAgg._sum.retentionAmount) - numberValue(retentionAgg._sum.retentionReleasedAmount),
    0,
  );
  const supplierPaid = numberValue(supplierPayableAgg._sum.paidAmount);
  const subcontractorPaid = numberValue(subcontractorPayableAgg._sum.paidAmount);
  const cashIn = cashBankSummary?.totals.inflow ?? 0;
  const cashOut = cashBankSummary?.totals.outflow ?? 0;
  const netCashMovement = cashBankSummary?.totals.netMovement ?? 0;
  const accountBalance = cashBankSummary?.totals.accountBalance ?? 0;
  const pendingReceivedCheques = cashBankSummary?.totals.pendingReceivedCheques ?? 0;
  const pendingIssuedCheques = cashBankSummary?.totals.pendingIssuedCheques ?? 0;
  const bouncedCheques = cashBankSummary?.totals.bouncedCheques ?? 0;
  const accountsUsed = cashBankSummary?.accountsUsed ?? [];
  const serviceChargeAccrued = serviceChargeLedger?.totals.effectiveTotal ?? phaseBalances.reduce((sum, row) => sum + row.serviceChargePreview, 0);
  const serviceChargeApproved = serviceChargeLedger?.totals.approvedTotal ?? 0;
  const serviceChargeSettled = serviceChargeLedger?.totals.settledTotal ?? 0;
  const serviceChargeIncludedInDemand = serviceChargeLedger?.totals.includedInDemandTotal ?? 0;
  const projectBalance = totalCollected - projectCostTotal;
  const finalSurplusDeficit = projectBalance - serviceChargeAccrued;
  const unlockedPhases = phaseBalances.filter((row) => !row.auditLocked).length;

  const readinessIssues = [
    buyerReceivable > 0 ? `Buyer due remains ${buyerReceivable.toFixed(2)}.` : null,
    supplierPayable > 0 ? `Supplier payable remains ${supplierPayable.toFixed(2)}.` : null,
    subcontractorPayable > 0 ? `Subcontractor payable remains ${subcontractorPayable.toFixed(2)}.` : null,
    retentionHeld > 0 ? `Retention payable remains ${retentionHeld.toFixed(2)}.` : null,
    pendingApprovalCount > 0 ? `${pendingApprovalCount} expense approvals are still pending.` : null,
    missingVoucherCount > 0 ? `${missingVoucherCount} records are still missing vouchers.` : null,
    pendingReceivedCheques > 0 || pendingIssuedCheques > 0 ? 'Pending cheques are still unresolved.' : null,
    bouncedCheques > 0 ? 'Bounced cheques still need resolution.' : null,
    serviceChargeLedger && serviceChargeLedger.totals.pendingCount > 0 ? 'Service charge is not fully approved yet.' : null,
    serviceChargeLedger && serviceChargeLedger.totals.approvedTotal > 0 && serviceChargeLedger.totals.settledTotal <= 0 && serviceChargeLedger.totals.includedInDemandTotal <= 0
      ? 'Approved service charge is not yet included in demand or settled.'
      : null,
    !postedReconciliation ? 'Final reconciliation has not been posted yet.' : null,
    unlockedPhases > 0 ? `${unlockedPhases} phases are still open to finance changes.` : null,
  ].filter(Boolean) as string[];

  return {
    project,
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
      serviceChargeApproved,
      serviceChargeSettled,
      serviceChargeIncludedInDemand,
      supplierPayable,
    subcontractorPayable,
    supplierPaid,
    subcontractorPaid,
    supplierBilled: supplierBillCost,
    supplierBillCost,
    subcontractorBilled: subcontractorBillCost,
    subcontractorBillCost,
    projectCostTotal,
    projectBalance,
    surplusDeficit: projectBalance,
    finalSurplusDeficit,
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
    phaseBalances,
    serviceChargeLedger,
    buyerLedger,
    postedReconciliation,
    financeReadiness: {
      ready: readinessIssues.length === 0,
      issues: readinessIssues,
    },
  };
}

export async function getFinalReconciliationPreview(projectId: string) {
  const [summary, project, ownershipRows, posted] = await Promise.all([
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
      orderBy: [{ buyerId: 'asc' }, { assignedAt: 'asc' }],
    }),
    prisma.finalReconciliation.findFirst({
      where: { projectId, status: 'POSTED', reversedAt: null },
      include: {
        lines: {
          include: {
            buyer: { select: { id: true, name: true } },
            unit: { select: { id: true, unitNo: true } },
          },
          orderBy: [{ buyerId: 'asc' }, { createdAt: 'asc' }],
        },
        demands: {
          where: { status: { not: 'CANCELLED' } },
          select: {
            id: true,
            buyerId: true,
            unitId: true,
            amount: true,
            status: true,
            dueDate: true,
            title: true,
            demandType: true,
            finalReconciliationId: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { postedAt: 'desc' },
    }),
  ]);

  if (!project) return null;

  const finalSurplusDeficit = summary.finalSurplusDeficit;
  const direction = finalSurplusDeficit < 0 ? 'DEFICIT' : finalSurplusDeficit > 0 ? 'SURPLUS' : 'BALANCED';
  const absoluteFinalAmount = Math.abs(finalSurplusDeficit);
  const blockingIssues: string[] = [];

  if (absoluteFinalAmount > 0 && ownershipRows.length === 0) {
    blockingIssues.push('Assign units and ownership shares before posting final reconciliation.');
  }

  const lineDistribution = distributeWeightedAmount(
    absoluteFinalAmount,
    ownershipRows.map((row) => ({
      key: row.id,
      weight: numberValue(row.sharePercent) / 100,
      buyerId: row.buyerId,
      buyerName: row.buyer.name,
      unitId: row.unitId,
      unitNo: row.unit.unitNo,
      ownershipShare: numberValue(row.sharePercent),
    })),
  ).map((row) => ({
    unitBuyerId: row.key,
    buyerId: (row as any).buyerId as string,
    buyerName: (row as any).buyerName as string,
    unitId: (row as any).unitId as string,
    unitNo: (row as any).unitNo as string,
    ownershipShare: (row as any).ownershipShare as number,
    weight: row.weight,
    amount: row.amount,
  }));

  const grouped = lineDistribution.reduce<Record<string, {
    buyerId: string;
    buyerName: string;
    units: string[];
    weight: number;
    amount: number;
  }>>((map, row) => {
    const existing = map[row.buyerId] ?? {
      buyerId: row.buyerId,
      buyerName: row.buyerName,
      units: [],
      weight: 0,
      amount: 0,
    };
    existing.units.push(`${row.unitNo} (${row.ownershipShare}%)`);
    existing.weight += row.weight;
    existing.amount += row.amount;
    map[row.buyerId] = existing;
    return map;
  }, {});

  const totalWeight = Object.values(grouped).reduce((sum, row) => sum + row.weight, 0) || 1;
  const distribution = Object.values(grouped)
    .map((row) => ({
      buyerId: row.buyerId,
      buyerName: row.buyerName,
      units: row.units.join(', '),
      weight: row.weight,
      sharePercent: roundMoney((row.weight / totalWeight) * 100),
      amount: roundMoney(row.amount),
    }))
    .sort((a, b) => b.weight - a.weight || a.buyerName.localeCompare(b.buyerName));

  return {
    project,
    summary,
    direction,
    finalSurplusDeficit,
    absoluteFinalAmount,
    canPost: blockingIssues.length === 0,
    blockingIssues,
    recommendation:
      blockingIssues.length > 0
        ? blockingIssues[0]
        : direction === 'DEFICIT'
        ? 'Collect a posted final reconciliation demand after management review.'
        : direction === 'SURPLUS'
          ? 'Post buyer credit lines after management review.'
          : 'No reconciliation posting is needed.',
    distribution,
    distributionLines: lineDistribution,
    posted,
  };
}

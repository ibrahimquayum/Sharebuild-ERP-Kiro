import { FINAL_EXPENSE_STATUSES } from '@/lib/accounting';
import { getCompanyBranding } from '@/lib/branding';
import { getChequeSummary, getProjectCashBankSummary } from '@/lib/cash-bank';
import {
  getFinalReconciliationPreview,
  getProjectBuyerLedger,
  getProjectFinanceSummary,
  getProjectServiceChargeLedger,
} from '@/lib/project-finance';
import { prisma } from '@/lib/prisma';
import { getUnifiedProjectCostReport } from '@/lib/project-cost-report';
import {
  getDefaultProjectCostReportFilters,
  type ProjectCostReportFilters,
} from '@/lib/report-controls';
import {
  getProjectSubcontractorAssignments,
  getProjectSupplierAssignments,
  isSubcontractorSupplierType,
} from '@/lib/project-vendor-ledger';

function numberValue(value: unknown) {
  return Number(value ?? 0);
}

function reportingPeriodLabel(dates: Array<Date | null | undefined>) {
  const validDates = dates
    .filter((date): date is Date => Boolean(date instanceof Date && !Number.isNaN(date.getTime())))
    .sort((a, b) => a.getTime() - b.getTime());

  if (validDates.length === 0) return 'Full available project history';

  return `${validDates[0].toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} to ${validDates[validDates.length - 1].toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`;
}

function normalizeDateStart(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date;
}

function normalizeDateEnd(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(23, 59, 59, 999);
  return date;
}

function withinDateRange(date: Date | null | undefined, fromDate: Date | null, toDate: Date | null) {
  if (!date) return false;
  if (fromDate && date < fromDate) return false;
  if (toDate && date > toDate) return false;
  return true;
}

function filterCollections<T extends { phaseId: string; receivedDate: Date; status?: string | null }>(
  rows: T[],
  filters: ProjectCostReportFilters,
) {
  const fromDate = normalizeDateStart(filters.from);
  const toDate = normalizeDateEnd(filters.to);
  return rows.filter((row) => {
    if (filters.phaseIds.length > 0 && !filters.phaseIds.includes(row.phaseId)) return false;
    if ((row.status ?? '').toUpperCase() === 'REVERSED' && !filters.includeReversedCancelled) return false;
    if (fromDate || toDate) return withinDateRange(row.receivedDate, fromDate, toDate);
    return true;
  });
}

function filterPayables<T extends { phaseId?: string | null; billDate: Date; reversedAt?: Date | null }>(
  rows: T[],
  filters: ProjectCostReportFilters,
) {
  const fromDate = normalizeDateStart(filters.from);
  const toDate = normalizeDateEnd(filters.to);
  return rows.filter((row) => {
    if (filters.phaseIds.length > 0 && (!row.phaseId || !filters.phaseIds.includes(row.phaseId))) return false;
    if (row.reversedAt && !filters.includeReversedCancelled) return false;
    if (fromDate || toDate) return withinDateRange(row.billDate, fromDate, toDate);
    return true;
  });
}

function filterServiceChargeRows<
  T extends { phaseId?: string | null; settledAt?: Date | null; approvedAt?: Date | null; calculatedAt?: Date | null; updatedAt?: Date; status?: string; reversedAt?: Date | null }
>(rows: T[], filters: ProjectCostReportFilters) {
  const fromDate = normalizeDateStart(filters.from);
  const toDate = normalizeDateEnd(filters.to);
  return rows.filter((row) => {
    if (filters.phaseIds.length > 0 && (!row.phaseId || !filters.phaseIds.includes(row.phaseId))) return false;
    if (row.reversedAt && !filters.includeReversedCancelled) return false;
    if (!filters.includeDraftPending && ['DRAFT', 'CALCULATED'].includes((row.status ?? '').toUpperCase())) return false;
    const effectiveDate = row.approvedAt ?? row.calculatedAt ?? row.settledAt ?? row.updatedAt ?? null;
    if (fromDate || toDate) return withinDateRange(effectiveDate ?? undefined, fromDate, toDate);
    return true;
  });
}

function rebuildCashBankSummary(
  summary: Awaited<ReturnType<typeof getProjectCashBankSummary>>,
  filters: ProjectCostReportFilters,
) {
  if (!summary) return null;

  const fromDate = normalizeDateStart(filters.from);
  const toDate = normalizeDateEnd(filters.to);
  const transactions = summary.transactions.filter((transaction) => {
    if (transaction.reversedAt && !filters.includeReversedCancelled) return false;
    if (filters.phaseIds.length > 0 && transaction.projectId && transaction.sourceType === 'DIRECT_EXPENSE') {
      return true;
    }
    if (fromDate || toDate) return withinDateRange(transaction.transactionDate, fromDate, toDate);
    return true;
  });
  const cheques = summary.cheques.filter((cheque) => {
    if (fromDate || toDate) return withinDateRange(cheque.chequeDate, fromDate, toDate);
    return true;
  });

  const postedTransactions = transactions.filter((transaction) => transaction.status === 'POSTED');
  const accountMap = new Map<
    string,
    {
      accountId: string;
      accountName: string;
      type: string;
      openingBalance: number;
      inflow: number;
      outflow: number;
      balance: number;
    }
  >();

  for (const transaction of postedTransactions) {
    const current = accountMap.get(transaction.accountId) ?? {
      accountId: transaction.accountId,
      accountName: transaction.account.name,
      type: transaction.account.type,
      openingBalance: numberValue(transaction.account.openingBalance),
      inflow: 0,
      outflow: 0,
      balance: 0,
    };

    const amount = numberValue(transaction.amount);
    if (transaction.type === 'INFLOW' || transaction.type === 'TRANSFER_IN') current.inflow += amount;
    if (transaction.type === 'OUTFLOW' || transaction.type === 'TRANSFER_OUT') current.outflow += amount;
    current.balance = current.openingBalance + current.inflow - current.outflow;
    accountMap.set(transaction.accountId, current);
  }

  const pendingReceivedCheques = cheques.filter((cheque) => cheque.status === 'PENDING' && cheque.chequeType === 'RECEIVED');
  const pendingIssuedCheques = cheques.filter((cheque) => cheque.status === 'PENDING' && cheque.chequeType === 'ISSUED');
  const bouncedCheques = cheques.filter((cheque) => cheque.status === 'BOUNCED');
  const clearedCheques = cheques.filter((cheque) => cheque.status === 'CLEARED');

  return {
    ...summary,
    transactions,
    cheques,
    accountsUsed: Array.from(accountMap.values()).sort((a, b) => a.accountName.localeCompare(b.accountName)),
    totals: {
      inflow: Array.from(accountMap.values()).reduce((sum, account) => sum + account.inflow, 0),
      outflow: Array.from(accountMap.values()).reduce((sum, account) => sum + account.outflow, 0),
      netMovement: Array.from(accountMap.values()).reduce((sum, account) => sum + account.inflow - account.outflow, 0),
      accountBalance: Array.from(accountMap.values()).reduce((sum, account) => sum + account.balance, 0),
      pendingReceivedCheques: pendingReceivedCheques.reduce((sum, cheque) => sum + numberValue(cheque.amount), 0),
      pendingIssuedCheques: pendingIssuedCheques.reduce((sum, cheque) => sum + numberValue(cheque.amount), 0),
      bouncedCheques: bouncedCheques.reduce((sum, cheque) => sum + numberValue(cheque.amount), 0),
      clearedCheques: clearedCheques.reduce((sum, cheque) => sum + numberValue(cheque.amount), 0),
    },
  };
}

function filterAssignments<
  T extends {
    id: string;
    supplier: { name: string };
    summary: Record<string, unknown>;
    payables: Array<{
      phaseId?: string | null;
      billDate: Date;
      reversedAt?: Date | null;
      totalAmount: unknown;
      dueAmount: unknown;
      payments: Array<{ amount: unknown; status: string | null }>;
      documents: Array<{ id: string }>;
      retentionAmount?: unknown;
    }>;
  }
>(assignments: T[], filters: ProjectCostReportFilters): T[] {
  return assignments.map((assignment) => {
    const payables = filterPayables(assignment.payables, filters);
    const totalBilled = payables.reduce((sum, payable) => sum + numberValue(payable.totalAmount), 0);
    const totalPaid = payables.reduce(
      (sum, payable) =>
        sum +
        payable.payments
          .filter((payment) => payment.status !== 'REVERSED')
          .reduce((innerSum, payment) => innerSum + numberValue(payment.amount), 0),
      0,
    );
    const totalDue = payables.reduce((sum, payable) => sum + numberValue(payable.dueAmount), 0);
    const missingInvoiceCount = payables.filter((payable) => payable.documents.length === 0).length;
    return {
      ...assignment,
      payables,
      summary: {
        ...assignment.summary,
        totalBilled,
        totalPaid,
        totalDue,
        missingInvoiceCount,
      },
    } as T;
  });
}

export async function getCompleteProjectReportData(
  companyId: string,
  projectId: string,
  filters: ProjectCostReportFilters = getDefaultProjectCostReportFilters(),
) {
  const project = await prisma.project.findFirst({ where: { id: projectId, companyId } });
  if (!project) return null;

  const [
    branding,
    summary,
    phases,
    expenses,
    payables,
    auditLogs,
    projectSupplierAssignments,
    projectSubcontractorAssignments,
    buyerDue,
    serviceChargeLedger,
    collections,
    units,
    cashBankSummary,
    chequeSummary,
    reconciliationPreview,
    costReport,
  ] = await Promise.all([
    getCompanyBranding(companyId),
    getProjectFinanceSummary(project.id),
    prisma.phase.findMany({
      where: { projectId: project.id, status: { notIn: ['CANCELLED', 'DUPLICATE'] } },
      orderBy: [{ sequence: 'asc' }, { createdAt: 'asc' }],
    }),
    prisma.expense.findMany({
      where: { phase: { projectId: project.id } },
      include: {
        phase: { select: { id: true, name: true, sequence: true } },
        supplier: { select: { name: true, supplierType: true } },
        createdBy: { select: { name: true } },
        approvedBy: { select: { name: true } },
        documents: { select: { id: true } },
      },
      orderBy: [{ phase: { sequence: 'asc' } }, { expenseDate: 'asc' }],
    }),
    prisma.supplierPayable.findMany({
      where: { projectId: project.id },
      include: {
        supplier: { select: { name: true, supplierType: true } },
        phase: { select: { id: true, name: true, sequence: true } },
        payments: { where: { status: { not: 'REVERSED' } }, orderBy: { paidAt: 'desc' } },
        documents: { select: { id: true, category: true } },
        billItems: true,
      },
      orderBy: [{ phase: { sequence: 'asc' } }, { billDate: 'asc' }],
    }),
    prisma.auditLog.findMany({
      where: { projectId: project.id },
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      take: 250,
    }),
    getProjectSupplierAssignments(project.id, companyId),
    getProjectSubcontractorAssignments(project.id, companyId),
    getProjectBuyerLedger(project.id),
    getProjectServiceChargeLedger(project.id),
    prisma.collection.findMany({
      where: { phase: { projectId: project.id }, status: { not: 'REVERSED' } },
      include: {
        buyer: { select: { name: true, phone: true } },
        phase: { select: { id: true, name: true, sequence: true } },
        demand: { select: { id: true, title: true, demandType: true } },
        account: { select: { name: true } },
        allocations: {
          include: {
            demand: {
              select: {
                id: true,
                title: true,
                demandType: true,
                unit: { select: { unitNo: true } },
              },
            },
          },
        },
      },
      orderBy: [{ receivedDate: 'asc' }, { createdAt: 'asc' }],
    }),
    prisma.unit.findMany({
      where: { projectId: project.id },
      include: {
        buyerAllocations: {
          include: { buyer: { select: { id: true, name: true, phone: true } } },
          orderBy: { assignedAt: 'asc' },
        },
        demands: {
          where: { status: { not: 'CANCELLED' } },
          include: {
            buyer: { select: { id: true, name: true } },
            allocations: {
              where: { collection: { status: { not: 'REVERSED' } } },
              select: { amount: true },
            },
            collections: {
              where: { status: { not: 'REVERSED' } },
              select: { amount: true },
            },
          },
        },
        documents: { select: { id: true } },
      },
      orderBy: [{ floor: 'asc' }, { unitNo: 'asc' }],
    }),
    getProjectCashBankSummary(project.id),
    getChequeSummary(companyId, project.id),
    getFinalReconciliationPreview(project.id),
    getUnifiedProjectCostReport(project.id, filters),
  ]);

  const filteredExpenses = expenses.filter((expense) =>
    costReport.rows.some((row) => row.sourceType === 'DIRECT_EXPENSE' && row.sourceId === expense.id),
  );
  const filteredCollections = filterCollections(collections, filters);
  const filteredPayables = filterPayables(payables, filters);
  const filteredSupplierSummary = filteredPayables
    .filter((payable) => !isSubcontractorSupplierType(payable.supplier.supplierType))
    .map((payable) => ({ ...payable, validPaid: payable.payments.reduce((sum, payment) => sum + Number(payment.amount), 0) }));
  const filteredSubcontractorSummary = filteredPayables
    .filter((payable) => isSubcontractorSupplierType(payable.supplier.supplierType))
    .map((payable) => ({ ...payable, validPaid: payable.payments.reduce((sum, payment) => sum + Number(payment.amount), 0) }));

  const phaseSummary = summary.phaseBalances
    .filter((phase) => filters.phaseIds.length === 0 || filters.phaseIds.includes(phase.phaseId))
    .map((phase) => {
      const costGroup = costReport.phaseGroups.find((group) => group.phaseId === phase.phaseId);
      return {
        ...phase,
        status: phases.find((item) => item.id === phase.phaseId)?.status ?? '',
        directExpense: costGroup?.totals.DIRECT_EXPENSE ?? 0,
        supplierBillItemTotal: costGroup?.totals.SUPPLIER_BILL_ITEM ?? 0,
        subcontractorBillItemTotal: costGroup?.totals.SUBCONTRACTOR_BILL ?? 0,
        serviceChargeCostTotal: costGroup?.totals.SERVICE_CHARGE ?? 0,
        totalBillablePhaseCost: costGroup?.totalCost ?? 0,
        phaseCostRows: costGroup?.rows.length ?? 0,
      };
    });

  const topSheet = phaseSummary.map((phase) => ({
    phaseId: phase.phaseId,
    phaseName: phase.phaseName,
    phaseType: phases.find((item) => item.id === phase.phaseId)?.phaseType ?? 'CUSTOM',
    income: phase.collection,
    expense: phase.expense + phase.supplierBill + phase.subcontractorBill,
    balance: phase.carryOut,
  }));

  const officialExpenses = filteredExpenses.filter(
    (expense) => FINAL_EXPENSE_STATUSES.includes(expense.status as any) && !expense.reversedAt,
  );
  const missingVoucher = costReport.rows.filter(
    (row) => row.voucherStatus === 'MISSING' && !row.reversed && (!row.pending || filters.includeDraftPending),
  );
  const pendingApprovals = costReport.rows.filter((row) => row.pending && !row.reversed);
  const reversedRecords = [
    ...expenses
      .filter((expense) => expense.reversedAt)
      .map((expense) => ({
        type: 'Expense',
        label: expense.description,
        amount: Number(expense.amount),
        reason: expense.reversalReason ?? '',
      })),
    ...payables
      .filter((payable) => payable.reversedAt)
      .map((payable) => ({
        type: payable.supplier.supplierType === 'LABOUR_CONTRACTOR' ? 'Subcontractor Bill' : 'Supplier Bill',
        label: payable.billNo ?? payable.supplier.name,
        amount: Number(payable.totalAmount),
        reason: payable.reversalReason ?? '',
      })),
  ];

  const reportingPeriod = reportingPeriodLabel([
    ...filteredCollections.map((collection) => collection.receivedDate),
    ...filteredExpenses.map((expense) => expense.expenseDate),
    ...filteredPayables.map((payable) => payable.billDate),
    ...buyerDue.flatMap((buyer) => buyer.demands.map((demand) => demand.issuedAt ?? demand.createdAt)),
  ]);

  const buyerBillingSummary = buyerDue.map((buyer) => {
    const matchingDemands = buyer.demands.filter((demand) => {
      if (!demand.phaseId) return filters.phaseIds.length === 0;
      return filters.phaseIds.length === 0 || filters.phaseIds.includes(demand.phaseId);
    });
    const fromDate = normalizeDateStart(filters.from);
    const toDate = normalizeDateEnd(filters.to);

    const regularDemanded = matchingDemands
      .filter((demand) => demand.demandType !== 'FINAL_RECONCILIATION')
      .filter((demand) => !fromDate && !toDate ? true : withinDateRange(demand.issuedAt ?? demand.createdAt, fromDate, toDate))
      .reduce((sum, demand) => sum + numberValue(demand.amount), 0);
    const finalReconciliationDemand = matchingDemands
      .filter((demand) => demand.demandType === 'FINAL_RECONCILIATION')
      .filter((demand) => !fromDate && !toDate ? true : withinDateRange(demand.issuedAt ?? demand.createdAt, fromDate, toDate))
      .reduce((sum, demand) => sum + numberValue(demand.amount), 0);
    const allocated = matchingDemands.reduce((sum, demand) => {
      const allocationTotal = demand.allocations.reduce((allocationSum, allocation) => allocationSum + numberValue(allocation.amount), 0);
      const legacyTotal = demand.collections.reduce((collectionSum, collection) => collectionSum + numberValue(collection.amount), 0);
      return sum + (allocationTotal > 0 ? allocationTotal : legacyTotal);
    }, 0);
    const collected = filteredCollections
      .filter((collection) => collection.buyerId === buyer.buyerId)
      .reduce((sum, collection) => sum + numberValue(collection.amount), 0);
    const demanded = regularDemanded + finalReconciliationDemand;
    const due = Math.max(demanded - allocated, 0);
    const advance = Math.max(collected - allocated, 0) + numberValue(buyer.reconciliationCredit ?? 0);

    return {
      ...buyer,
      demanded,
      regularDemanded,
      finalReconciliationDemand,
      allocated,
      collected,
      paid: collected,
      due,
      advance,
      ownershipShare: buyer.units.reduce((sum, unit) => sum + numberValue(unit.sharePercent), 0),
    };
  });

  const unitSummary = units.map((unit) => {
    const issuedDemand = unit.demands
      .filter((demand) => demand.demandType !== 'FINAL_RECONCILIATION')
      .reduce((sum, demand) => sum + numberValue(demand.amount), 0);
    const finalReconciliationDemand = unit.demands
      .filter((demand) => demand.demandType === 'FINAL_RECONCILIATION')
      .reduce((sum, demand) => sum + numberValue(demand.amount), 0);
    const collected = unit.demands.reduce((sum, demand) => {
      const allocationTotal = demand.allocations.reduce((allocationSum, allocation) => allocationSum + numberValue(allocation.amount), 0);
      const legacyTotal = demand.collections.reduce((collectionSum, collection) => collectionSum + numberValue(collection.amount), 0);
      return sum + (allocationTotal > 0 ? allocationTotal : legacyTotal);
    }, 0);

    return {
      id: unit.id,
      unitNo: unit.unitNo,
      floor: unit.floor,
      status: unit.status,
      sizesqft: numberValue(unit.sizesqft),
      agreedPrice: numberValue(unit.agreedPrice),
      ownerText: unit.buyerAllocations
        .map((allocation) => `${allocation.buyer.name} (${numberValue(allocation.sharePercent)}%)`)
        .join(', '),
      ownerCount: unit.buyerAllocations.length,
      issuedDemand,
      finalReconciliationDemand,
      collected,
      due: Math.max(issuedDemand + finalReconciliationDemand - collected, 0),
      documentCount: unit.documents.length,
    };
  });

  const collectionSummary = filteredCollections.map((collection) => {
    const allocatedAmount = collection.allocations.reduce((sum, allocation) => sum + numberValue(allocation.amount), 0);
    return {
      ...collection,
      allocatedAmount,
      unallocatedAmount: Math.max(numberValue(collection.amount) - allocatedAmount, 0),
    };
  });

  const filteredCashBankSummary = rebuildCashBankSummary(cashBankSummary, filters);
  const filteredChequeSummary = {
    ...chequeSummary,
    cheques: chequeSummary.cheques.filter((cheque) => {
      const fromDate = normalizeDateStart(filters.from);
      const toDate = normalizeDateEnd(filters.to);
      if (fromDate || toDate) return withinDateRange(cheque.chequeDate, fromDate, toDate);
      return true;
    }),
  };

  const filteredServiceChargeRows = filterServiceChargeRows(serviceChargeLedger?.rows ?? [], filters);
  const reportNotes = [
    ...summary.reportingNotes,
    costReport.rows.some((row) => row.sourceType === 'SUPPLIER_BILL_ITEM')
      ? 'Supplier bill items are included inside daily project cost details and phase category breakdown. Supplier ledger remains a separate payable-facing report.'
      : null,
    costReport.rows.some((row) => row.sourceType === 'SUBCONTRACTOR_BILL')
      ? 'Subcontractor progress bills are included inside daily project cost details. Subcontractor ledger remains a separate contract and payment report.'
      : null,
    filters.phaseIds.length > 0 || filters.from || filters.to || filters.sourceTypes.length > 0 || filters.categories.length > 0 || filters.partySearch
      ? 'This report is currently showing a filtered reporting slice. Export routes will use the same selected controls.'
      : null,
    buyerDue.length === 0 ? 'No buyer ledger rows were found for this project.' : null,
    filteredCollections.length === 0 ? 'No collection receipts matched the current report controls.' : null,
    filteredCashBankSummary && filteredCashBankSummary.transactions.length === 0 ? 'No posted cash/bank transactions matched the current report controls.' : null,
  ].filter(Boolean) as string[];

  return {
    branding,
    project,
    generatedAt: new Date(),
    reportingPeriod,
    filters,
    summary,
    phases,
    phaseSummary,
    topSheet,
    expenses: filteredExpenses,
    officialExpenses,
    costReport,
    collections: collectionSummary,
    supplierSummary: filteredSupplierSummary,
    subcontractorSummary: filteredSubcontractorSummary,
    projectSupplierAssignments: filterAssignments(projectSupplierAssignments, filters),
    projectSubcontractorAssignments: filterAssignments(projectSubcontractorAssignments, filters),
    buyerDue,
    buyerBillingSummary,
    unitSummary,
    serviceChargeLedger: serviceChargeLedger
      ? {
          ...serviceChargeLedger,
          rows: filteredServiceChargeRows,
          totals: {
            ...serviceChargeLedger.totals,
            approvedTotal: filteredServiceChargeRows
              .filter((row) => row.status === 'APPROVED')
              .reduce((sum, row) => sum + numberValue(row.serviceChargeAmount), 0),
            calculatedTotal: filteredServiceChargeRows
              .filter((row) => row.status === 'CALCULATED')
              .reduce((sum, row) => sum + numberValue(row.serviceChargeAmount), 0),
            includedInDemandTotal: filteredServiceChargeRows
              .filter((row) => row.includedInDemand)
              .reduce((sum, row) => sum + numberValue(row.serviceChargeAmount), 0),
            settledTotal: filteredServiceChargeRows
              .filter((row) => row.settlementStatus === 'SETTLED')
              .reduce((sum, row) => sum + numberValue(row.serviceChargeAmount), 0),
          },
        }
      : null,
    cashBankSummary: filteredCashBankSummary,
    chequeSummary: filteredChequeSummary,
    reconciliationPreview,
    reportNotes,
    auditLogs,
    auditSummary: {
      reversedRecords,
      missingVoucher,
      pendingApprovals,
      lockedPhases: phases.filter((phase) => phase.auditLockedAt),
    },
  };
}

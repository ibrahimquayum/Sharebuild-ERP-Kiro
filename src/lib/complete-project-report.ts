import { prisma } from '@/lib/prisma';
import { getCompanyBranding } from '@/lib/branding';
import { FINAL_EXPENSE_STATUSES } from '@/lib/accounting';
import { getChequeSummary, getProjectCashBankSummary } from '@/lib/cash-bank';
import {
  getFinalReconciliationPreview,
  getProjectBuyerLedger,
  getProjectFinanceSummary,
  getProjectServiceChargeLedger,
} from '@/lib/project-finance';
import { getProjectSupplierAssignments, getProjectSubcontractorAssignments, isSubcontractorSupplierType } from '@/lib/project-vendor-ledger';

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

export async function getCompleteProjectReportData(companyId: string, projectId: string) {
  const project = await prisma.project.findFirst({ where: { id: projectId, companyId } });
  if (!project) return null;

  const [branding, summary, phases, expenses, payables, auditLogs, projectSupplierAssignments, projectSubcontractorAssignments, buyerDue, serviceChargeLedger, collections, units, cashBankSummary, chequeSummary, reconciliationPreview] = await Promise.all([
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
        phase: { select: { name: true, sequence: true } },
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
  ]);

  const phaseSummary = summary.phaseBalances.map((phase) => ({
    ...phase,
    status: phases.find((item) => item.id === phase.phaseId)?.status ?? '',
  }));

  const topSheet = phases
    .filter((phase) => ['ACTIVE', 'APPROVED', 'INCLUDED_IN_SUMMARY'].includes(phase.status))
    .map((phase) => {
      const row = summary.phaseBalances.find((item) => item.phaseId === phase.id);
      return {
        phaseId: phase.id,
        phaseName: phase.name,
        phaseType: phase.phaseType,
        income: row?.collection ?? 0,
        expense: (row?.expense ?? 0) + (row?.supplierBill ?? 0) + (row?.subcontractorBill ?? 0),
        balance: row?.carryOut ?? 0,
      };
    });

  const supplierSummary = payables
    .filter((payable) => !isSubcontractorSupplierType(payable.supplier.supplierType))
    .map((payable) => ({ ...payable, validPaid: payable.payments.reduce((sum, payment) => sum + Number(payment.amount), 0) }));
  const subcontractorSummary = payables
    .filter((payable) => isSubcontractorSupplierType(payable.supplier.supplierType))
    .map((payable) => ({ ...payable, validPaid: payable.payments.reduce((sum, payment) => sum + Number(payment.amount), 0) }));

  const officialExpenses = expenses.filter((expense) => FINAL_EXPENSE_STATUSES.includes(expense.status as any) && !expense.reversedAt);
  const missingVoucher = expenses.filter((expense) => FINAL_EXPENSE_STATUSES.includes(expense.status as any) && !expense.reversedAt && expense.documents.length === 0);
  const pendingApprovals = expenses.filter((expense) => expense.status === 'PENDING_APPROVAL' && !expense.reversedAt);
  const reversedRecords = [
    ...expenses.filter((expense) => expense.reversedAt).map((expense) => ({ type: 'Expense', label: expense.description, amount: Number(expense.amount), reason: expense.reversalReason ?? '' })),
    ...payables.filter((payable) => payable.reversedAt).map((payable) => ({ type: payable.supplier.supplierType === 'LABOUR_CONTRACTOR' ? 'Subcontractor Bill' : 'Supplier Bill', label: payable.billNo ?? payable.supplier.name, amount: Number(payable.totalAmount), reason: payable.reversalReason ?? '' })),
  ];
  const reportingPeriod = reportingPeriodLabel([
    ...collections.map((collection) => collection.receivedDate),
    ...expenses.map((expense) => expense.expenseDate),
    ...payables.map((payable) => payable.billDate),
    ...buyerDue.flatMap((buyer) => buyer.demands.map((demand) => demand.issuedAt ?? demand.createdAt)),
  ]);
  const buyerBillingSummary = buyerDue.map((buyer) => ({
    ...buyer,
    ownershipShare: buyer.units.reduce((sum, unit) => sum + numberValue(unit.sharePercent), 0),
  }));
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
  const collectionSummary = collections.map((collection) => {
    const allocatedAmount = collection.allocations.reduce((sum, allocation) => sum + numberValue(allocation.amount), 0);
    return {
      ...collection,
      allocatedAmount,
      unallocatedAmount: Math.max(numberValue(collection.amount) - allocatedAmount, 0),
    };
  });
  const reportNotes = [
    ...summary.reportingNotes,
    buyerDue.length === 0 ? 'No buyer ledger rows were found for this project.' : null,
    collections.length === 0 ? 'No collection receipts were found for this project.' : null,
    cashBankSummary && cashBankSummary.transactions.length === 0 ? 'No posted cash/bank transactions were found for this project.' : null,
  ].filter(Boolean) as string[];

  return {
    branding,
    project,
    generatedAt: new Date(),
    reportingPeriod,
    summary,
    phases,
    phaseSummary,
    topSheet,
    expenses,
    officialExpenses,
    collections: collectionSummary,
    supplierSummary,
    subcontractorSummary,
    projectSupplierAssignments,
    projectSubcontractorAssignments,
    buyerDue,
    buyerBillingSummary,
    unitSummary,
    serviceChargeLedger,
    cashBankSummary,
    chequeSummary,
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

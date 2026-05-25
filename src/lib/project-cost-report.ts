import { FINAL_EXPENSE_STATUSES } from '@/lib/accounting';
import { prisma } from '@/lib/prisma';
import {
  type ProjectCostReportFilters,
  type ProjectCostSourceType,
  PROJECT_COST_SOURCE_TYPES,
} from '@/lib/report-controls';
import { isSubcontractorSupplierType } from '@/lib/project-vendor-ledger';

function numberValue(value: unknown) {
  return Number(value ?? 0);
}

function roundMoney(value: number) {
  return Number(value.toFixed(2));
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

function includesText(haystack: string, needle?: string) {
  if (!needle) return true;
  return haystack.toLowerCase().includes(needle.toLowerCase());
}

function paymentMethodLabel(value: string | null | undefined) {
  return (value ?? '').replaceAll('_', ' ') || 'Bill / payable';
}

type UnifiedVoucherStatus = 'ATTACHED' | 'MISSING' | 'NOT_REQUIRED';

export type UnifiedProjectCostRow = {
  id: string;
  projectId: string;
  phaseId: string | null;
  phaseName: string;
  phaseSequence: number;
  date: Date;
  sourceType: ProjectCostSourceType;
  sourceId: string;
  sourceNo: string;
  category: string;
  description: string;
  partyName: string;
  quantity: number | null;
  unit: string | null;
  rate: number | null;
  amount: number;
  paymentMethod: string;
  voucherStatus: UnifiedVoucherStatus;
  approvalStatus: string;
  documentCount: number;
  notes: string;
  reversed: boolean;
  pending: boolean;
};

type PhaseGroup = {
  phaseId: string | null;
  phaseName: string;
  phaseSequence: number;
  rows: UnifiedProjectCostRow[];
  totals: Record<ProjectCostSourceType, number>;
  totalCost: number;
  voucherMissingCount: number;
  pendingCount: number;
  reversedCount: number;
  categoryBreakdown: Array<{
    category: string;
    amount: number;
    rowCount: number;
  }>;
};

export type ProjectCostReportData = {
  filters: ProjectCostReportFilters;
  rows: UnifiedProjectCostRow[];
  allRowsCount: number;
  totals: Record<ProjectCostSourceType, number> & { total: number };
  phases: Array<{ id: string; name: string; sequence: number }>;
  phaseGroups: PhaseGroup[];
  availableCategories: string[];
  availableApprovalStatuses: string[];
  availableSourceTypes: ProjectCostSourceType[];
};

export async function getUnifiedProjectCostReport(
  projectId: string,
  filters: ProjectCostReportFilters,
): Promise<ProjectCostReportData> {
  const [phases, expenses, payables, serviceChargeEntries] = await Promise.all([
    prisma.phase.findMany({
      where: {
        projectId,
        status: { notIn: ['CANCELLED', 'DUPLICATE'] },
      },
      select: { id: true, name: true, sequence: true },
      orderBy: [{ sequence: 'asc' }, { createdAt: 'asc' }],
    }),
    prisma.expense.findMany({
      where: { phase: { projectId } },
      include: {
        phase: { select: { id: true, name: true, sequence: true } },
        supplier: { select: { name: true } },
        documents: { select: { id: true } },
      },
      orderBy: [{ expenseDate: 'asc' }, { createdAt: 'asc' }],
    }),
    prisma.supplierPayable.findMany({
      where: { projectId },
      include: {
        supplier: { select: { name: true, supplierType: true } },
        phase: { select: { id: true, name: true, sequence: true } },
        billItems: { orderBy: { createdAt: 'asc' } },
        documents: { select: { id: true } },
      },
      orderBy: [{ billDate: 'asc' }, { createdAt: 'asc' }],
    }),
    prisma.serviceChargeEntry.findMany({
      where: { projectId },
      include: {
        phase: { select: { id: true, name: true, sequence: true } },
      },
      orderBy: [{ approvedAt: 'asc' }, { calculatedAt: 'asc' }, { createdAt: 'asc' }],
    }),
  ]);

  const allRows: UnifiedProjectCostRow[] = [];

  for (const expense of expenses) {
    allRows.push({
      id: `expense:${expense.id}`,
      projectId,
      phaseId: expense.phaseId,
      phaseName: expense.phase.name,
      phaseSequence: expense.phase.sequence,
      date: expense.expenseDate,
      sourceType: 'DIRECT_EXPENSE',
      sourceId: expense.id,
      sourceNo: expense.billNo ?? expense.referenceNo ?? expense.id,
      category: expense.category,
      description: expense.description,
      partyName: expense.supplier?.name ?? expense.localShopName ?? 'Direct expense',
      quantity: expense.quantity ? numberValue(expense.quantity) : null,
      unit: expense.unit ?? null,
      rate: expense.unitPrice ? numberValue(expense.unitPrice) : null,
      amount: numberValue(expense.amount),
      paymentMethod: paymentMethodLabel(expense.paymentMethod),
      voucherStatus: expense.documents.length > 0 ? 'ATTACHED' : 'MISSING',
      approvalStatus: expense.reversedAt ? 'REVERSED' : expense.status,
      documentCount: expense.documents.length,
      notes: expense.notes ?? '',
      reversed: Boolean(expense.reversedAt),
      pending: !FINAL_EXPENSE_STATUSES.includes(expense.status as (typeof FINAL_EXPENSE_STATUSES)[number]),
    });
  }

  for (const payable of payables) {
    const phaseName = payable.phase?.name ?? 'Project General';
    const phaseId = payable.phase?.id ?? null;
    const phaseSequence = payable.phase?.sequence ?? 9999;
    const sourceType: ProjectCostSourceType = isSubcontractorSupplierType(payable.supplier.supplierType)
      ? 'SUBCONTRACTOR_BILL'
      : 'SUPPLIER_BILL_ITEM';
    const voucherStatus: UnifiedVoucherStatus = payable.documents.length > 0 ? 'ATTACHED' : 'MISSING';
    const approvalStatus = payable.reversedAt ? 'REVERSED' : payable.status;
    const itemRows = payable.billItems.length
      ? payable.billItems.map((item) => ({
          id: `${sourceType.toLowerCase()}:${payable.id}:${item.id}`,
          category: item.category,
          description: item.description,
          quantity: item.quantity ? numberValue(item.quantity) : null,
          unit: item.unit ?? null,
          rate: item.unitPrice ? numberValue(item.unitPrice) : null,
          amount: numberValue(item.amount),
        }))
      : [
          {
            id: `${sourceType.toLowerCase()}:${payable.id}`,
            category: sourceType === 'SUBCONTRACTOR_BILL' ? 'CONTRACTOR_BILL' : 'OTHER',
            description:
              sourceType === 'SUBCONTRACTOR_BILL'
                ? `Progress bill - ${payable.supplier.name}`
                : `Supplier bill - ${payable.supplier.name}`,
            quantity: null,
            unit: null,
            rate: null,
            amount: numberValue(payable.totalAmount),
          },
        ];

    for (const item of itemRows) {
      allRows.push({
        id: item.id,
        projectId,
        phaseId,
        phaseName,
        phaseSequence,
        date: payable.billDate,
        sourceType,
        sourceId: payable.id,
        sourceNo: payable.billNo ?? payable.id,
        category: item.category,
        description: item.description,
        partyName: payable.supplier.name,
        quantity: item.quantity,
        unit: item.unit,
        rate: item.rate,
        amount: item.amount,
        paymentMethod: 'Bill / payable',
        voucherStatus,
        approvalStatus,
        documentCount: payable.documents.length,
        notes: payable.notes ?? '',
        reversed: Boolean(payable.reversedAt || payable.status === 'WRITTEN_OFF'),
        pending: false,
      });
    }
  }

  for (const entry of serviceChargeEntries) {
    allRows.push({
      id: `service-charge:${entry.id}`,
      projectId,
      phaseId: entry.phaseId ?? null,
      phaseName: entry.phase?.name ?? 'Project General',
      phaseSequence: entry.phase?.sequence ?? 9999,
      date: entry.approvedAt ?? entry.calculatedAt ?? entry.updatedAt ?? entry.createdAt,
      sourceType: 'SERVICE_CHARGE',
      sourceId: entry.id,
      sourceNo: entry.id,
      category: 'SERVICE_CHARGE',
      description: 'Company Service Charge / Supervision Fee',
      partyName: 'Sharebuild Supervision',
      quantity: null,
      unit: null,
      rate: entry.percentage ? numberValue(entry.percentage) : null,
      amount: numberValue(entry.serviceChargeAmount),
      paymentMethod: entry.includedInDemand
        ? 'Included in demand'
        : entry.settlementMethod
          ? paymentMethodLabel(entry.settlementMethod)
          : 'System generated',
      voucherStatus: 'NOT_REQUIRED',
      approvalStatus: entry.reversedAt ? 'REVERSED' : entry.status,
      documentCount: 0,
      notes: entry.notes ?? '',
      reversed: Boolean(entry.reversedAt),
      pending: !['APPROVED', 'SETTLED'].includes(entry.status),
    });
  }

  const fromDate = normalizeDateStart(filters.from);
  const toDate = normalizeDateEnd(filters.to);

  const filteredRows = allRows
    .filter((row) => {
      if (fromDate && row.date < fromDate) return false;
      if (toDate && row.date > toDate) return false;
      if (filters.phaseIds.length > 0 && (!row.phaseId || !filters.phaseIds.includes(row.phaseId))) return false;
      if (filters.sourceTypes.length > 0 && !filters.sourceTypes.includes(row.sourceType)) return false;
      if (filters.categories.length > 0 && !filters.categories.includes(row.category)) return false;
      if (filters.approvalStatuses.length > 0 && !filters.approvalStatuses.includes(row.approvalStatus.toUpperCase())) return false;
      if (!includesText(`${row.partyName} ${row.description} ${row.sourceNo}`, filters.partySearch)) return false;
      if (!filters.includeDraftPending && row.pending) return false;
      if (!filters.includeReversedCancelled && row.reversed) return false;
      if (filters.voucherStatus === 'attached' && row.voucherStatus !== 'ATTACHED') return false;
      if (filters.voucherStatus === 'missing' && row.voucherStatus !== 'MISSING') return false;
      if (filters.voucherStatus === 'not_required' && row.voucherStatus !== 'NOT_REQUIRED') return false;
      return true;
    })
    .sort((a, b) => {
      if (a.phaseSequence !== b.phaseSequence) return a.phaseSequence - b.phaseSequence;
      if (a.date.getTime() !== b.date.getTime()) return a.date.getTime() - b.date.getTime();
      return a.description.localeCompare(b.description);
    });

  const totals = Object.fromEntries(
    PROJECT_COST_SOURCE_TYPES.map((type) => [type, 0]),
  ) as Record<ProjectCostSourceType, number>;
  for (const row of filteredRows) totals[row.sourceType] += row.amount;

  const phaseGroupsMap = new Map<string, PhaseGroup>();
  for (const row of filteredRows) {
    const key = row.phaseId ?? 'project-general';
    const group = phaseGroupsMap.get(key) ?? {
      phaseId: row.phaseId,
      phaseName: row.phaseName,
      phaseSequence: row.phaseSequence,
      rows: [],
      totals: {
        DIRECT_EXPENSE: 0,
        SUPPLIER_BILL_ITEM: 0,
        SUBCONTRACTOR_BILL: 0,
        SERVICE_CHARGE: 0,
        ADJUSTMENT: 0,
      },
      totalCost: 0,
      voucherMissingCount: 0,
      pendingCount: 0,
      reversedCount: 0,
      categoryBreakdown: [],
    };
    group.rows.push(row);
    group.totals[row.sourceType] += row.amount;
    group.totalCost += row.amount;
    if (row.voucherStatus === 'MISSING') group.voucherMissingCount += 1;
    if (row.pending) group.pendingCount += 1;
    if (row.reversed) group.reversedCount += 1;
    phaseGroupsMap.set(key, group);
  }

  const phaseGroups = Array.from(phaseGroupsMap.values())
    .map((group) => {
      const categoryTotals = new Map<string, { amount: number; rowCount: number }>();
      for (const row of group.rows) {
        const bucket = categoryTotals.get(row.category) ?? { amount: 0, rowCount: 0 };
        bucket.amount += row.amount;
        bucket.rowCount += 1;
        categoryTotals.set(row.category, bucket);
      }
      return {
        ...group,
        totalCost: roundMoney(group.totalCost),
        categoryBreakdown: Array.from(categoryTotals.entries())
          .map(([category, value]) => ({
            category,
            amount: roundMoney(value.amount),
            rowCount: value.rowCount,
          }))
          .sort((a, b) => b.amount - a.amount || a.category.localeCompare(b.category)),
      };
    })
    .sort((a, b) => a.phaseSequence - b.phaseSequence || a.phaseName.localeCompare(b.phaseName));

  return {
    filters,
    rows: filteredRows,
    allRowsCount: allRows.length,
    totals: {
      ...Object.fromEntries(
        Object.entries(totals).map(([key, value]) => [key, roundMoney(value)]),
      ) as Record<ProjectCostSourceType, number>,
      total: roundMoney(filteredRows.reduce((sum, row) => sum + row.amount, 0)),
    },
    phases: phases.map((phase) => ({
      id: phase.id,
      name: phase.name,
      sequence: phase.sequence,
    })),
    phaseGroups,
    availableCategories: Array.from(new Set(allRows.map((row) => row.category))).sort((a, b) => a.localeCompare(b)),
    availableApprovalStatuses: Array.from(
      new Set(allRows.map((row) => row.approvalStatus.toUpperCase())),
    ).sort((a, b) => a.localeCompare(b)),
    availableSourceTypes: [...PROJECT_COST_SOURCE_TYPES],
  };
}

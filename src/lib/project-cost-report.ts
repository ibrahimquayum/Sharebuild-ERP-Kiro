import { FINAL_EXPENSE_STATUSES } from '@/lib/accounting';
import { prisma } from '@/lib/prisma';
import {
  getDefaultProjectCostReportFilters,
  type ProjectCostReportFilters,
  type ProjectCostSourceType,
  PROJECT_COST_SOURCE_TYPES,
} from '@/lib/report-controls';
import {
  getEffectiveServiceChargePercent,
  numberValue,
  parseServiceChargePercentSetting,
} from '@/lib/service-charge';
import { isSubcontractorSupplierType } from '@/lib/project-vendor-ledger';

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

function clientFacingSourceNo(candidates: Array<string | null | undefined>, fallback: 'not-assigned' | 'imported-row' = 'not-assigned') {
  const match = candidates.find((value) => value && value.trim().length > 0);
  if (match) return match.trim();
  return fallback === 'imported-row' ? 'Imported summary row' : 'Not assigned';
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
  const [project, phases, expenses, payables, serviceChargeEntries] = await Promise.all([
    prisma.project.findUnique({
      where: { id: projectId },
      select: { companyId: true, defaultServiceChargePct: true },
    }),
    prisma.phase.findMany({
      where: {
        projectId,
        status: { notIn: ['CANCELLED', 'DUPLICATE'] },
      },
      select: { id: true, name: true, sequence: true, serviceChargePct: true },
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
      orderBy: [{ updatedAt: 'desc' }, { approvedAt: 'desc' }, { calculatedAt: 'desc' }, { createdAt: 'desc' }],
    }),
  ]);
  const companyDefaultServiceChargeSetting = project?.companyId
    ? await prisma.companySetting.findUnique({
        where: {
          companyId_key: {
            companyId: project.companyId,
            key: 'defaultServiceChargePct',
          },
        },
        select: { value: true },
      })
    : null;
  const companyDefaultServiceChargePct = parseServiceChargePercentSetting(companyDefaultServiceChargeSetting?.value);

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
      sourceNo: clientFacingSourceNo([expense.billNo, expense.referenceNo]),
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
      ? 'SUBCONTRACTOR_PROGRESS_BILL'
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
            category: sourceType === 'SUBCONTRACTOR_PROGRESS_BILL' ? 'CONTRACTOR_BILL' : 'OTHER',
            description:
              sourceType === 'SUBCONTRACTOR_PROGRESS_BILL'
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
        sourceNo: clientFacingSourceNo([payable.billNo], payable.billItems.length > 0 ? 'not-assigned' : 'imported-row'),
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

  const constructionCostByPhase = new Map<string, number>();
  for (const row of allRows) {
    if (row.reversed || row.pending || !row.phaseId) continue;
    constructionCostByPhase.set(row.phaseId, (constructionCostByPhase.get(row.phaseId) ?? 0) + row.amount);
  }

  const latestServiceChargeByPhase = new Map<string, (typeof serviceChargeEntries)[number]>();
  const manualServiceChargeEntries: typeof serviceChargeEntries = [];
  for (const entry of serviceChargeEntries) {
    if (!entry.phaseId) {
      manualServiceChargeEntries.push(entry);
      continue;
    }
    if (entry.reversedAt || entry.status === 'REVERSED') continue;
    if (!latestServiceChargeByPhase.has(entry.phaseId)) {
      latestServiceChargeByPhase.set(entry.phaseId, entry);
    }
  }

  for (const phase of phases) {
    const actualConstructionCost = constructionCostByPhase.get(phase.id) ?? 0;
    const percentage = getEffectiveServiceChargePercent({
      companyDefaultPct: companyDefaultServiceChargePct,
      projectDefaultPct: project?.defaultServiceChargePct,
      phaseOverridePct: phase.serviceChargePct,
    });
    const entry = latestServiceChargeByPhase.get(phase.id);
    const amount = entry
      ? numberValue(entry.serviceChargeAmount)
      : roundMoney((actualConstructionCost * percentage) / 100);

    if (amount <= 0 && !entry) continue;

    allRows.push({
      id: entry ? `service-charge:${entry.id}` : `service-charge-preview:${phase.id}`,
      projectId,
      phaseId: phase.id,
      phaseName: phase.name,
      phaseSequence: phase.sequence,
      date: entry?.approvedAt ?? entry?.calculatedAt ?? entry?.updatedAt ?? new Date(),
      sourceType: 'COMPANY_SERVICE_CHARGE',
      sourceId: entry?.id ?? phase.id,
      sourceNo: entry?.includedInDemand ? 'Included in demand' : entry ? 'Calculated service charge' : 'Preview service charge',
      category: 'SERVICE_CHARGE',
      description: 'Company Service Charge / Supervision Fee',
      partyName: 'Company supervision fee',
      quantity: null,
      unit: null,
      rate: entry?.percentage ? numberValue(entry.percentage) : percentage,
      amount,
      paymentMethod: entry?.includedInDemand
        ? 'Included in demand'
        : entry?.settlementMethod
          ? paymentMethodLabel(entry.settlementMethod)
          : 'Calculated live from phase percentage',
      voucherStatus: 'NOT_REQUIRED',
      approvalStatus: entry ? entry.status : 'PREVIEW',
      documentCount: 0,
      notes: entry?.notes ?? `Calculated as ${percentage.toFixed(2)}% of actual construction cost ${actualConstructionCost.toFixed(2)}.`,
      reversed: Boolean(entry?.reversedAt),
      pending: entry ? ['DRAFT', 'PENDING_APPROVAL'].includes(entry.status) : false,
    });
  }

  for (const entry of manualServiceChargeEntries) {
    allRows.push({
      id: `service-charge:${entry.id}`,
      projectId,
      phaseId: null,
      phaseName: 'Project General',
      phaseSequence: 9999,
      date: entry.approvedAt ?? entry.calculatedAt ?? entry.updatedAt ?? entry.createdAt,
      sourceType: 'COMPANY_SERVICE_CHARGE',
      sourceId: entry.id,
      sourceNo: entry.includedInDemand ? 'Included in demand' : 'Manual service charge',
      category: 'SERVICE_CHARGE',
      description: 'Company Service Charge / Supervision Fee',
      partyName: 'Company supervision fee',
      quantity: null,
      unit: null,
      rate: entry.percentage ? numberValue(entry.percentage) : null,
      amount: numberValue(entry.serviceChargeAmount),
      paymentMethod: entry.includedInDemand
        ? 'Included in demand'
        : entry.settlementMethod
          ? paymentMethodLabel(entry.settlementMethod)
          : 'Manual service charge',
      voucherStatus: 'NOT_REQUIRED',
      approvalStatus: entry.reversedAt ? 'REVERSED' : entry.status,
      documentCount: 0,
      notes: entry.notes ?? '',
      reversed: Boolean(entry.reversedAt),
      pending: ['DRAFT', 'PENDING_APPROVAL'].includes(entry.status),
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
        SUBCONTRACTOR_PROGRESS_BILL: 0,
        COMPANY_SERVICE_CHARGE: 0,
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

export type PhaseFinancialSummary = {
  phase: {
    id: string;
    projectId: string;
    projectName: string;
    name: string;
    nameBn: string | null;
    status: string;
    phaseType: string;
    sequence: number;
    floorNo: number | null;
    workDesc: string | null;
    startDate: Date | null;
    endDate: Date | null;
    serviceChargePct: number;
  };
  totalCollection: number;
  issuedDemand: number;
  buyerDue: number;
  buyerAdvance: number;
  allocatedCollection: number;
  actualConstructionCost: number;
  directExpenseTotal: number;
  supplierBillItemTotal: number;
  subcontractorBillTotal: number;
  adjustmentTotal: number;
  serviceChargePercentage: number;
  serviceChargeAmount: number;
  totalBillablePhaseCost: number;
  phaseBalance: number;
  categoryBreakdown: Array<{
    category: string;
    amount: number;
    rowCount: number;
    percentage: number;
  }>;
  dailyProjectCostRows: UnifiedProjectCostRow[];
  missingVoucherCount: number;
  pendingApprovalCount: number;
  reversedCount: number;
  buyerCollections: Array<{
    id: string;
    buyerName: string;
    buyerNameBn: string | null;
    amount: number;
    allocatedAmount: number;
    unallocatedAmount: number;
    paymentMethod: string;
    receivedDate: Date;
    accountName: string | null;
    referenceNo: string | null;
  }>;
  demands: Array<{
    id: string;
    title: string;
    buyerName: string;
    unitNo: string | null;
    amount: number;
    allocatedAmount: number;
    dueAmount: number;
    status: string;
    dueDate: Date | null;
  }>;
};

export async function getPhaseFinancialSummary(
  projectId: string,
  phaseId: string,
  controls: Partial<ProjectCostReportFilters> = {},
): Promise<PhaseFinancialSummary | null> {
  const defaultFilters = getDefaultProjectCostReportFilters();
  const filters: ProjectCostReportFilters = {
    ...defaultFilters,
    ...controls,
    phaseIds: [phaseId],
    sourceTypes: controls.sourceTypes ?? defaultFilters.sourceTypes,
    categories: controls.categories ?? defaultFilters.categories,
    approvalStatuses: controls.approvalStatuses ?? defaultFilters.approvalStatuses,
    sections: controls.sections ?? defaultFilters.sections,
  };
  const fromDate = normalizeDateStart(filters.from);
  const toDate = normalizeDateEnd(filters.to);

  const [phase, costReport, collections, demands] = await Promise.all([
    prisma.phase.findFirst({
      where: { id: phaseId, projectId },
      include: {
        project: {
          select: { id: true, name: true, companyId: true, defaultServiceChargePct: true },
        },
      },
    }),
    getUnifiedProjectCostReport(projectId, filters),
    prisma.collection.findMany({
      where: { phaseId, status: { not: 'REVERSED' } },
      include: {
        buyer: { select: { name: true, nameBn: true } },
        account: { select: { name: true } },
        allocations: { select: { amount: true } },
      },
      orderBy: [{ receivedDate: 'asc' }, { createdAt: 'asc' }],
    }),
    prisma.demand.findMany({
      where: { phaseId, status: { not: 'CANCELLED' } },
      include: {
        buyer: { select: { name: true } },
        unit: { select: { unitNo: true } },
        allocations: {
          where: { collection: { status: { not: 'REVERSED' } } },
          select: { amount: true },
        },
        collections: {
          where: { status: { not: 'REVERSED' } },
          select: { amount: true },
        },
      },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }],
    }),
  ]);

  if (!phase) return null;

  const companyDefaultServiceChargeSetting = await prisma.companySetting.findUnique({
    where: {
      companyId_key: {
        companyId: phase.project.companyId,
        key: 'defaultServiceChargePct',
      },
    },
    select: { value: true },
  });
  const companyDefaultServiceChargePct = parseServiceChargePercentSetting(companyDefaultServiceChargeSetting?.value);

  const filteredCollections = collections.filter((collection) => {
    if (fromDate && collection.receivedDate < fromDate) return false;
    if (toDate && collection.receivedDate > toDate) return false;
    return true;
  });

  const filteredDemands = demands.filter((demand) => {
    const date = demand.issuedAt ?? demand.createdAt;
    if (fromDate && date < fromDate) return false;
    if (toDate && date > toDate) return false;
    return true;
  });

  const costGroup = costReport.phaseGroups.find((group) => group.phaseId === phaseId);
  const directExpenseTotal = costGroup?.totals.DIRECT_EXPENSE ?? 0;
  const supplierBillItemTotal = costGroup?.totals.SUPPLIER_BILL_ITEM ?? 0;
  const subcontractorBillTotal = costGroup?.totals.SUBCONTRACTOR_PROGRESS_BILL ?? 0;
  const adjustmentTotal = costGroup?.totals.ADJUSTMENT ?? 0;
  const serviceChargeAmount = costGroup?.totals.COMPANY_SERVICE_CHARGE ?? 0;
  const actualConstructionCost = directExpenseTotal + supplierBillItemTotal + subcontractorBillTotal + adjustmentTotal;
  const serviceChargePercentage = getEffectiveServiceChargePercent({
    companyDefaultPct: companyDefaultServiceChargePct,
    projectDefaultPct: phase.project.defaultServiceChargePct,
    phaseOverridePct: phase.serviceChargePct,
  });
  const totalBillablePhaseCost = actualConstructionCost + serviceChargeAmount;
  const totalCollection = filteredCollections.reduce((sum, collection) => sum + numberValue(collection.amount), 0);
  const issuedDemand = filteredDemands.reduce((sum, demand) => sum + numberValue(demand.amount), 0);

  const demandRows = filteredDemands.map((demand) => {
    const allocationTotal = demand.allocations.reduce((sum, allocation) => sum + numberValue(allocation.amount), 0);
    const legacyCollectionTotal = demand.collections.reduce((sum, collection) => sum + numberValue(collection.amount), 0);
    const allocatedAmount = allocationTotal > 0 ? allocationTotal : legacyCollectionTotal;
    const amount = numberValue(demand.amount);
    return {
      id: demand.id,
      title: demand.title,
      buyerName: demand.buyer.name,
      unitNo: demand.unit?.unitNo ?? null,
      amount,
      allocatedAmount,
      dueAmount: Math.max(amount - allocatedAmount, 0),
      status: demand.status,
      dueDate: demand.dueDate,
    };
  });
  const allocatedCollection = demandRows.reduce((sum, demand) => sum + demand.allocatedAmount, 0);

  return {
    phase: {
      id: phase.id,
      projectId: phase.projectId,
      projectName: phase.project.name,
      name: phase.name,
      nameBn: phase.nameBn,
      status: phase.status,
      phaseType: phase.phaseType,
      sequence: phase.sequence,
      floorNo: phase.floorNo,
      workDesc: phase.workDesc,
      startDate: phase.startDate,
      endDate: phase.endDate,
      serviceChargePct: serviceChargePercentage,
    },
    totalCollection,
    issuedDemand,
    buyerDue: demandRows.reduce((sum, demand) => sum + demand.dueAmount, 0),
    buyerAdvance: Math.max(totalCollection - allocatedCollection, 0),
    allocatedCollection,
    actualConstructionCost,
    directExpenseTotal,
    supplierBillItemTotal,
    subcontractorBillTotal,
    adjustmentTotal,
    serviceChargePercentage,
    serviceChargeAmount,
    totalBillablePhaseCost,
    phaseBalance: totalCollection - totalBillablePhaseCost,
    categoryBreakdown: (costGroup?.categoryBreakdown ?? []).map((row) => ({
      ...row,
      percentage: totalBillablePhaseCost > 0 ? roundMoney((row.amount / totalBillablePhaseCost) * 100) : 0,
    })),
    dailyProjectCostRows: costGroup?.rows ?? [],
    missingVoucherCount: costGroup?.voucherMissingCount ?? 0,
    pendingApprovalCount: costGroup?.pendingCount ?? 0,
    reversedCount: costGroup?.reversedCount ?? 0,
    buyerCollections: filteredCollections.map((collection) => {
      const allocatedAmount = collection.allocations.reduce((sum, allocation) => sum + numberValue(allocation.amount), 0);
      const amount = numberValue(collection.amount);
      return {
        id: collection.id,
        buyerName: collection.buyer.name,
        buyerNameBn: collection.buyer.nameBn,
        amount,
        allocatedAmount,
        unallocatedAmount: Math.max(amount - allocatedAmount, 0),
        paymentMethod: paymentMethodLabel(collection.paymentMethod),
        receivedDate: collection.receivedDate,
        accountName: collection.account?.name ?? null,
        referenceNo: collection.reference,
      };
    }),
    demands: demandRows,
  };
}

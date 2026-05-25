export const PROJECT_COST_SOURCE_TYPES = [
  'DIRECT_EXPENSE',
  'SUPPLIER_BILL_ITEM',
  'SUBCONTRACTOR_PROGRESS_BILL',
  'COMPANY_SERVICE_CHARGE',
  'ADJUSTMENT',
] as const;

export type ProjectCostSourceType = (typeof PROJECT_COST_SOURCE_TYPES)[number];

export const COMPLETE_PROJECT_REPORT_SECTIONS = [
  'overview',
  'executive-summary',
  'phase-summary',
  'phase-details',
  'daily-project-cost',
  'buyer-billing',
  'supplier-ledger',
  'subcontractor-ledger',
  'cash-bank',
  'cheques',
  'tax-retention-service-charge',
  'final-reconciliation',
  'audit-summary',
] as const;

export type CompleteProjectReportSection = (typeof COMPLETE_PROJECT_REPORT_SECTIONS)[number];

export type ProjectCostVoucherFilter = 'all' | 'attached' | 'missing' | 'not_required';
export type ProjectCostDetailMode = 'summary' | 'detailed' | 'audit';

export type ProjectCostReportFilters = {
  from?: string;
  to?: string;
  phaseIds: string[];
  sourceTypes: ProjectCostSourceType[];
  categories: string[];
  partySearch?: string;
  approvalStatuses: string[];
  voucherStatus: ProjectCostVoucherFilter;
  includeDraftPending: boolean;
  includeReversedCancelled: boolean;
  includeEmptySections: boolean;
  detailMode: ProjectCostDetailMode;
  sections: CompleteProjectReportSection[];
};

export type SearchParamInput =
  | URLSearchParams
  | Record<string, string | string[] | undefined>;

const DEFAULT_SECTIONS = [...COMPLETE_PROJECT_REPORT_SECTIONS];

function asArray(value: string | string[] | undefined) {
  if (!value) return [] as string[];
  return Array.isArray(value) ? value : [value];
}

function getAll(input: SearchParamInput, key: string) {
  if (input instanceof URLSearchParams) return input.getAll(key);
  return asArray(input[key]);
}

function getFirst(input: SearchParamInput, key: string) {
  if (input instanceof URLSearchParams) return input.get(key) ?? undefined;
  const values = asArray(input[key]);
  return values[0];
}

function truthy(value: string | undefined) {
  return value === '1' || value === 'true' || value === 'yes' || value === 'on';
}

function normalizeUnique(values: string[]) {
  return Array.from(
    new Set(
      values
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  );
}

function normalizeSourceTypes(values: string[]) {
  return normalizeUnique(values).filter((value): value is ProjectCostSourceType =>
    PROJECT_COST_SOURCE_TYPES.includes(value as ProjectCostSourceType),
  );
}

function normalizeSections(values: string[]) {
  const selected = normalizeUnique(values).filter((value): value is CompleteProjectReportSection =>
    COMPLETE_PROJECT_REPORT_SECTIONS.includes(value as CompleteProjectReportSection),
  );
  return selected.length ? selected : [...DEFAULT_SECTIONS];
}

export function getDefaultProjectCostReportFilters(): ProjectCostReportFilters {
  return {
    from: undefined,
    to: undefined,
    phaseIds: [],
    sourceTypes: [],
    categories: [],
    partySearch: undefined,
    approvalStatuses: [],
    voucherStatus: 'all',
    includeDraftPending: false,
    includeReversedCancelled: false,
    includeEmptySections: true,
    detailMode: 'detailed',
    sections: [...DEFAULT_SECTIONS],
  };
}

export function parseProjectCostReportFilters(input: SearchParamInput): ProjectCostReportFilters {
  const defaults = getDefaultProjectCostReportFilters();
  const voucherStatus = getFirst(input, 'voucherStatus');
  const detailMode = getFirst(input, 'detailMode');

  return {
    from: getFirst(input, 'from') || undefined,
    to: getFirst(input, 'to') || undefined,
    phaseIds: normalizeUnique(getAll(input, 'phase')),
    sourceTypes: normalizeSourceTypes(getAll(input, 'sourceType')),
    categories: normalizeUnique(getAll(input, 'category')),
    partySearch: getFirst(input, 'partySearch')?.trim() || undefined,
    approvalStatuses: normalizeUnique(getAll(input, 'approvalStatus')).map((value) => value.toUpperCase()),
    voucherStatus: voucherStatus === 'attached' || voucherStatus === 'missing' || voucherStatus === 'not_required'
      ? voucherStatus
      : defaults.voucherStatus,
    includeDraftPending: truthy(getFirst(input, 'includeDraftPending')),
    includeReversedCancelled: truthy(getFirst(input, 'includeReversedCancelled')),
    includeEmptySections: getFirst(input, 'includeEmptySections') === undefined
      ? defaults.includeEmptySections
      : truthy(getFirst(input, 'includeEmptySections')),
    detailMode: detailMode === 'summary' || detailMode === 'audit' ? detailMode : defaults.detailMode,
    sections: normalizeSections(getAll(input, 'section')),
  };
}

export function hasReportSection(
  filters: ProjectCostReportFilters,
  section: CompleteProjectReportSection,
) {
  return filters.sections.includes(section);
}

export function buildProjectCostReportSearchParams(filters: ProjectCostReportFilters) {
  const params = new URLSearchParams();

  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  if (filters.partySearch) params.set('partySearch', filters.partySearch);
  if (filters.voucherStatus !== 'all') params.set('voucherStatus', filters.voucherStatus);
  if (filters.detailMode !== 'detailed') params.set('detailMode', filters.detailMode);
  if (filters.includeDraftPending) params.set('includeDraftPending', '1');
  if (filters.includeReversedCancelled) params.set('includeReversedCancelled', '1');
  if (!filters.includeEmptySections) params.set('includeEmptySections', '0');

  for (const phaseId of filters.phaseIds) params.append('phase', phaseId);
  for (const sourceType of filters.sourceTypes) params.append('sourceType', sourceType);
  for (const category of filters.categories) params.append('category', category);
  for (const status of filters.approvalStatuses) params.append('approvalStatus', status);

  const normalizedSections = normalizeSections(filters.sections);
  const defaultSectionSet = new Set(DEFAULT_SECTIONS);
  const usingDefaultSections =
    normalizedSections.length === DEFAULT_SECTIONS.length &&
    normalizedSections.every((section) => defaultSectionSet.has(section));
  if (!usingDefaultSections) {
    for (const section of normalizedSections) params.append('section', section);
  }

  return params;
}

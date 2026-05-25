import Link from 'next/link';

import {
  type CompleteProjectReportSection,
  type ProjectCostReportFilters,
  PROJECT_COST_SOURCE_TYPES,
} from '@/lib/report-controls';
import { expenseCategoryLabel } from '@/lib/utils';

const sectionLabels: Record<CompleteProjectReportSection, string> = {
  overview: 'Project overview',
  'executive-summary': 'Executive summary',
  'phase-summary': 'Phase summary',
  'phase-details': 'Phase details',
  'daily-project-cost': 'Daily project cost details',
  'buyer-billing': 'Buyer billing and due',
  'supplier-ledger': 'Supplier ledger',
  'subcontractor-ledger': 'Subcontractor ledger',
  'cash-bank': 'Cash / bank',
  cheques: 'Cheque register',
  'tax-retention-service-charge': 'Tax / retention / service charge',
  'final-reconciliation': 'Final reconciliation',
  'audit-summary': 'Audit / missing voucher',
};

const sourceTypeLabels: Record<(typeof PROJECT_COST_SOURCE_TYPES)[number], string> = {
  DIRECT_EXPENSE: 'Direct Expense',
  SUPPLIER_BILL_ITEM: 'Supplier Bill Item',
  SUBCONTRACTOR_PROGRESS_BILL: 'Subcontractor Progress Bill',
  COMPANY_SERVICE_CHARGE: 'Company Service Charge / Supervision Fee',
  ADJUSTMENT: 'Adjustment',
};

export function ReportControlPanel({
  basePath,
  filters,
  phases,
  categories,
  approvalStatuses,
  sections,
}: {
  basePath: string;
  filters: ProjectCostReportFilters;
  phases: Array<{ id: string; name: string; sequence: number }>;
  categories: string[];
  approvalStatuses: string[];
  sections: CompleteProjectReportSection[];
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm print:hidden">
      <div className="flex flex-col gap-2 border-b border-slate-200 pb-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Report Control Engine</div>
          <h2 className="mt-1 text-lg font-semibold tracking-tight text-slate-950">Data filters and section controls</h2>
          <p className="mt-1 text-sm text-slate-600">
            The same filters are used for the on-screen report, print document, CSV, and workbook output.
          </p>
        </div>
        <Link
          href={basePath}
          className="inline-flex items-center justify-center rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Reset filters
        </Link>
      </div>

      <form action={basePath} method="get" className="mt-5 space-y-5">
        <div className="grid gap-4 lg:grid-cols-4">
          <label className="space-y-2 text-sm">
            <span className="font-medium text-slate-800">From date</span>
            <input
              type="date"
              name="from"
              defaultValue={filters.from}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-medium text-slate-800">To date</span>
            <input
              type="date"
              name="to"
              defaultValue={filters.to}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-medium text-slate-800">Party / supplier search</span>
            <input
              type="text"
              name="partySearch"
              defaultValue={filters.partySearch}
              placeholder="Supplier, subcontractor, or note"
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-medium text-slate-800">Voucher status</span>
            <select
              name="voucherStatus"
              defaultValue={filters.voucherStatus}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="all">All voucher states</option>
              <option value="attached">Attached only</option>
              <option value="missing">Missing only</option>
              <option value="not_required">Not required</option>
            </select>
          </label>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Phases</div>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {phases.map((phase) => (
                <label key={phase.id} className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    name="phase"
                    value={phase.id}
                    defaultChecked={filters.phaseIds.includes(phase.id)}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  <span>{phase.name}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Source Types</div>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {PROJECT_COST_SOURCE_TYPES.map((sourceType) => (
                <label key={sourceType} className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    name="sourceType"
                    value={sourceType}
                    defaultChecked={filters.sourceTypes.includes(sourceType)}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  <span>{sourceTypeLabels[sourceType]}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Cost Categories</div>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {categories.length === 0 ? (
                <p className="text-sm text-slate-500">No cost categories found for this project.</p>
              ) : (
                categories.map((category) => (
                  <label key={category} className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      name="category"
                      value={category}
                      defaultChecked={filters.categories.includes(category)}
                      className="h-4 w-4 rounded border-slate-300"
                    />
                    <span>{expenseCategoryLabel(category)}</span>
                  </label>
                ))
              )}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Approval Status</div>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {approvalStatuses.length === 0 ? (
                <p className="text-sm text-slate-500">No approval states found for this project.</p>
              ) : (
                approvalStatuses.map((status) => (
                  <label key={status} className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      name="approvalStatus"
                      value={status}
                      defaultChecked={filters.approvalStatuses.includes(status)}
                      className="h-4 w-4 rounded border-slate-300"
                    />
                    <span>{status.replaceAll('_', ' ')}</span>
                  </label>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
          <div className="rounded-xl border border-slate-200 p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Report Sections</div>
            <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {sections.map((section) => (
                <label key={section} className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    name="section"
                    value={section}
                    defaultChecked={filters.sections.includes(section)}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  <span>{sectionLabels[section]}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Mode</div>
            <div className="mt-3 space-y-3">
              <label className="block space-y-2 text-sm">
                <span className="font-medium text-slate-800">Report version</span>
                <select
                  name="detailMode"
                  defaultValue={filters.detailMode}
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                >
                  <option value="summary">Client Summary</option>
                  <option value="detailed">Management Detailed</option>
                  <option value="audit">Full Audit</option>
                </select>
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  name="includeDraftPending"
                  value="1"
                  defaultChecked={filters.includeDraftPending}
                  className="h-4 w-4 rounded border-slate-300"
                />
                <span>Include draft / pending rows</span>
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  name="includeReversedCancelled"
                  value="1"
                  defaultChecked={filters.includeReversedCancelled}
                  className="h-4 w-4 rounded border-slate-300"
                />
                <span>Include reversed / cancelled rows</span>
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  name="includeEmptySections"
                  value="1"
                  defaultChecked={filters.includeEmptySections}
                  className="h-4 w-4 rounded border-slate-300"
                />
                <span>Include empty sections</span>
              </label>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-slate-200 pt-4">
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Apply report controls
          </button>
          <p className="text-sm text-slate-500">
            Tip: the print route and Excel workbook will honor these section and cost filters.
          </p>
        </div>
      </form>
    </section>
  );
}

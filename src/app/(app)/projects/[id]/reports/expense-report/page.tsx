import { notFound } from 'next/navigation';

import { ReportControlPanel } from '@/components/reports/report-control-panel';
import {
  ReportDocumentLayout,
  ReportKpiCard,
  ReportSection,
  ReportStatusBadge,
  ReportSummaryGrid,
  ReportTable,
} from '@/components/reports/report-document';
import { getScopedProject } from '@/lib/access-control';
import { getCompleteProjectReportData } from '@/lib/complete-project-report';
import {
  buildProjectCostReportSearchParams,
  parseProjectCostReportFilters,
  COMPLETE_PROJECT_REPORT_SECTIONS,
} from '@/lib/report-controls';
import { expenseCategoryLabel, formatBDT, formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

function sourceTypeLabel(value: string) {
  return {
    DIRECT_EXPENSE: 'Direct Expense',
    SUPPLIER_BILL_ITEM: 'Supplier Bill Item',
    SUBCONTRACTOR_BILL: 'Subcontractor Progress Bill',
    SERVICE_CHARGE: 'Service Charge',
    ADJUSTMENT: 'Adjustment',
  }[value] ?? value;
}

function statusTone(value: string) {
  const normalized = value.toUpperCase();
  if (['APPROVED', 'PAID', 'FULLY_PAID', 'CLEARED', 'POSTED', 'SETTLED'].includes(normalized)) return 'positive' as const;
  if (['REVERSED', 'CANCELLED', 'WRITTEN_OFF'].includes(normalized)) return 'negative' as const;
  if (['PENDING', 'PENDING_APPROVAL', 'DRAFT', 'CALCULATED', 'PARTIALLY_PAID', 'ISSUED', 'UNPAID'].includes(normalized)) return 'warning' as const;
  return 'default' as const;
}

export default async function ExpenseReportPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const filters = parseProjectCostReportFilters(searchParams ?? {});
  const { context } = await getScopedProject(params.id, 'reports', 'view');
  const data = await getCompleteProjectReportData(context.companyId, params.id, filters);
  if (!data) notFound();

  const exportQuery = buildProjectCostReportSearchParams(filters).toString();
  const suffix = exportQuery ? `?${exportQuery}` : '';

  return (
    <ReportDocumentLayout
      branding={data.branding}
      project={data.project}
      title="Expense / Project Cost Report"
      subtitle="Unified project cost register covering direct expense, supplier bill items, subcontractor progress bills, service charge, and voucher visibility."
      generatedAt={data.generatedAt}
      backHref={`/projects/${data.project.id}/reports`}
      csvHref={`/api/projects/${data.project.id}/reports/expenses/excel${suffix}`}
    >
      <ReportControlPanel
        basePath={`/projects/${data.project.id}/reports/expense-report`}
        filters={filters}
        phases={data.costReport.phases}
        categories={data.costReport.availableCategories}
        approvalStatuses={data.costReport.availableApprovalStatuses}
        sections={[...COMPLETE_PROJECT_REPORT_SECTIONS]}
      />

      <ReportSummaryGrid>
        <ReportKpiCard label="Direct Expense" value={formatBDT(data.costReport.totals.DIRECT_EXPENSE)} tone="negative" />
        <ReportKpiCard label="Supplier Bill Items" value={formatBDT(data.costReport.totals.SUPPLIER_BILL_ITEM)} tone="negative" />
        <ReportKpiCard label="Subcontractor Bills" value={formatBDT(data.costReport.totals.SUBCONTRACTOR_BILL)} tone="negative" />
        <ReportKpiCard label="Service Charge" value={formatBDT(data.costReport.totals.SERVICE_CHARGE)} tone="info" />
        <ReportKpiCard label="Missing Vouchers" value={String(data.auditSummary.missingVoucher.length)} tone={data.auditSummary.missingVoucher.length > 0 ? 'warning' : 'default'} />
        <ReportKpiCard label="Pending Approval" value={String(data.auditSummary.pendingApprovals.length)} tone={data.auditSummary.pendingApprovals.length > 0 ? 'warning' : 'default'} />
        <ReportKpiCard label="Cost Rows" value={String(data.costReport.rows.length)} />
        <ReportKpiCard label="Total Cost" value={formatBDT(data.costReport.totals.total)} tone="negative" />
      </ReportSummaryGrid>

      <ReportSection title="Unified Project Cost Register" description="All project cost sources share one report path so supplier bill items and subcontractor bills remain visible inside the same daily cost detail.">
        <ReportTable dense>
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <th className="px-3 py-3">Date</th>
              <th className="px-3 py-3">Phase</th>
              <th className="px-3 py-3">Source Type</th>
              <th className="px-3 py-3">Bill / Voucher</th>
              <th className="px-3 py-3">Supplier / Party</th>
              <th className="px-3 py-3">Category</th>
              <th className="px-3 py-3">Description</th>
              <th className="px-3 py-3 text-right">Qty</th>
              <th className="px-3 py-3">Unit</th>
              <th className="px-3 py-3 text-right">Rate</th>
              <th className="px-3 py-3 text-right">Amount</th>
              <th className="px-3 py-3">Voucher</th>
              <th className="px-3 py-3">Approval</th>
            </tr>
          </thead>
          <tbody>
            {data.costReport.rows.map((row) => (
              <tr key={row.id} className="border-b border-slate-200">
                <td className="px-3 py-3 text-slate-700">{formatDate(row.date)}</td>
                <td className="px-3 py-3 text-slate-700">{row.phaseName}</td>
                <td className="px-3 py-3 text-slate-700">{sourceTypeLabel(row.sourceType)}</td>
                <td className="px-3 py-3 text-slate-700">{row.sourceNo}</td>
                <td className="px-3 py-3 text-slate-700">{row.partyName}</td>
                <td className="px-3 py-3 text-slate-700">{expenseCategoryLabel(row.category)}</td>
                <td className="px-3 py-3 text-slate-900">{row.description}</td>
                <td className="px-3 py-3 text-right text-slate-700">{row.quantity ? row.quantity.toLocaleString('en-IN', { maximumFractionDigits: 2 }) : '-'}</td>
                <td className="px-3 py-3 text-slate-700">{row.unit ?? '-'}</td>
                <td className="px-3 py-3 text-right text-slate-700">{row.rate ? formatBDT(row.rate) : '-'}</td>
                <td className="px-3 py-3 text-right text-rose-700">{formatBDT(row.amount)}</td>
                <td className="px-3 py-3">
                  <ReportStatusBadge
                    label={row.voucherStatus.replaceAll('_', ' ')}
                    tone={row.voucherStatus === 'ATTACHED' ? 'positive' : row.voucherStatus === 'MISSING' ? 'warning' : 'default'}
                  />
                </td>
                <td className="px-3 py-3"><ReportStatusBadge label={row.approvalStatus.replaceAll('_', ' ')} tone={statusTone(row.approvalStatus)} /></td>
              </tr>
            ))}
          </tbody>
        </ReportTable>
      </ReportSection>
    </ReportDocumentLayout>
  );
}

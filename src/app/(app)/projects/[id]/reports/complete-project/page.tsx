import { notFound } from 'next/navigation';

import { ReportControlPanel } from '@/components/reports/report-control-panel';
import {
  ReportAmount,
  ReportCoverPage,
  ReportDocumentLayout,
  ReportKpiCard,
  ReportNoteBox,
  ReportPageBreak,
  ReportSection,
  ReportSignatureBlock,
  ReportStatusBadge,
  ReportSummaryGrid,
  ReportTable,
} from '@/components/reports/report-document';
import { getScopedProject } from '@/lib/access-control';
import { getCompleteProjectReportData } from '@/lib/complete-project-report';
import {
  buildProjectCostReportSearchParams,
  COMPLETE_PROJECT_REPORT_SECTIONS,
  hasReportSection,
  parseProjectCostReportFilters,
} from '@/lib/report-controls';
import { expenseCategoryLabel, formatBDT, formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

function amountTone(value: number) {
  if (value > 0) return 'positive' as const;
  if (value < 0) return 'negative' as const;
  return 'default' as const;
}

function statusTone(value: string) {
  const normalized = value.toUpperCase();
  if (['APPROVED', 'PAID', 'FULLY_PAID', 'CLEARED', 'POSTED', 'SETTLED', 'ACTIVE'].includes(normalized)) return 'positive' as const;
  if (['CANCELLED', 'REVERSED', 'BOUNCED', 'REJECTED', 'DISPUTED', 'WRITTEN_OFF'].includes(normalized)) return 'negative' as const;
  if (['PENDING', 'PENDING_APPROVAL', 'DRAFT', 'CALCULATED', 'OPEN', 'UNPAID', 'PARTIALLY_PAID', 'ISSUED'].includes(normalized)) return 'warning' as const;
  return 'default' as const;
}

function sourceTypeLabel(value: string) {
  return {
    DIRECT_EXPENSE: 'Direct Expense',
    SUPPLIER_BILL_ITEM: 'Supplier Bill Item',
    SUBCONTRACTOR_PROGRESS_BILL: 'Subcontractor Progress Bill',
    COMPANY_SERVICE_CHARGE: 'Company Service Charge / Supervision Fee',
    ADJUSTMENT: 'Adjustment',
  }[value] ?? value;
}

export default async function CompleteProjectReportPage({
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
  const reportSubtitle =
    'Professional management and audit report covering project cost, billing, treasury, vendor ledgers, compliance, and document quality.';
  const taxRows = [...data.supplierSummary, ...data.subcontractorSummary].filter(
    (payable) =>
      Number(payable.vatAmount ?? 0) > 0 ||
      Number(payable.aitTdsAmount ?? 0) > 0 ||
      Number(payable.otherDeductionAmount ?? 0) > 0,
  );
  const retentionRows = [...data.supplierSummary, ...data.subcontractorSummary].filter(
    (payable) => Number(payable.retentionAmount ?? 0) > 0,
  );
  const projectOverviewRows = [
    ['Project code', data.project.code || 'Not assigned'],
    ['Project address', data.project.address || 'Project address not recorded'],
    ['Reporting period', data.reportingPeriod],
    ['Report mode', filters.detailMode.replace(/^\w/, (char) => char.toUpperCase())],
    ['Visible sections', `${filters.sections.length}`],
    ['Cost rows in this slice', `${data.costReport.rows.length} of ${data.costReport.allRowsCount}`],
  ];

  return (
    <ReportDocumentLayout
      branding={data.branding}
      project={data.project}
      title="Complete Project Report"
      subtitle={reportSubtitle}
      generatedAt={data.generatedAt}
      backHref={`/projects/${data.project.id}/reports`}
      printHref={`/projects/${data.project.id}/reports/complete-project/print${suffix}`}
      workbookHref={`/api/projects/${data.project.id}/reports/complete-project/xlsx${suffix}`}
      csvHref={`/api/projects/${data.project.id}/reports/complete-project/excel${suffix}`}
      showHeader={false}
    >
      <ReportControlPanel
        basePath={`/projects/${data.project.id}/reports/complete-project`}
        filters={filters}
        phases={data.costReport.phases}
        categories={data.costReport.availableCategories}
        approvalStatuses={data.costReport.availableApprovalStatuses}
        sections={[...COMPLETE_PROJECT_REPORT_SECTIONS]}
      />

      <ReportCoverPage
        branding={data.branding}
        project={data.project}
        title="Complete Project Report"
        reportingPeriod={data.reportingPeriod}
        generatedAt={data.generatedAt}
        generatedBy={(context.session?.user as { name?: string } | undefined)?.name ?? context.userId}
        note="This report uses one unified project cost builder for screen and workbook output. Supplier bill items and subcontractor progress bills now flow into phase cost detail instead of living in disconnected report silos."
      />

      <ReportPageBreak />

      {data.reportNotes.length > 0 ? (
        <ReportNoteBox title="Data quality and interpretation note" tone="info">
          <ul className="space-y-2">
            {data.reportNotes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </ReportNoteBox>
      ) : null}

      {hasReportSection(filters, 'overview') ? (
        <ReportSection
          title="Complete Project Overview"
          description="Project identity, reporting slice, seeded finance continuity, and report-control context."
        >
          <ReportSummaryGrid>
            <ReportKpiCard label="Units" value={String(data.unitSummary.length)} />
            <ReportKpiCard label="Buyers" value={String(data.buyerBillingSummary.length)} />
            <ReportKpiCard label="Phases" value={String(data.phaseSummary.length)} />
            <ReportKpiCard label="Vendors / Contractors" value={String(data.projectSupplierAssignments.length + data.projectSubcontractorAssignments.length)} />
          </ReportSummaryGrid>
          <ReportTable>
            <tbody>
              {projectOverviewRows.map(([label, value]) => (
                <tr key={label} className="border-b border-slate-200">
                  <td className="px-4 py-3 w-[220px] font-medium text-slate-900">{label}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{value}</td>
                </tr>
              ))}
              <tr className="border-b border-slate-200">
                <td className="px-4 py-3 font-medium text-slate-900">Historical Top Sheet continuity</td>
                <td className="px-4 py-3 text-sm text-slate-600">
                  Income {formatBDT(data.summary.totalCollected)} | Expense {formatBDT(data.summary.totalExpense)} | Balance {formatBDT(data.summary.projectBalance)}
                </td>
              </tr>
            </tbody>
          </ReportTable>
        </ReportSection>
      ) : null}

      {hasReportSection(filters, 'executive-summary') ? (
        <ReportSection
          title="Executive Financial Summary"
          description="Compact view of project demand, collections, unified cost, payables, treasury, reconciliation, and audit exposure."
        >
          <ReportSummaryGrid>
            <ReportKpiCard
              label="Historical Collection"
              value={formatBDT(data.summary.totalCollected)}
              caption={data.summary.historicalCollectionsWithoutDemand ? 'Imported historical collection exists without issued system demand rows.' : 'All approved project collections to date.'}
              tone="positive"
            />
            <ReportKpiCard
              label="Issued Demand"
              value={formatBDT(data.summary.issuedDemand)}
              caption={data.summary.issuedDemand > 0 ? `${formatBDT(data.summary.finalReconciliationDemand)} final reconciliation demand` : 'No issued demand found in the current project ledger.'}
              tone={data.summary.issuedDemand > 0 ? 'info' : 'warning'}
            />
            <ReportKpiCard
              label="Allocated Collection"
              value={formatBDT(data.summary.allocatedCollection)}
              caption={`${formatBDT(data.summary.unallocatedCollection)} currently unallocated / advance`}
              tone="info"
            />
            <ReportKpiCard
              label="Buyer Due"
              value={formatBDT(data.summary.buyerReceivable)}
              caption={`${formatBDT(data.summary.buyerAdvance)} buyer advance / unallocated balance`}
              tone={data.summary.buyerReceivable > 0 ? 'negative' : 'default'}
            />
            <ReportKpiCard label="Direct Expense" value={formatBDT(data.costReport.totals.DIRECT_EXPENSE)} tone="negative" />
            <ReportKpiCard label="Supplier Bill Items" value={formatBDT(data.costReport.totals.SUPPLIER_BILL_ITEM)} tone="negative" />
            <ReportKpiCard label="Subcontractor Bills" value={formatBDT(data.costReport.totals.SUBCONTRACTOR_PROGRESS_BILL)} tone="negative" />
            <ReportKpiCard label="Service Charge" value={formatBDT(data.costReport.totals.COMPANY_SERVICE_CHARGE)} tone="info" />
            <ReportKpiCard label="Unified Cost Total" value={formatBDT(data.costReport.totals.total)} caption="Current report slice from the unified project cost engine." tone="negative" />
            <ReportKpiCard label="Supplier Payable" value={formatBDT(data.summary.supplierPayable)} tone={data.summary.supplierPayable > 0 ? 'negative' : 'default'} />
            <ReportKpiCard label="Subcontractor Payable" value={formatBDT(data.summary.subcontractorPayable)} tone={data.summary.subcontractorPayable > 0 ? 'negative' : 'default'} />
            <ReportKpiCard label="Cash In" value={formatBDT(data.summary.cashIn)} caption={`${formatBDT(data.summary.cashOut)} cash out`} tone="positive" />
            <ReportKpiCard label="Project Balance" value={formatBDT(data.summary.projectBalance)} caption={`${formatBDT(data.summary.finalSurplusDeficit)} after service charge`} tone={data.summary.projectBalance >= 0 ? 'positive' : 'negative'} />
            <ReportKpiCard label="Missing Vouchers" value={String(data.auditSummary.missingVoucher.length)} caption={`${data.auditSummary.pendingApprovals.length} pending approvals`} tone={data.auditSummary.missingVoucher.length > 0 ? 'warning' : 'default'} />
            <ReportKpiCard label="Pending Approvals" value={String(data.auditSummary.pendingApprovals.length)} tone={data.auditSummary.pendingApprovals.length > 0 ? 'warning' : 'default'} />
            <ReportKpiCard
              label="Final Reconciliation"
              value={data.reconciliationPreview?.posted ? 'Posted' : 'Preview'}
              caption={
                data.reconciliationPreview?.posted
                  ? `${data.reconciliationPreview.posted.type.replaceAll('_', ' ')} ${formatBDT(Number(data.reconciliationPreview.posted.finalAmount))}`
                  : data.reconciliationPreview?.recommendation ?? 'Final reconciliation not available.'
              }
              tone={data.reconciliationPreview?.posted ? 'positive' : 'warning'}
            />
          </ReportSummaryGrid>

          <ReportTable>
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Metric</th>
                <th className="px-4 py-3 text-right">BDT</th>
                <th className="px-4 py-3">Interpretation</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-200">
                <td className="px-4 py-3 font-medium text-slate-900">Historical collection</td>
                <td className="px-4 py-3 text-right"><ReportAmount value={formatBDT(data.summary.totalCollected)} tone="positive" /></td>
                <td className="px-4 py-3 text-sm text-slate-600">Approved buyer receipts recorded for the project.</td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="px-4 py-3 font-medium text-slate-900">Regular issued demand</td>
                <td className="px-4 py-3 text-right"><ReportAmount value={formatBDT(data.summary.issuedDemand)} tone={data.summary.issuedDemand > 0 ? 'default' : 'muted'} /></td>
                <td className="px-4 py-3 text-sm text-slate-600">{data.summary.issuedDemand > 0 ? 'Demand notices issued through the system billing flow.' : 'No regular issued demand rows found in the live project ledger.'}</td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="px-4 py-3 font-medium text-slate-900">Final reconciliation demand</td>
                <td className="px-4 py-3 text-right"><ReportAmount value={formatBDT(data.summary.finalReconciliationDemand)} tone="default" /></td>
                <td className="px-4 py-3 text-sm text-slate-600">System-generated demand created only from posted final reconciliation.</td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="px-4 py-3 font-medium text-slate-900">Allocated collection</td>
                <td className="px-4 py-3 text-right"><ReportAmount value={formatBDT(data.summary.allocatedCollection)} tone="positive" /></td>
                <td className="px-4 py-3 text-sm text-slate-600">Portion of collection tied to demand rows through FIFO or legacy demand linkage.</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium text-slate-900">Unallocated / advance collection</td>
                <td className="px-4 py-3 text-right"><ReportAmount value={formatBDT(data.summary.unallocatedCollection)} tone={data.summary.unallocatedCollection > 0 ? 'warning' : 'default'} /></td>
                <td className="px-4 py-3 text-sm text-slate-600">Receipts that currently sit outside issued-demand allocation. In Relax Tower seed, this is primarily imported historical collection.</td>
              </tr>
            </tbody>
          </ReportTable>
        </ReportSection>
      ) : null}

      {hasReportSection(filters, 'phase-summary') ? (
        <ReportSection title="Phase Summary" description="Phase-wise collection, cost composition, service charge, voucher quality, and carry-forward visibility.">
          <ReportTable dense>
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-3 py-3">Phase</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3 text-right">Collection</th>
                <th className="px-3 py-3 text-right">Direct Expense</th>
                <th className="px-3 py-3 text-right">Supplier Items</th>
                <th className="px-3 py-3 text-right">Subcontractor Bills</th>
                <th className="px-3 py-3 text-right">Service Charge</th>
                <th className="px-3 py-3 text-right">Total Billable Cost</th>
                <th className="px-3 py-3 text-right">Surplus / Deficit</th>
                <th className="px-3 py-3 text-right">Missing Vouchers</th>
                <th className="px-3 py-3">Audit</th>
              </tr>
            </thead>
            <tbody>
              {data.phaseSummary.map((row) => {
                const costGroup = data.costReport.phaseGroups.find((group) => group.phaseId === row.phaseId);
                return (
                  <tr key={row.phaseId} className="border-b border-slate-200">
                    <td className="px-3 py-3 font-medium text-slate-900">{row.phaseName}</td>
                    <td className="px-3 py-3"><ReportStatusBadge label={row.status.replaceAll('_', ' ')} tone={statusTone(row.status)} /></td>
                    <td className="px-3 py-3 text-right"><ReportAmount value={formatBDT(row.collection)} tone="positive" /></td>
                    <td className="px-3 py-3 text-right"><ReportAmount value={formatBDT(row.directExpense)} tone="negative" /></td>
                    <td className="px-3 py-3 text-right"><ReportAmount value={formatBDT(row.supplierBillItemTotal)} tone="negative" /></td>
                    <td className="px-3 py-3 text-right"><ReportAmount value={formatBDT(row.subcontractorBillItemTotal)} tone="negative" /></td>
                    <td className="px-3 py-3 text-right"><ReportAmount value={formatBDT(row.serviceChargeCostTotal)} tone="info" /></td>
                    <td className="px-3 py-3 text-right"><ReportAmount value={formatBDT(row.totalBillablePhaseCost)} tone="negative" /></td>
                    <td className="px-3 py-3 text-right"><ReportAmount value={formatBDT(row.collection - row.totalBillablePhaseCost)} tone={amountTone(row.collection - row.totalBillablePhaseCost)} /></td>
                    <td className="px-3 py-3 text-right text-slate-700">{costGroup?.voucherMissingCount ?? 0}</td>
                    <td className="px-3 py-3">{row.auditLocked ? <ReportStatusBadge label="Locked" tone="positive" /> : <ReportStatusBadge label="Open" tone="warning" />}</td>
                  </tr>
                );
              })}
            </tbody>
          </ReportTable>
        </ReportSection>
      ) : null}

      {hasReportSection(filters, 'phase-details') ? (
        <ReportSection
          title="Phase Detail Sections"
          description="Each phase combines collection, category breakdown, and daily project cost details from the same unified builder."
        >
          <div className="space-y-8">
            {data.costReport.phaseGroups.map((group, index) => {
              const phaseRow = data.phaseSummary.find((row) => row.phaseId === group.phaseId);
              return (
                <section key={group.phaseId ?? `project-general-${index}`} className="space-y-4">
                  {index > 0 ? <ReportPageBreak /> : null}
                  <div className="flex flex-col gap-3 border-b border-slate-200 pb-3 md:flex-row md:items-end md:justify-between">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Phase Detail</div>
                      <h3 className="mt-1 text-xl font-semibold tracking-tight text-slate-950">{group.phaseName}</h3>
                    </div>
                    <div className="text-sm text-slate-600">
                      {phaseRow ? (
                        <>
                          Collection {formatBDT(phaseRow.collection)} | Phase balance {formatBDT(phaseRow.phaseBalance)}
                        </>
                      ) : (
                        'Project-level general cost rows'
                      )}
                    </div>
                  </div>

                  <ReportSummaryGrid>
                    <ReportKpiCard label="Direct Expense" value={formatBDT(group.totals.DIRECT_EXPENSE)} tone="negative" />
                    <ReportKpiCard label="Supplier Bill Items" value={formatBDT(group.totals.SUPPLIER_BILL_ITEM)} tone="negative" />
                    <ReportKpiCard label="Subcontractor Bills" value={formatBDT(group.totals.SUBCONTRACTOR_PROGRESS_BILL)} tone="negative" />
                    <ReportKpiCard label="Service Charge" value={formatBDT(group.totals.COMPANY_SERVICE_CHARGE)} tone="info" />
                    <ReportKpiCard label="Total Billable Cost" value={formatBDT(group.totalCost)} tone="negative" />
                    <ReportKpiCard label="Voucher Gaps" value={String(group.voucherMissingCount)} tone={group.voucherMissingCount > 0 ? 'warning' : 'default'} />
                    <ReportKpiCard label="Pending Rows" value={String(group.pendingCount)} tone={group.pendingCount > 0 ? 'warning' : 'default'} />
                    <ReportKpiCard label="Phase Surplus / Deficit" value={formatBDT((phaseRow?.collection ?? 0) - group.totalCost)} tone={amountTone((phaseRow?.collection ?? 0) - group.totalCost)} />
                  </ReportSummaryGrid>

                  <ReportTable dense>
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        <th className="px-3 py-3">Category</th>
                        <th className="px-3 py-3 text-right">Rows</th>
                        <th className="px-3 py-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.categoryBreakdown.map((categoryRow) => (
                        <tr key={`${group.phaseId ?? 'project'}-${categoryRow.category}`} className="border-b border-slate-200">
                          <td className="px-3 py-3 font-medium text-slate-900">{expenseCategoryLabel(categoryRow.category)}</td>
                          <td className="px-3 py-3 text-right text-slate-700">{categoryRow.rowCount}</td>
                          <td className="px-3 py-3 text-right"><ReportAmount value={formatBDT(categoryRow.amount)} tone="negative" /></td>
                        </tr>
                      ))}
                    </tbody>
                  </ReportTable>

                  <ReportTable dense>
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        <th className="px-3 py-3">Date</th>
                        <th className="px-3 py-3">Source Type</th>
                        <th className="px-3 py-3">Bill / Voucher</th>
                        <th className="px-3 py-3">Supplier / Party</th>
                        <th className="px-3 py-3">Description</th>
                        <th className="px-3 py-3 text-right">Qty</th>
                        <th className="px-3 py-3">Unit</th>
                        <th className="px-3 py-3 text-right">Rate</th>
                        <th className="px-3 py-3 text-right">Amount</th>
                        <th className="px-3 py-3">Method</th>
                        <th className="px-3 py-3">Voucher</th>
                        <th className="px-3 py-3">Approval</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.rows.map((row) => (
                        <tr key={row.id} className="border-b border-slate-200">
                          <td className="px-3 py-3 text-slate-700">{formatDate(row.date)}</td>
                          <td className="px-3 py-3 text-slate-700">{sourceTypeLabel(row.sourceType)}</td>
                          <td className="px-3 py-3 text-slate-700">{row.sourceNo}</td>
                          <td className="px-3 py-3 text-slate-700">{row.partyName}</td>
                          <td className="px-3 py-3 text-slate-900">{row.description}</td>
                          <td className="px-3 py-3 text-right text-slate-700">{row.quantity ? row.quantity.toLocaleString('en-IN', { maximumFractionDigits: 2 }) : '-'}</td>
                          <td className="px-3 py-3 text-slate-700">{row.unit ?? '-'}</td>
                          <td className="px-3 py-3 text-right text-slate-700">{row.rate ? formatBDT(row.rate) : '-'}</td>
                          <td className="px-3 py-3 text-right"><ReportAmount value={formatBDT(row.amount)} tone="negative" /></td>
                          <td className="px-3 py-3 text-slate-700">{row.paymentMethod}</td>
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
                </section>
              );
            })}
          </div>
        </ReportSection>
      ) : null}

      {hasReportSection(filters, 'daily-project-cost') ? (
        <ReportSection
          title="Daily Project Cost Details"
          description="Consolidated project cost register showing direct expense, supplier bill items, subcontractor progress bills, and service charge rows line by line."
        >
          <ReportTable dense>
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-3 py-3">Date</th>
                <th className="px-3 py-3">Phase</th>
                <th className="px-3 py-3">Source Type</th>
                <th className="px-3 py-3">Bill / Voucher</th>
                <th className="px-3 py-3">Party</th>
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
                  <td className="px-3 py-3 text-right"><ReportAmount value={formatBDT(row.amount)} tone="negative" /></td>
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
      ) : null}

      {hasReportSection(filters, 'buyer-billing') ? (
        <ReportSection title="Buyer Billing & Due" description="Buyer-level billing, collection, due, and advance position, separated from historical imported receipts where needed.">
          <ReportTable dense>
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-3 py-3">Buyer</th>
                <th className="px-3 py-3">Units</th>
                <th className="px-3 py-3 text-right">Ownership Share</th>
                <th className="px-3 py-3 text-right">Issued Demand</th>
                <th className="px-3 py-3 text-right">Final Reconciliation</th>
                <th className="px-3 py-3 text-right">Collection</th>
                <th className="px-3 py-3 text-right">Allocated</th>
                <th className="px-3 py-3 text-right">Due</th>
                <th className="px-3 py-3 text-right">Advance / Credit</th>
              </tr>
            </thead>
            <tbody>
              {data.buyerBillingSummary.map((row) => (
                <tr key={row.buyerId} className="border-b border-slate-200">
                  <td className="px-3 py-3 font-medium text-slate-900">{row.buyerName}</td>
                  <td className="px-3 py-3 text-slate-700">{row.unitsText || '-'}</td>
                  <td className="px-3 py-3 text-right text-slate-700">{row.ownershipShare.toFixed(2)}%</td>
                  <td className="px-3 py-3 text-right"><ReportAmount value={formatBDT(row.regularDemanded)} tone={row.regularDemanded > 0 ? 'default' : 'muted'} /></td>
                  <td className="px-3 py-3 text-right"><ReportAmount value={formatBDT(row.finalReconciliationDemand)} tone="default" /></td>
                  <td className="px-3 py-3 text-right"><ReportAmount value={formatBDT(row.collected)} tone="positive" /></td>
                  <td className="px-3 py-3 text-right"><ReportAmount value={formatBDT(row.allocated)} tone="positive" /></td>
                  <td className="px-3 py-3 text-right"><ReportAmount value={formatBDT(row.due)} tone={row.due > 0 ? 'negative' : 'default'} /></td>
                  <td className="px-3 py-3 text-right"><ReportAmount value={formatBDT(row.advance)} tone={row.advance > 0 ? 'warning' : 'default'} /></td>
                </tr>
              ))}
            </tbody>
          </ReportTable>
        </ReportSection>
      ) : null}

      {hasReportSection(filters, 'supplier-ledger') ? (
        <ReportSection title="Supplier Ledger Summary" description="Assigned supplier contracts, billed value, paid amount, due, and invoice/document quality.">
          <ReportTable dense>
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-3 py-3">Supplier</th>
                <th className="px-3 py-3">Assignment / Contract</th>
                <th className="px-3 py-3 text-right">Bill Total</th>
                <th className="px-3 py-3 text-right">Paid</th>
                <th className="px-3 py-3 text-right">Payable</th>
                <th className="px-3 py-3 text-right">Missing Invoice Bills</th>
                <th className="px-3 py-3 text-right">Document Count</th>
              </tr>
            </thead>
            <tbody>
              {data.projectSupplierAssignments.map((assignment) => (
                <tr key={assignment.id} className="border-b border-slate-200">
                  <td className="px-3 py-3 font-medium text-slate-900">{assignment.supplier.name}</td>
                  <td className="px-3 py-3 text-slate-700">{assignment.materialCategory || assignment.paymentTerms || 'General supplier assignment'}</td>
                  <td className="px-3 py-3 text-right"><ReportAmount value={formatBDT(assignment.summary.totalBilled)} tone="negative" /></td>
                  <td className="px-3 py-3 text-right"><ReportAmount value={formatBDT(assignment.summary.totalPaid)} tone="positive" /></td>
                  <td className="px-3 py-3 text-right"><ReportAmount value={formatBDT(assignment.summary.totalDue)} tone={assignment.summary.totalDue > 0 ? 'negative' : 'default'} /></td>
                  <td className="px-3 py-3 text-right text-slate-700">{assignment.summary.missingInvoiceCount}</td>
                  <td className="px-3 py-3 text-right text-slate-700">{assignment.summary.documentCount}</td>
                </tr>
              ))}
            </tbody>
          </ReportTable>
        </ReportSection>
      ) : null}

      {hasReportSection(filters, 'subcontractor-ledger') ? (
        <ReportSection title="Subcontractor Ledger Summary" description="Work-package level billed cost, due position, retention exposure, and measurement/agreement document quality.">
          <ReportTable dense>
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-3 py-3">Subcontractor</th>
                <th className="px-3 py-3">Work Type</th>
                <th className="px-3 py-3 text-right">Contract Amount</th>
                <th className="px-3 py-3 text-right">Bill Total</th>
                <th className="px-3 py-3 text-right">Paid</th>
                <th className="px-3 py-3 text-right">Due</th>
                <th className="px-3 py-3 text-right">Retention</th>
                <th className="px-3 py-3">Measurement / Agreement</th>
              </tr>
            </thead>
            <tbody>
              {data.projectSubcontractorAssignments.map((assignment) => (
                <tr key={assignment.id} className="border-b border-slate-200">
                  <td className="px-3 py-3 font-medium text-slate-900">{assignment.supplier.name}</td>
                  <td className="px-3 py-3 text-slate-700">{assignment.workType.replaceAll('_', ' ')}</td>
                  <td className="px-3 py-3 text-right"><ReportAmount value={formatBDT(Number(assignment.contractAmount ?? 0) + Number(assignment.extraWorkAmount ?? 0))} /></td>
                  <td className="px-3 py-3 text-right"><ReportAmount value={formatBDT(assignment.summary.totalBilled)} tone="negative" /></td>
                  <td className="px-3 py-3 text-right"><ReportAmount value={formatBDT(assignment.summary.totalPaid)} tone="positive" /></td>
                  <td className="px-3 py-3 text-right"><ReportAmount value={formatBDT(assignment.summary.totalDue)} tone={assignment.summary.totalDue > 0 ? 'negative' : 'default'} /></td>
                  <td className="px-3 py-3 text-right"><ReportAmount value={formatBDT(assignment.payables.reduce((sum, payable) => sum + Number(payable.retentionAmount ?? 0), 0))} tone="info" /></td>
                  <td className="px-3 py-3">
                    {assignment.summary.missingAgreement || assignment.summary.missingMeasurement ? (
                      <ReportStatusBadge label="Review docs" tone="warning" />
                    ) : (
                      <ReportStatusBadge label="Ready" tone="positive" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </ReportTable>
        </ReportSection>
      ) : null}

      {hasReportSection(filters, 'cash-bank') ? (
        <ReportSection title="Cash / Bank / Treasury Summary" description="Account-wise treasury movement posted from collections, expenses, vendor payments, and any legacy separate service-charge settlements.">
          <ReportSummaryGrid>
            <ReportKpiCard label="Cash In" value={formatBDT(data.cashBankSummary?.totals.inflow ?? 0)} tone="positive" />
            <ReportKpiCard label="Cash Out" value={formatBDT(data.cashBankSummary?.totals.outflow ?? 0)} tone="negative" />
            <ReportKpiCard label="Net Movement" value={formatBDT(data.cashBankSummary?.totals.netMovement ?? 0)} tone={(data.cashBankSummary?.totals.netMovement ?? 0) >= 0 ? 'positive' : 'negative'} />
            <ReportKpiCard label="Pending Cheques" value={formatBDT((data.cashBankSummary?.totals.pendingReceivedCheques ?? 0) + (data.cashBankSummary?.totals.pendingIssuedCheques ?? 0))} tone="warning" />
          </ReportSummaryGrid>
          <ReportTable dense>
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-3 py-3">Account</th>
                <th className="px-3 py-3">Type</th>
                <th className="px-3 py-3 text-right">Opening</th>
                <th className="px-3 py-3 text-right">Cash In</th>
                <th className="px-3 py-3 text-right">Cash Out</th>
                <th className="px-3 py-3 text-right">Balance</th>
              </tr>
            </thead>
            <tbody>
              {(data.cashBankSummary?.accountsUsed ?? []).map((account) => (
                <tr key={account.accountId} className="border-b border-slate-200">
                  <td className="px-3 py-3 font-medium text-slate-900">{account.accountName}</td>
                  <td className="px-3 py-3 text-slate-700">{account.type.replaceAll('_', ' ')}</td>
                  <td className="px-3 py-3 text-right"><ReportAmount value={formatBDT(account.openingBalance)} tone="muted" /></td>
                  <td className="px-3 py-3 text-right"><ReportAmount value={formatBDT(account.inflow)} tone="positive" /></td>
                  <td className="px-3 py-3 text-right"><ReportAmount value={formatBDT(account.outflow)} tone="negative" /></td>
                  <td className="px-3 py-3 text-right"><ReportAmount value={formatBDT(account.balance)} tone={amountTone(account.balance)} /></td>
                </tr>
              ))}
            </tbody>
          </ReportTable>
        </ReportSection>
      ) : null}

      {hasReportSection(filters, 'cheques') ? (
        <ReportSection title="Cheque Register Summary" description="Issued and received cheques by party, current status, and linked treasury source.">
          <ReportTable dense>
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-3 py-3">Cheque No</th>
                <th className="px-3 py-3">Type</th>
                <th className="px-3 py-3">Party</th>
                <th className="px-3 py-3">Date</th>
                <th className="px-3 py-3 text-right">Amount</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Linked Transaction</th>
              </tr>
            </thead>
            <tbody>
              {data.chequeSummary.cheques.map((cheque) => (
                <tr key={cheque.id} className="border-b border-slate-200">
                  <td className="px-3 py-3 font-medium text-slate-900">
                    {cheque.chequeNo}
                    <div className="text-[11px] text-slate-500">{cheque.bankName}</div>
                  </td>
                  <td className="px-3 py-3 text-slate-700">{cheque.chequeType.replaceAll('_', ' ')}</td>
                  <td className="px-3 py-3 text-slate-700">{cheque.partyName ?? cheque.partyType}</td>
                  <td className="px-3 py-3 text-slate-700">{formatDate(cheque.chequeDate)}</td>
                  <td className="px-3 py-3 text-right"><ReportAmount value={formatBDT(Number(cheque.amount))} /></td>
                  <td className="px-3 py-3"><ReportStatusBadge label={cheque.status.replaceAll('_', ' ')} tone={statusTone(cheque.status)} /></td>
                  <td className="px-3 py-3 text-slate-700">{cheque.sourceType.replaceAll('_', ' ')}</td>
                </tr>
              ))}
            </tbody>
          </ReportTable>
        </ReportSection>
      ) : null}

      {hasReportSection(filters, 'tax-retention-service-charge') ? (
        <>
          <ReportSection title="Tax / Deduction Summary" description="Bill-level VAT, AIT/TDS, and other deduction visibility for compliance review.">
            <ReportTable dense>
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-3 py-3">Party</th>
                  <th className="px-3 py-3">Bill</th>
                  <th className="px-3 py-3">Reference</th>
                  <th className="px-3 py-3 text-right">VAT</th>
                  <th className="px-3 py-3 text-right">AIT / TDS</th>
                  <th className="px-3 py-3 text-right">Other</th>
                </tr>
              </thead>
              <tbody>
                {taxRows.length === 0 ? (
                  <tr>
                    <td className="px-3 py-8 text-center text-sm text-slate-500" colSpan={6}>No tax or deduction rows found for this report slice.</td>
                  </tr>
                ) : (
                  taxRows.map((payable) => (
                    <tr key={payable.id} className="border-b border-slate-200">
                      <td className="px-3 py-3 font-medium text-slate-900">{payable.supplier.name}</td>
                      <td className="px-3 py-3 text-slate-700">{payable.billNo ?? 'Project bill'}</td>
                      <td className="px-3 py-3 text-slate-700">{payable.deductionReference ?? '-'}</td>
                      <td className="px-3 py-3 text-right"><ReportAmount value={formatBDT(Number(payable.vatAmount ?? 0))} /></td>
                      <td className="px-3 py-3 text-right"><ReportAmount value={formatBDT(Number(payable.aitTdsAmount ?? 0))} /></td>
                      <td className="px-3 py-3 text-right"><ReportAmount value={formatBDT(Number(payable.otherDeductionAmount ?? 0))} /></td>
                    </tr>
                  ))
                )}
              </tbody>
            </ReportTable>
          </ReportSection>

          <ReportSection title="Retention Summary" description="Retention held, released, and outstanding across supplier and subcontractor bills.">
            <ReportTable dense>
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-3 py-3">Party</th>
                  <th className="px-3 py-3">Bill</th>
                  <th className="px-3 py-3 text-right">Held</th>
                  <th className="px-3 py-3 text-right">Released</th>
                  <th className="px-3 py-3 text-right">Balance</th>
                  <th className="px-3 py-3">Release Date / Status</th>
                </tr>
              </thead>
              <tbody>
                {retentionRows.length === 0 ? (
                  <tr>
                    <td className="px-3 py-8 text-center text-sm text-slate-500" colSpan={6}>No retention rows found for this report slice.</td>
                  </tr>
                ) : (
                  retentionRows.map((payable) => (
                    <tr key={payable.id} className="border-b border-slate-200">
                      <td className="px-3 py-3 font-medium text-slate-900">{payable.supplier.name}</td>
                      <td className="px-3 py-3 text-slate-700">{payable.billNo ?? 'Project bill'}</td>
                      <td className="px-3 py-3 text-right"><ReportAmount value={formatBDT(Number(payable.retentionAmount ?? 0))} /></td>
                      <td className="px-3 py-3 text-right"><ReportAmount value={formatBDT(Number(payable.retentionReleasedAmount ?? 0))} tone="positive" /></td>
                      <td className="px-3 py-3 text-right"><ReportAmount value={formatBDT(Math.max(Number(payable.retentionAmount ?? 0) - Number(payable.retentionReleasedAmount ?? 0), 0))} tone="negative" /></td>
                      <td className="px-3 py-3 text-slate-700">{formatDate(payable.retentionReleaseDate)} / {payable.retentionStatus.replaceAll('_', ' ')}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </ReportTable>
          </ReportSection>

          <ReportSection title="Service Charge Summary" description="Phase-level service charge basis, demand billing progress, collection progress, and legacy separate settlement visibility.">
            <ReportTable dense>
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-3 py-3">Phase / Work</th>
                  <th className="px-3 py-3 text-right">Construction Cost</th>
                  <th className="px-3 py-3 text-right">Percent</th>
                  <th className="px-3 py-3 text-right">Calculated</th>
                  <th className="px-3 py-3 text-right">Billed</th>
                  <th className="px-3 py-3 text-right">Collected</th>
                  <th className="px-3 py-3 text-right">Uncollected</th>
                  <th className="px-3 py-3">Flow Note</th>
                </tr>
              </thead>
              <tbody>
                {(data.serviceChargeLedger?.rows ?? []).map((row) => (
                  <tr key={`${row.phaseId ?? 'project'}-${row.entryId ?? row.phaseName}`} className="border-b border-slate-200">
                    <td className="px-3 py-3 font-medium text-slate-900">{row.phaseName}</td>
                    <td className="px-3 py-3 text-right"><ReportAmount value={formatBDT(row.basisAmount)} /></td>
                    <td className="px-3 py-3 text-right text-slate-700">{Number(row.percentage ?? 0).toFixed(2)}%</td>
                    <td className="px-3 py-3 text-right"><ReportAmount value={formatBDT(row.serviceChargeAmount)} tone="info" /></td>
                    <td className="px-3 py-3 text-right"><ReportAmount value={formatBDT(row.billedAmount)} tone="default" /></td>
                    <td className="px-3 py-3 text-right"><ReportAmount value={formatBDT(row.collectedAmount)} tone="positive" /></td>
                    <td className="px-3 py-3 text-right"><ReportAmount value={formatBDT(row.uncollectedAmount)} tone={amountTone(row.uncollectedAmount)} /></td>
                    <td className="px-3 py-3">
                      {row.includedInDemand ? (
                        <ReportStatusBadge label="Demand-linked" tone="positive" />
                      ) : row.settlementStatus === 'SETTLED' ? (
                        <ReportStatusBadge label="Legacy separate settlement" tone="warning" />
                      ) : (
                        <ReportStatusBadge label={row.settlementStatus.replaceAll('_', ' ')} tone={statusTone(row.settlementStatus)} />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </ReportTable>
          </ReportSection>
        </>
      ) : null}

      {hasReportSection(filters, 'final-reconciliation') ? (
        <ReportSection title="Final Reconciliation Summary" description="Ownership-based preview or posted distribution of final surplus / deficit.">
          <ReportSummaryGrid>
            <ReportKpiCard label="Project Balance" value={formatBDT(data.reconciliationPreview?.summary.projectBalance ?? 0)} tone={(data.reconciliationPreview?.summary.projectBalance ?? 0) >= 0 ? 'positive' : 'negative'} />
            <ReportKpiCard label="Service Charge" value={formatBDT(data.reconciliationPreview?.summary.serviceChargeAccrued ?? 0)} tone="info" />
            <ReportKpiCard label="Retention Held" value={formatBDT(data.reconciliationPreview?.summary.retentionHeld ?? 0)} tone="info" />
            <ReportKpiCard label="Final Result" value={formatBDT(data.reconciliationPreview?.finalSurplusDeficit ?? 0)} tone={(data.reconciliationPreview?.finalSurplusDeficit ?? 0) >= 0 ? 'positive' : 'negative'} />
          </ReportSummaryGrid>
          {data.reconciliationPreview ? (
            <>
              <ReportNoteBox title="Reconciliation status" tone={data.reconciliationPreview.posted ? 'info' : 'warning'}>
                {data.reconciliationPreview.posted
                  ? `Posted reconciliation: ${data.reconciliationPreview.posted.type.replaceAll('_', ' ')} for ${formatBDT(Number(data.reconciliationPreview.posted.finalAmount))}. Generated demand rows: ${data.reconciliationPreview.posted.demands.length}.`
                  : 'Preview only. Post final reconciliation from the finance page after management review.'}
              </ReportNoteBox>
              <ReportTable dense>
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-3 py-3">Buyer</th>
                    <th className="px-3 py-3">Units</th>
                    <th className="px-3 py-3 text-right">Share %</th>
                    <th className="px-3 py-3 text-right">{data.reconciliationPreview.direction === 'SURPLUS' ? 'Refund / Adjust' : 'Collect'}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.reconciliationPreview.distribution.map((row) => (
                    <tr key={row.buyerId} className="border-b border-slate-200">
                      <td className="px-3 py-3 font-medium text-slate-900">{row.buyerName}</td>
                      <td className="px-3 py-3 text-slate-700">{row.units}</td>
                      <td className="px-3 py-3 text-right text-slate-700">{row.sharePercent.toFixed(2)}%</td>
                      <td className="px-3 py-3 text-right text-slate-900">{formatBDT(row.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </ReportTable>
            </>
          ) : null}
        </ReportSection>
      ) : null}

      {hasReportSection(filters, 'audit-summary') ? (
        <ReportSection title="Audit / Missing Voucher Summary" description="Voucher gaps, pending approvals, reversals, audit-locked phases, and current report limitations.">
          <ReportSummaryGrid>
            <ReportKpiCard label="Missing Vouchers" value={String(data.auditSummary.missingVoucher.length)} tone={data.auditSummary.missingVoucher.length > 0 ? 'warning' : 'default'} />
            <ReportKpiCard label="Pending Approvals" value={String(data.auditSummary.pendingApprovals.length)} tone={data.auditSummary.pendingApprovals.length > 0 ? 'warning' : 'default'} />
            <ReportKpiCard label="Reversed Records" value={String(data.auditSummary.reversedRecords.length)} tone={data.auditSummary.reversedRecords.length > 0 ? 'warning' : 'default'} />
            <ReportKpiCard label="Audit Locked Phases" value={String(data.auditSummary.lockedPhases.length)} tone={data.auditSummary.lockedPhases.length > 0 ? 'info' : 'default'} />
          </ReportSummaryGrid>
          <ReportTable dense>
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-3 py-3">Type</th>
                <th className="px-3 py-3">Record</th>
                <th className="px-3 py-3 text-right">Amount</th>
                <th className="px-3 py-3">Reason / Note</th>
              </tr>
            </thead>
            <tbody>
              {data.auditSummary.reversedRecords.length === 0 ? (
                <tr>
                  <td className="px-3 py-8 text-center text-sm text-slate-500" colSpan={4}>No reversed records found for this project.</td>
                </tr>
              ) : (
                data.auditSummary.reversedRecords.map((row, index) => (
                  <tr key={`${row.type}-${row.label}-${index}`} className="border-b border-slate-200">
                    <td className="px-3 py-3 font-medium text-slate-900">{row.type}</td>
                    <td className="px-3 py-3 text-slate-700">{row.label}</td>
                    <td className="px-3 py-3 text-right"><ReportAmount value={formatBDT(row.amount)} tone="negative" /></td>
                    <td className="px-3 py-3 text-slate-700">{row.reason || 'Not recorded'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </ReportTable>
        </ReportSection>
      ) : null}

      <ReportPageBreak />
      <ReportSignatureBlock labels={['Prepared by', 'Checked by', 'Approved by', 'Company seal / signature']} />
    </ReportDocumentLayout>
  );
}

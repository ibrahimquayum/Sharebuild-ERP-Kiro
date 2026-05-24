import { notFound } from 'next/navigation';

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
import { balanceColor, cn, expenseCategoryLabel, formatBDT, formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

function amountTone(value: number) {
  if (value > 0) return 'positive' as const;
  if (value < 0) return 'negative' as const;
  return 'default' as const;
}

function statusTone(value: string) {
  const normalized = value.toUpperCase();
  if (['APPROVED', 'PAID', 'FULLY_PAID', 'CLEARED', 'POSTED', 'SETTLED', 'ACTIVE'].includes(normalized)) return 'positive' as const;
  if (['CANCELLED', 'REVERSED', 'BOUNCED', 'REJECTED', 'DISPUTED'].includes(normalized)) return 'negative' as const;
  if (['PENDING', 'PENDING_APPROVAL', 'DRAFT', 'CALCULATED', 'OPEN', 'UNPAID', 'PARTIALLY_PAID'].includes(normalized)) return 'warning' as const;
  return 'default' as const;
}

export default async function CompleteProjectReportPage({ params }: { params: { id: string } }) {
  const { context } = await getScopedProject(params.id, 'reports', 'view');
  const data = await getCompleteProjectReportData(context.companyId, params.id);
  if (!data) notFound();

  const groupedExpenses = data.expenses.reduce<Record<string, typeof data.expenses>>((groups, expense) => {
    const key = expense.phase.name;
    groups[key] = groups[key] ?? [];
    groups[key].push(expense);
    return groups;
  }, {});

  const taxRows = [...data.supplierSummary, ...data.subcontractorSummary].filter(
    (payable) =>
      Number(payable.vatAmount ?? 0) > 0 ||
      Number(payable.aitTdsAmount ?? 0) > 0 ||
      Number(payable.otherDeductionAmount ?? 0) > 0,
  );
  const retentionRows = [...data.supplierSummary, ...data.subcontractorSummary].filter(
    (payable) => Number(payable.retentionAmount ?? 0) > 0,
  );
  const incompleteVendorDocs =
    data.projectSupplierAssignments.filter((assignment) => assignment.summary.missingInvoiceCount > 0).length +
    data.projectSubcontractorAssignments.filter(
      (assignment) => assignment.summary.missingAgreement || assignment.summary.missingMeasurement,
    ).length;

  const reportSubtitle =
    'Professional management and audit report covering billing, collections, cost, treasury, vendor ledgers, and data quality.';

  return (
    <ReportDocumentLayout
      branding={data.branding}
      project={data.project}
      title="Complete Project Report"
      subtitle={reportSubtitle}
      generatedAt={data.generatedAt}
      backHref={`/projects/${data.project.id}/reports`}
      workbookHref={`/api/projects/${data.project.id}/reports/complete-project/xlsx`}
      csvHref={`/api/projects/${data.project.id}/reports/complete-project/excel`}
      showHeader={false}
    >
      <ReportCoverPage
        branding={data.branding}
        project={data.project}
        title="Complete Project Report"
        reportingPeriod={data.reportingPeriod}
        generatedAt={data.generatedAt}
        generatedBy={(context.session?.user as { name?: string } | undefined)?.name ?? context.userId}
        note="This document separates historical imported collections, system-issued demand, allocated receipts, and reconciliation-generated demand so the financial story stays audit-safe."
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

      <ReportSection
        title="Executive Summary"
        description="Compact view of collection history, issued demand, project cost, treasury, vendor exposure, and audit readiness."
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
          <ReportKpiCard label="Approved Project Cost" value={formatBDT(data.summary.projectCostTotal)} caption="Direct expense plus supplier and subcontractor billed cost." tone="negative" />
          <ReportKpiCard label="Direct Expense" value={formatBDT(data.summary.directExpenseTotal)} caption="Approved and final site expenses only." tone="negative" />
          <ReportKpiCard label="Supplier Bill Cost" value={formatBDT(data.summary.supplierBillCost)} caption={`${formatBDT(data.summary.supplierPayable)} still payable`} tone="negative" />
          <ReportKpiCard label="Subcontractor Bill Cost" value={formatBDT(data.summary.subcontractorBillCost)} caption={`${formatBDT(data.summary.subcontractorPayable)} still payable`} tone="negative" />
          <ReportKpiCard label="Service Charge" value={formatBDT(data.summary.serviceChargeAccrued)} caption={`${formatBDT(data.summary.serviceChargeIncludedInDemand)} included in demand`} tone="info" />
          <ReportKpiCard label="Tax / Deduction" value={formatBDT(data.summary.taxDeductionTotal)} caption="VAT, AIT/TDS, and other bill-level deductions." tone="info" />
          <ReportKpiCard label="Retention Held" value={formatBDT(data.summary.retentionHeld)} caption="Outstanding retained amount after releases." tone="info" />
          <ReportKpiCard label="Cash In" value={formatBDT(data.summary.cashIn)} caption={`${formatBDT(data.summary.cashOut)} cash out`} tone="positive" />
          <ReportKpiCard label="Account Balance" value={formatBDT(data.summary.accountBalance)} caption={`${formatBDT(data.summary.pendingReceivedCheques + data.summary.pendingIssuedCheques)} pending cheques`} tone="default" />
          <ReportKpiCard label="Project Balance" value={formatBDT(data.summary.projectBalance)} caption={`${formatBDT(data.summary.finalSurplusDeficit)} after service charge`} tone={data.summary.projectBalance >= 0 ? 'positive' : 'negative'} />
          <ReportKpiCard label="Missing Vouchers" value={String(data.auditSummary.missingVoucher.length)} caption={`${data.auditSummary.pendingApprovals.length} pending approvals`} tone={data.auditSummary.missingVoucher.length > 0 ? 'warning' : 'default'} />
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
      </ReportSection>

      <ReportSection
        title="Collection and Demand Interpretation"
        description="This section separates summary-imported collections from system-issued demand and allocation status so the due/advance story is not misleading."
      >
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

      <ReportSection title="Top Sheet" description="Original Excel-style phase summary preserved for business continuity and audit cross-checking.">
        <ReportTable>
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3">Phase</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3 text-right">Income</th>
              <th className="px-4 py-3 text-right">Expense</th>
              <th className="px-4 py-3 text-right">Balance</th>
            </tr>
          </thead>
          <tbody>
            {data.topSheet.map((row) => (
              <tr key={row.phaseId} className="border-b border-slate-200">
                <td className="px-4 py-3 font-medium text-slate-900">{row.phaseName}</td>
                <td className="px-4 py-3 text-sm text-slate-600">{row.phaseType}</td>
                <td className="px-4 py-3 text-right"><ReportAmount value={formatBDT(row.income)} tone="positive" /></td>
                <td className="px-4 py-3 text-right"><ReportAmount value={formatBDT(row.expense)} tone="negative" /></td>
                <td className="px-4 py-3 text-right"><ReportAmount value={formatBDT(row.balance)} tone={amountTone(row.balance)} /></td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-slate-50">
              <td className="px-4 py-3 font-semibold text-slate-900" colSpan={2}>Grand Total</td>
              <td className="px-4 py-3 text-right"><ReportAmount value={formatBDT(data.summary.totalCollected)} tone="positive" /></td>
              <td className="px-4 py-3 text-right"><ReportAmount value={formatBDT(data.summary.totalExpense)} tone="negative" /></td>
              <td className="px-4 py-3 text-right"><ReportAmount value={formatBDT(data.summary.projectBalance)} tone={amountTone(data.summary.projectBalance)} /></td>
            </tr>
          </tfoot>
        </ReportTable>
      </ReportSection>

      <ReportSection title="Phase Summary" description="Phase-wise cost, demand, collection, service charge, voucher quality, and audit lock visibility.">
        <ReportTable dense>
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <th className="px-3 py-3">Phase</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3 text-right">Historical Collection</th>
              <th className="px-3 py-3 text-right">Issued Demand</th>
              <th className="px-3 py-3 text-right">Expense</th>
              <th className="px-3 py-3 text-right">Supplier Bills</th>
              <th className="px-3 py-3 text-right">Subcontractor Bills</th>
              <th className="px-3 py-3 text-right">Service Charge</th>
              <th className="px-3 py-3 text-right">Phase Balance</th>
              <th className="px-3 py-3 text-right">Missing Vouchers</th>
              <th className="px-3 py-3">Audit</th>
            </tr>
          </thead>
          <tbody>
            {data.phaseSummary.map((row) => {
              const phaseExpenseRows = data.expenses.filter((expense) => expense.phase.id === row.phaseId);
              const phaseMissingVoucher = phaseExpenseRows.filter(
                (expense) => !expense.reversedAt && expense.documents.length === 0 && ['APPROVED', 'PAID', 'PARTIALLY_PAID'].includes(expense.status),
              ).length;

              return (
                <tr key={row.phaseId} className="border-b border-slate-200">
                  <td className="px-3 py-3 font-medium text-slate-900">{row.phaseName}</td>
                  <td className="px-3 py-3"><ReportStatusBadge label={row.status.replaceAll('_', ' ')} tone={statusTone(row.status)} /></td>
                  <td className="px-3 py-3 text-right"><ReportAmount value={formatBDT(row.collection)} tone="positive" /></td>
                  <td className="px-3 py-3 text-right"><ReportAmount value={formatBDT(row.demand)} tone={row.demand > 0 ? 'default' : 'muted'} /></td>
                  <td className="px-3 py-3 text-right"><ReportAmount value={formatBDT(row.expense)} tone="negative" /></td>
                  <td className="px-3 py-3 text-right"><ReportAmount value={formatBDT(row.supplierBill)} tone="negative" /></td>
                  <td className="px-3 py-3 text-right"><ReportAmount value={formatBDT(row.subcontractorBill)} tone="negative" /></td>
                  <td className="px-3 py-3 text-right"><ReportAmount value={formatBDT(row.serviceCharge)} tone="info" /></td>
                  <td className="px-3 py-3 text-right"><ReportAmount value={formatBDT(row.carryOut)} tone={amountTone(row.carryOut)} /></td>
                  <td className="px-3 py-3 text-right text-slate-700">{phaseMissingVoucher}</td>
                  <td className="px-3 py-3">{row.auditLocked ? <ReportStatusBadge label="Locked" tone="positive" /> : <ReportStatusBadge label="Open" tone="warning" />}</td>
                </tr>
              );
            })}
          </tbody>
        </ReportTable>
      </ReportSection>

      <ReportSection title="Daily Expenses by Phase" description="Approved and pending expense entries grouped by phase with voucher visibility and payment method.">
        <div className="space-y-5">
          {Object.entries(groupedExpenses).map(([phaseName, expenses]) => {
            const total = expenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
            return (
              <div key={phaseName} className="report-avoid-break space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold text-slate-900">{phaseName}</h3>
                  <div className="text-sm font-medium text-slate-600">Total {formatBDT(total)}</div>
                </div>
                <ReportTable dense>
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      <th className="px-3 py-3">Date</th>
                      <th className="px-3 py-3">Category</th>
                      <th className="px-3 py-3">Description</th>
                      <th className="px-3 py-3">Supplier / Local Shop</th>
                      <th className="px-3 py-3">Voucher / Invoice</th>
                      <th className="px-3 py-3">Method</th>
                      <th className="px-3 py-3 text-right">Amount</th>
                      <th className="px-3 py-3">Status</th>
                      <th className="px-3 py-3">Voucher Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.map((expense) => (
                      <tr key={expense.id} className="border-b border-slate-200">
                        <td className="px-3 py-3 text-slate-700">{formatDate(expense.expenseDate)}</td>
                        <td className="px-3 py-3 text-slate-700">{expenseCategoryLabel(expense.category)}</td>
                        <td className="px-3 py-3 text-slate-900">{expense.description}</td>
                        <td className="px-3 py-3 text-slate-700">{expense.supplier?.name ?? expense.localShopName ?? 'Cash / no supplier'}</td>
                        <td className="px-3 py-3 text-slate-700">{expense.billNo ?? expense.referenceNo ?? '-'}</td>
                        <td className="px-3 py-3 text-slate-700">{expense.paymentMethod.replaceAll('_', ' ')}</td>
                        <td className="px-3 py-3 text-right"><ReportAmount value={formatBDT(Number(expense.amount))} tone="negative" /></td>
                        <td className="px-3 py-3"><ReportStatusBadge label={expense.status.replaceAll('_', ' ')} tone={statusTone(expense.status)} /></td>
                        <td className="px-3 py-3">
                          {expense.documents.length > 0 ? (
                            <ReportStatusBadge label="Attached" tone="positive" />
                          ) : (
                            <ReportStatusBadge label="Missing" tone="warning" />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </ReportTable>
              </div>
            );
          })}
        </div>
      </ReportSection>

      <ReportSection title="Supplier Ledger Summary" description="Assigned supplier contracts, bill exposure, document readiness, and current payable position.">
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

      <ReportSection title="Buyer Billing and Due Summary" description="Buyer-level billing, collection, and due/advance position, separated from historical imported receipts where needed.">
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

      <ReportSection title="Cash / Bank Summary" description="Account-wise treasury movement posted from collections, expenses, vendor payments, and service charge settlements.">
        <ReportSummaryGrid>
          <ReportKpiCard label="Cash In" value={formatBDT(data.summary.cashIn)} tone="positive" />
          <ReportKpiCard label="Cash Out" value={formatBDT(data.summary.cashOut)} tone="negative" />
          <ReportKpiCard label="Net Movement" value={formatBDT(data.summary.netCashMovement)} tone={data.summary.netCashMovement >= 0 ? 'positive' : 'negative'} />
          <ReportKpiCard label="Pending Cheques" value={formatBDT(data.summary.pendingReceivedCheques + data.summary.pendingIssuedCheques)} tone="warning" />
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
                <td className="px-3 py-8 text-center text-sm text-slate-500" colSpan={6}>No tax or deduction rows found for this project.</td>
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
                <td className="px-3 py-8 text-center text-sm text-slate-500" colSpan={6}>No retention rows found for this project.</td>
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

      <ReportSection title="Service Charge Summary" description="Phase-level service charge basis, effective amount, settlement state, and billing inclusion.">
        <ReportTable dense>
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <th className="px-3 py-3">Phase / Work</th>
              <th className="px-3 py-3 text-right">Basis Amount</th>
              <th className="px-3 py-3 text-right">Percent</th>
              <th className="px-3 py-3 text-right">Service Charge</th>
              <th className="px-3 py-3">Settlement</th>
              <th className="px-3 py-3">Included in Demand</th>
            </tr>
          </thead>
          <tbody>
            {(data.serviceChargeLedger?.rows ?? []).map((row) => (
              <tr key={`${row.phaseId ?? 'project'}-${row.entryId ?? row.phaseName}`} className="border-b border-slate-200">
                <td className="px-3 py-3 font-medium text-slate-900">{row.phaseName}</td>
                <td className="px-3 py-3 text-right"><ReportAmount value={formatBDT(row.basisAmount)} /></td>
                <td className="px-3 py-3 text-right text-slate-700">{Number(row.percentage ?? 0).toFixed(2)}%</td>
                <td className="px-3 py-3 text-right"><ReportAmount value={formatBDT(row.serviceChargeAmount)} tone="info" /></td>
                <td className="px-3 py-3"><ReportStatusBadge label={row.settlementStatus.replaceAll('_', ' ')} tone={statusTone(row.settlementStatus)} /></td>
                <td className="px-3 py-3">{row.includedInDemand ? <ReportStatusBadge label="Yes" tone="positive" /> : <ReportStatusBadge label="No" tone="warning" />}</td>
              </tr>
            ))}
          </tbody>
        </ReportTable>
      </ReportSection>

      <ReportSection title="Final Reconciliation Summary" description="Preview or posted reconciliation status, deficit/surplus outcome, and buyer distribution basis.">
        <div className="grid gap-4 lg:grid-cols-[1.1fr,1.9fr]">
          <ReportNoteBox title="Reconciliation status" tone={data.reconciliationPreview?.posted ? 'info' : 'warning'}>
            <div className="space-y-2">
              <div><strong>Status:</strong> {data.reconciliationPreview?.posted ? 'Posted' : 'Preview only'}</div>
              <div><strong>Direction:</strong> {data.reconciliationPreview?.direction ?? 'N/A'}</div>
              <div><strong>Final amount:</strong> {formatBDT(data.reconciliationPreview?.finalSurplusDeficit ?? 0)}</div>
              <div><strong>Recommendation:</strong> {data.reconciliationPreview?.recommendation ?? 'Not available.'}</div>
            </div>
          </ReportNoteBox>
          <ReportTable dense>
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-3 py-3">Buyer</th>
                <th className="px-3 py-3">Units</th>
                <th className="px-3 py-3 text-right">Share</th>
                <th className="px-3 py-3 text-right">Distribution</th>
              </tr>
            </thead>
            <tbody>
              {(data.reconciliationPreview?.distribution ?? []).map((row) => (
                <tr key={row.buyerId} className="border-b border-slate-200">
                  <td className="px-3 py-3 font-medium text-slate-900">{row.buyerName}</td>
                  <td className="px-3 py-3 text-slate-700">{row.units}</td>
                  <td className="px-3 py-3 text-right text-slate-700">{row.sharePercent.toFixed(2)}%</td>
                  <td className="px-3 py-3 text-right"><ReportAmount value={formatBDT(row.amount)} tone={data.reconciliationPreview?.direction === 'SURPLUS' ? 'positive' : 'negative'} /></td>
                </tr>
              ))}
            </tbody>
          </ReportTable>
        </div>
      </ReportSection>

      <ReportSection title="Audit and Data Quality Summary" description="Voucher quality, pending approvals, reversal activity, phase locks, document gaps, and report limitations.">
        <ReportSummaryGrid>
          <ReportKpiCard label="Missing Vouchers" value={String(data.auditSummary.missingVoucher.length)} tone={data.auditSummary.missingVoucher.length > 0 ? 'warning' : 'default'} />
          <ReportKpiCard label="Pending Approvals" value={String(data.auditSummary.pendingApprovals.length)} tone={data.auditSummary.pendingApprovals.length > 0 ? 'warning' : 'default'} />
          <ReportKpiCard label="Reversed Records" value={String(data.auditSummary.reversedRecords.length)} tone={data.auditSummary.reversedRecords.length > 0 ? 'warning' : 'default'} />
          <ReportKpiCard label="Incomplete Vendor Docs" value={String(incompleteVendorDocs)} tone={incompleteVendorDocs > 0 ? 'warning' : 'default'} />
        </ReportSummaryGrid>
        <div className="grid gap-4 lg:grid-cols-[1.4fr,1fr]">
          <ReportTable dense>
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-3 py-3">Type</th>
                <th className="px-3 py-3">Record</th>
                <th className="px-3 py-3 text-right">Amount</th>
                <th className="px-3 py-3">Reason</th>
              </tr>
            </thead>
            <tbody>
              {data.auditSummary.reversedRecords.length === 0 ? (
                <tr>
                  <td className="px-3 py-8 text-center text-sm text-slate-500" colSpan={4}>No reversed records found.</td>
                </tr>
              ) : (
                data.auditSummary.reversedRecords.map((row, index) => (
                  <tr key={`${row.type}-${index}`} className="border-b border-slate-200">
                    <td className="px-3 py-3 text-slate-700">{row.type}</td>
                    <td className="px-3 py-3 font-medium text-slate-900">{row.label}</td>
                    <td className="px-3 py-3 text-right"><ReportAmount value={formatBDT(row.amount)} tone="negative" /></td>
                    <td className="px-3 py-3 text-slate-700">{row.reason || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </ReportTable>
          <div className="space-y-4">
            <ReportNoteBox title="Audit locked phases" tone={data.auditSummary.lockedPhases.length > 0 ? 'info' : 'default'}>
              {data.auditSummary.lockedPhases.length > 0 ? (
                <ul className="space-y-2">
                  {data.auditSummary.lockedPhases.map((phase) => (
                    <li key={phase.id}>{phase.name}</li>
                  ))}
                </ul>
              ) : (
                <p>No phases are currently audit locked.</p>
              )}
            </ReportNoteBox>
            <ReportNoteBox title="Report limitations" tone="warning">
              <ul className="space-y-2">
                {data.reportNotes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </ReportNoteBox>
          </div>
        </div>
      </ReportSection>

      <ReportPageBreak />

      <ReportSection title="Signature Page" description="Formal sign-off space for preparation, checking, and approval.">
        <ReportSignatureBlock labels={['Prepared by', 'Checked by', 'Approved by', 'Company seal / Signature']} />
      </ReportSection>
    </ReportDocumentLayout>
  );
}

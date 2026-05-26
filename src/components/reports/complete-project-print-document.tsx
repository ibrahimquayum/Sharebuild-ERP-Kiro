import type { getCompleteProjectReportData } from '@/lib/complete-project-report';
import { hasReportSection } from '@/lib/report-controls';
import { expenseCategoryLabel, formatBDT, formatDate } from '@/lib/utils';

import {
  PrintAmount,
  PrintCoverPage,
  PrintDocumentShell,
  PrintNoteBox,
  PrintPage,
  PrintSection,
  PrintSignatureBlock,
  PrintStatusPill,
  PrintSubsection,
  PrintSummaryTable,
  PrintTable,
} from '@/components/reports/print-document';

type CompleteProjectReportData = NonNullable<Awaited<ReturnType<typeof getCompleteProjectReportData>>>;

function amountTone(value: number) {
  if (value > 0) return 'positive' as const;
  if (value < 0) return 'negative' as const;
  return 'default' as const;
}

function statusTone(value: string) {
  const normalized = value.toUpperCase();
  if (['APPROVED', 'PAID', 'FULLY_PAID', 'CLEARED', 'POSTED', 'SETTLED', 'ACTIVE', 'PREVIEW'].includes(normalized)) return 'positive' as const;
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
  }[value] ?? value.replaceAll('_', ' ');
}

function shouldShow(showEmpty: boolean, count: number) {
  return showEmpty || count > 0;
}

export function CompleteProjectPrintDocument({
  data,
  generatedBy,
}: {
  data: CompleteProjectReportData;
  generatedBy: string;
}) {
  const filters = data.filters;
  const showEmpty = filters.includeEmptySections;
  const taxRows = [...data.supplierSummary, ...data.subcontractorSummary].filter(
    (payable) =>
      Number(payable.vatAmount ?? 0) > 0 ||
      Number(payable.aitTdsAmount ?? 0) > 0 ||
      Number(payable.otherDeductionAmount ?? 0) > 0,
  );
  const retentionRows = [...data.supplierSummary, ...data.subcontractorSummary].filter(
    (payable) => Number(payable.retentionAmount ?? 0) > 0,
  );

  return (
    <PrintDocumentShell
      branding={data.branding}
      project={data.project}
      title="Complete Project Report"
      generatedAt={data.generatedAt}
    >
      <PrintCoverPage
        branding={data.branding}
        project={data.project}
        title="Complete Project Report"
        reportingPeriod={data.reportingPeriod}
        generatedAt={data.generatedAt}
        generatedBy={generatedBy}
        note="This print and PDF route is intentionally separated from the screen view. It uses compact financial tables, full document flow, and the same controlled data slice as the screen report and Excel workbook."
      />

      {data.reportNotes.length > 0 ? (
        <PrintPage breakBefore>
          <PrintNoteBox title="Data quality and interpretation note">
            <ul className="space-y-1">
              {data.reportNotes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </PrintNoteBox>
        </PrintPage>
      ) : null}

      {hasReportSection(filters, 'overview') ? (
        <PrintPage breakBefore>
          <PrintSection
            title="Complete Project Overview"
            description="Project identity, report control slice, and seeded historical continuity."
          >
            <PrintSummaryTable
              rows={[
                { label: 'Project code', value: data.project.code || 'Not assigned' },
                { label: 'Project address', value: data.project.address || 'Project address not recorded' },
                { label: 'Reporting period', value: data.reportingPeriod },
                { label: 'Report mode', value: filters.detailMode.replace('-', ' ') },
                { label: 'Visible phases', value: filters.phaseIds.length ? `${filters.phaseIds.length} selected` : 'All phases' },
                { label: 'Cost rows in slice', value: `${data.costReport.rows.length} of ${data.costReport.allRowsCount}` },
                {
                  label: 'Historical Top Sheet continuity',
                  value: formatBDT(data.summary.projectBalance),
                  tone: amountTone(data.summary.projectBalance),
                  note: `Income ${formatBDT(data.summary.totalCollected)} | Expense ${formatBDT(data.summary.totalExpense)}`,
                },
              ]}
            />
          </PrintSection>
        </PrintPage>
      ) : null}

      {hasReportSection(filters, 'executive-summary') ? (
        <PrintPage breakBefore>
          <PrintSection
            title="Executive Financial Summary"
            description="Compact summary of demand, collection, unified cost, payables, treasury, and audit exposure."
          >
            <PrintSummaryTable
              rows={[
                {
                  label: 'Historical collection',
                  value: formatBDT(data.summary.totalCollected),
                  tone: 'positive',
                  note: data.summary.historicalCollectionsWithoutDemand
                    ? 'Historical Excel-backed collection exists without matching issued demand rows.'
                    : 'Approved collection recorded in the project ledger.',
                },
                {
                  label: 'Issued demand',
                  value: formatBDT(data.summary.issuedDemand),
                  tone: data.summary.issuedDemand > 0 ? 'info' : 'warning',
                  note: data.summary.issuedDemand > 0 ? `${formatBDT(data.summary.finalReconciliationDemand)} is final reconciliation demand.` : 'No issued demand found in the system billing ledger.',
                },
                {
                  label: 'Allocated collection',
                  value: formatBDT(data.summary.allocatedCollection),
                  tone: 'positive',
                  note: `${formatBDT(data.summary.unallocatedCollection)} remains unallocated / advance.`,
                },
                {
                  label: 'Buyer due',
                  value: formatBDT(data.summary.buyerReceivable),
                  tone: data.summary.buyerReceivable > 0 ? 'negative' : 'default',
                  note: `${formatBDT(data.summary.buyerAdvance)} buyer advance / credit balance.`,
                },
                {
                  label: 'Actual construction cost',
                  value: formatBDT(
                    data.costReport.totals.DIRECT_EXPENSE +
                      data.costReport.totals.SUPPLIER_BILL_ITEM +
                      data.costReport.totals.SUBCONTRACTOR_PROGRESS_BILL +
                      data.costReport.totals.ADJUSTMENT,
                  ),
                  tone: 'negative',
                  note: 'Direct expenses + supplier bill items + subcontractor bills + adjustments.',
                },
                {
                  label: 'Company service charge / supervision fee',
                  value: formatBDT(data.costReport.totals.COMPANY_SERVICE_CHARGE),
                  tone: 'info',
                  note: 'Calculated on actual construction cost using phase service charge percentages.',
                },
                {
                  label: 'Total billable cost',
                  value: formatBDT(data.costReport.totals.total),
                  tone: 'negative',
                  note: 'Unified project cost total including service charge rows.',
                },
                {
                  label: 'Supplier payable',
                  value: formatBDT(data.summary.supplierPayable),
                  tone: data.summary.supplierPayable > 0 ? 'negative' : 'default',
                  note: 'Supplier bill, paid, and due position remains separate from daily cost rows.',
                },
                {
                  label: 'Subcontractor payable',
                  value: formatBDT(data.summary.subcontractorPayable),
                  tone: data.summary.subcontractorPayable > 0 ? 'negative' : 'default',
                  note: 'Progress bill, retention, and due position by subcontractor work package.',
                },
                {
                  label: 'Cash in / cash out',
                  value: formatBDT(data.summary.cashIn),
                  tone: 'positive',
                  note: `${formatBDT(data.summary.cashOut)} cash out across accounts in the selected report slice.`,
                },
                {
                  label: 'Project balance',
                  value: formatBDT(data.summary.projectBalance),
                  tone: amountTone(data.summary.projectBalance),
                  note: `${data.auditSummary.missingVoucher.length} missing vouchers | ${data.auditSummary.pendingApprovals.length} pending approvals.`,
                },
              ]}
            />
          </PrintSection>
        </PrintPage>
      ) : null}

      {hasReportSection(filters, 'phase-summary') ? (
        <PrintPage breakBefore>
          <PrintSection
            title="Phase Summary"
            description="Phase-wise collection, actual construction cost, company service charge, total phase cost, and balance."
          >
            <PrintTable dense>
              <thead>
                <tr className="border-b border-slate-300 bg-slate-100 text-left text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-700">
                  <th className="px-2.5 py-2">Phase</th>
                  <th className="px-2.5 py-2">Status</th>
                  <th className="px-2.5 py-2 text-right">Collection</th>
                  <th className="px-2.5 py-2 text-right">Construction Cost</th>
                  <th className="px-2.5 py-2 text-right">Service Charge</th>
                  <th className="px-2.5 py-2 text-right">Total Phase Cost</th>
                  <th className="px-2.5 py-2 text-right">Balance</th>
                  <th className="px-2.5 py-2 text-right">Missing Vouchers</th>
                </tr>
              </thead>
              <tbody>
                {data.phaseSummary.map((row) => {
                  const costGroup = data.costReport.phaseGroups.find((group) => group.phaseId === row.phaseId);
                  return (
                    <tr key={row.phaseId} className="border-b border-slate-200">
                      <td className="px-2.5 py-2 font-medium text-slate-900">{row.phaseName}</td>
                      <td className="px-2.5 py-2">
                        <PrintStatusPill label={row.status.replaceAll('_', ' ')} tone={statusTone(row.status)} />
                      </td>
                      <td className="px-2.5 py-2 text-right"><PrintAmount value={formatBDT(row.collection)} tone="positive" /></td>
                      <td className="px-2.5 py-2 text-right"><PrintAmount value={formatBDT(row.actualConstructionCost)} tone="negative" /></td>
                      <td className="px-2.5 py-2 text-right"><PrintAmount value={formatBDT(row.serviceChargeCostTotal)} tone="info" /></td>
                      <td className="px-2.5 py-2 text-right"><PrintAmount value={formatBDT(row.totalBillablePhaseCost)} tone="negative" /></td>
                      <td className="px-2.5 py-2 text-right"><PrintAmount value={formatBDT(row.phaseBalance)} tone={amountTone(row.phaseBalance)} /></td>
                      <td className="px-2.5 py-2 text-right">{costGroup?.voucherMissingCount ?? 0}</td>
                    </tr>
                  );
                })}
              </tbody>
            </PrintTable>
          </PrintSection>
        </PrintPage>
      ) : null}

      {hasReportSection(filters, 'phase-details') ? (
        <>
          {data.costReport.phaseGroups.map((group, index) => {
            const phaseRow = data.phaseSummary.find((row) => row.phaseId === group.phaseId);
            const constructionCost =
              (group.totals.DIRECT_EXPENSE ?? 0) +
              (group.totals.SUPPLIER_BILL_ITEM ?? 0) +
              (group.totals.SUBCONTRACTOR_PROGRESS_BILL ?? 0) +
              (group.totals.ADJUSTMENT ?? 0);

            return (
              <PrintPage key={group.phaseId ?? `project-general-${index}`} breakBefore>
                <PrintSection
                  title={`Phase Detail - ${group.phaseName}`}
                  description="Supplier bill items remain inside daily project cost details; supplier ledger stays separate as the party-wise payable report."
                >
                  <PrintSubsection title="Phase Summary">
                    <PrintSummaryTable
                      rows={[
                        { label: 'Collection', value: formatBDT(phaseRow?.collection ?? 0), tone: 'positive' },
                        {
                          label: 'Actual construction cost',
                          value: formatBDT(constructionCost),
                          tone: 'negative',
                          note: `Direct ${formatBDT(group.totals.DIRECT_EXPENSE ?? 0)} | Supplier ${formatBDT(group.totals.SUPPLIER_BILL_ITEM ?? 0)} | Subcontractor ${formatBDT(group.totals.SUBCONTRACTOR_PROGRESS_BILL ?? 0)} | Adjustments ${formatBDT(group.totals.ADJUSTMENT ?? 0)}`,
                        },
                        {
                          label: `Company service charge / supervision fee (${phaseRow?.serviceChargePercentage?.toFixed(2) ?? '0.00'}%)`,
                          value: formatBDT(group.totals.COMPANY_SERVICE_CHARGE),
                          tone: 'info',
                        },
                        { label: 'Total phase cost', value: formatBDT(group.totalCost), tone: 'negative' },
                        {
                          label: 'Phase balance',
                          value: formatBDT(phaseRow?.phaseBalance ?? 0),
                          tone: amountTone(phaseRow?.phaseBalance ?? 0),
                        },
                        {
                          label: 'Audit note',
                          value: `${group.voucherMissingCount} missing vouchers`,
                          note: `${group.pendingCount} pending approvals | ${group.reversedCount} reversed rows in visible slice`,
                        },
                      ]}
                    />
                  </PrintSubsection>

                  {shouldShow(showEmpty, group.categoryBreakdown.length) ? (
                    <PrintSubsection title="Category-wise Expense Breakdown">
                      <PrintTable dense>
                        <thead>
                          <tr className="border-b border-slate-300 bg-slate-100 text-left text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-700">
                            <th className="px-2.5 py-2">Category</th>
                            <th className="px-2.5 py-2 text-right">Rows</th>
                            <th className="px-2.5 py-2 text-right">Amount</th>
                            <th className="px-2.5 py-2 text-right">% of Phase Cost</th>
                          </tr>
                        </thead>
                        <tbody>
                          {group.categoryBreakdown.length === 0 ? (
                            <tr>
                              <td className="px-2.5 py-5 text-center text-slate-500" colSpan={4}>No category rows found for this phase.</td>
                            </tr>
                          ) : (
                            group.categoryBreakdown.map((row) => (
                              <tr key={row.category} className="border-b border-slate-200">
                                <td className="px-2.5 py-2 font-medium text-slate-900">{expenseCategoryLabel(row.category)}</td>
                                <td className="px-2.5 py-2 text-right">{row.rowCount}</td>
                                <td className="px-2.5 py-2 text-right">
                                  <PrintAmount value={formatBDT(row.amount)} tone={row.category === 'SERVICE_CHARGE' ? 'info' : 'negative'} />
                                </td>
                                <td className="px-2.5 py-2 text-right">{group.totalCost > 0 ? ((row.amount / group.totalCost) * 100).toFixed(2) : '0.00'}%</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </PrintTable>
                    </PrintSubsection>
                  ) : null}

                  {shouldShow(showEmpty, group.rows.length) ? (
                    <PrintSubsection title="Daily Project Cost Details">
                      <PrintTable dense>
                        <thead>
                          <tr className="border-b border-slate-300 bg-slate-100 text-left text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-700">
                            <th className="px-2 py-2">Date</th>
                            <th className="px-2 py-2">Source</th>
                            <th className="px-2 py-2">Bill / Voucher</th>
                            <th className="px-2 py-2">Party</th>
                            <th className="px-2 py-2">Description</th>
                            <th className="px-2 py-2 text-right">Qty</th>
                            <th className="px-2 py-2 text-right">Rate</th>
                            <th className="px-2 py-2 text-right">Amount</th>
                            <th className="px-2 py-2">Voucher</th>
                            <th className="px-2 py-2">Approval</th>
                          </tr>
                        </thead>
                        <tbody>
                          {group.rows.length === 0 ? (
                            <tr>
                              <td className="px-2 py-5 text-center text-slate-500" colSpan={10}>No daily project cost rows found.</td>
                            </tr>
                          ) : (
                            group.rows.map((row) => (
                              <tr key={row.id} className="border-b border-slate-200 align-top">
                                <td className="px-2 py-2 text-slate-700">{formatDate(row.date)}</td>
                                <td className="px-2 py-2 text-slate-700">{sourceTypeLabel(row.sourceType)}</td>
                                <td className="px-2 py-2 font-mono text-[10px] text-slate-600">{row.sourceNo}</td>
                                <td className="px-2 py-2 text-slate-700">{row.partyName}</td>
                                <td className="px-2 py-2">
                                  <div className="font-medium text-slate-900">{row.description}</div>
                                  <div className="text-[10px] text-slate-500">{expenseCategoryLabel(row.category)}</div>
                                </td>
                                <td className="px-2 py-2 text-right text-slate-700">{row.quantity != null ? `${row.quantity} ${row.unit ?? ''}` : '-'}</td>
                                <td className="px-2 py-2 text-right text-slate-700">{row.rate != null ? formatBDT(row.rate) : '-'}</td>
                                <td className="px-2 py-2 text-right">
                                  <PrintAmount value={formatBDT(row.amount)} tone={row.sourceType === 'COMPANY_SERVICE_CHARGE' ? 'info' : 'negative'} />
                                </td>
                                <td className="px-2 py-2"><PrintStatusPill label={row.voucherStatus.replaceAll('_', ' ')} tone={statusTone(row.voucherStatus)} /></td>
                                <td className="px-2 py-2"><PrintStatusPill label={row.approvalStatus.replaceAll('_', ' ')} tone={statusTone(row.approvalStatus)} /></td>
                              </tr>
                            ))
                          )}
                        </tbody>
                        <tfoot>
                          <tr className="bg-slate-50">
                            <td className="px-2 py-2 font-semibold text-slate-900" colSpan={7}>Total phase cost rows in visible slice</td>
                            <td className="px-2 py-2 text-right"><PrintAmount value={formatBDT(group.totalCost)} tone="negative" /></td>
                            <td className="px-2 py-2" colSpan={2} />
                          </tr>
                        </tfoot>
                      </PrintTable>
                    </PrintSubsection>
                  ) : null}

                  <PrintSubsection title="Phase Audit Notes">
                    <PrintSummaryTable
                      rows={[
                        { label: 'Missing vouchers', value: String(group.voucherMissingCount), tone: group.voucherMissingCount > 0 ? 'warning' : 'default' },
                        { label: 'Pending approvals', value: String(group.pendingCount), tone: group.pendingCount > 0 ? 'warning' : 'default' },
                        { label: 'Reversed rows in slice', value: String(group.reversedCount), tone: group.reversedCount > 0 ? 'warning' : 'default' },
                      ]}
                    />
                  </PrintSubsection>
                </PrintSection>
              </PrintPage>
            );
          })}
        </>
      ) : null}

      {hasReportSection(filters, 'buyer-billing') && shouldShow(showEmpty, data.buyerBillingSummary.length) ? (
        <PrintPage breakBefore>
          <PrintSection title="Buyer Billing & Due" description="Buyer-wise demand, collection, allocation, due, and advance.">
            <PrintTable dense>
              <thead>
                <tr className="border-b border-slate-300 bg-slate-100 text-left text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-700">
                  <th className="px-2.5 py-2">Buyer</th>
                  <th className="px-2.5 py-2">Units</th>
                  <th className="px-2.5 py-2 text-right">Issued Demand</th>
                  <th className="px-2.5 py-2 text-right">Collection</th>
                  <th className="px-2.5 py-2 text-right">Allocated</th>
                  <th className="px-2.5 py-2 text-right">Due</th>
                  <th className="px-2.5 py-2 text-right">Advance</th>
                </tr>
              </thead>
              <tbody>
                {data.buyerBillingSummary.map((row) => (
                  <tr key={row.buyerId} className="border-b border-slate-200">
                    <td className="px-2.5 py-2 font-medium text-slate-900">{row.buyerName}</td>
                    <td className="px-2.5 py-2 text-slate-700">{row.unitsText}</td>
                    <td className="px-2.5 py-2 text-right"><PrintAmount value={formatBDT(row.demanded)} /></td>
                    <td className="px-2.5 py-2 text-right"><PrintAmount value={formatBDT(row.collected)} tone="positive" /></td>
                    <td className="px-2.5 py-2 text-right"><PrintAmount value={formatBDT(row.allocated)} tone="positive" /></td>
                    <td className="px-2.5 py-2 text-right"><PrintAmount value={formatBDT(row.due)} tone={row.due > 0 ? 'negative' : 'default'} /></td>
                    <td className="px-2.5 py-2 text-right"><PrintAmount value={formatBDT(row.advance)} tone={row.advance > 0 ? 'warning' : 'default'} /></td>
                  </tr>
                ))}
              </tbody>
            </PrintTable>
          </PrintSection>
        </PrintPage>
      ) : null}

      {hasReportSection(filters, 'supplier-ledger') && shouldShow(showEmpty, data.projectSupplierAssignments.length) ? (
        <PrintPage breakBefore>
          <PrintSection title="Supplier Ledger Summary" description="Supplier bill, paid, payable, and document status remain separate from project cost rows.">
            <PrintTable dense>
              <thead>
                <tr className="border-b border-slate-300 bg-slate-100 text-left text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-700">
                  <th className="px-2.5 py-2">Supplier</th>
                  <th className="px-2.5 py-2">Assignment</th>
                  <th className="px-2.5 py-2 text-right">Bill Total</th>
                  <th className="px-2.5 py-2 text-right">Paid</th>
                  <th className="px-2.5 py-2 text-right">Payable</th>
                  <th className="px-2.5 py-2 text-right">Documents</th>
                </tr>
              </thead>
              <tbody>
                {data.projectSupplierAssignments.map((assignment) => (
                  <tr key={assignment.id} className="border-b border-slate-200">
                    <td className="px-2.5 py-2 font-medium text-slate-900">{assignment.supplier.name}</td>
                    <td className="px-2.5 py-2 text-slate-700">{assignment.materialCategory || assignment.paymentTerms || 'General supplier assignment'}</td>
                    <td className="px-2.5 py-2 text-right"><PrintAmount value={formatBDT(assignment.summary.totalBilled)} tone="negative" /></td>
                    <td className="px-2.5 py-2 text-right"><PrintAmount value={formatBDT(assignment.summary.totalPaid)} tone="positive" /></td>
                    <td className="px-2.5 py-2 text-right"><PrintAmount value={formatBDT(assignment.summary.totalDue)} tone={assignment.summary.totalDue > 0 ? 'negative' : 'default'} /></td>
                    <td className="px-2.5 py-2 text-right">{assignment.summary.documentCount}</td>
                  </tr>
                ))}
              </tbody>
            </PrintTable>
          </PrintSection>
        </PrintPage>
      ) : null}

      {hasReportSection(filters, 'subcontractor-ledger') && shouldShow(showEmpty, data.projectSubcontractorAssignments.length) ? (
        <PrintPage breakBefore>
          <PrintSection title="Subcontractor Ledger Summary" description="Work-package bill, paid, due, retention, and document quality.">
            <PrintTable dense>
              <thead>
                <tr className="border-b border-slate-300 bg-slate-100 text-left text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-700">
                  <th className="px-2.5 py-2">Subcontractor</th>
                  <th className="px-2.5 py-2">Work Type</th>
                  <th className="px-2.5 py-2 text-right">Contract</th>
                  <th className="px-2.5 py-2 text-right">Bill Total</th>
                  <th className="px-2.5 py-2 text-right">Paid</th>
                  <th className="px-2.5 py-2 text-right">Due</th>
                  <th className="px-2.5 py-2 text-right">Retention</th>
                </tr>
              </thead>
              <tbody>
                {data.projectSubcontractorAssignments.map((assignment) => (
                  <tr key={assignment.id} className="border-b border-slate-200">
                    <td className="px-2.5 py-2 font-medium text-slate-900">{assignment.supplier.name}</td>
                    <td className="px-2.5 py-2 text-slate-700">{assignment.workType.replaceAll('_', ' ')}</td>
                    <td className="px-2.5 py-2 text-right"><PrintAmount value={formatBDT(Number(assignment.contractAmount ?? 0) + Number(assignment.extraWorkAmount ?? 0))} /></td>
                    <td className="px-2.5 py-2 text-right"><PrintAmount value={formatBDT(assignment.summary.totalBilled)} tone="negative" /></td>
                    <td className="px-2.5 py-2 text-right"><PrintAmount value={formatBDT(assignment.summary.totalPaid)} tone="positive" /></td>
                    <td className="px-2.5 py-2 text-right"><PrintAmount value={formatBDT(assignment.summary.totalDue)} tone={assignment.summary.totalDue > 0 ? 'negative' : 'default'} /></td>
                    <td className="px-2.5 py-2 text-right"><PrintAmount value={formatBDT(assignment.payables.reduce((sum, payable) => sum + Number(payable.retentionAmount ?? 0), 0))} tone="info" /></td>
                  </tr>
                ))}
              </tbody>
            </PrintTable>
          </PrintSection>
        </PrintPage>
      ) : null}

      {hasReportSection(filters, 'cash-bank') ? (
        <PrintPage breakBefore>
          <PrintSection title="Cash / Bank Summary" description="Account-wise treasury movement for the selected report slice.">
            <PrintSummaryTable
              rows={[
                { label: 'Cash in', value: formatBDT(data.cashBankSummary?.totals.inflow ?? 0), tone: 'positive' },
                { label: 'Cash out', value: formatBDT(data.cashBankSummary?.totals.outflow ?? 0), tone: 'negative' },
                { label: 'Net movement', value: formatBDT(data.cashBankSummary?.totals.netMovement ?? 0), tone: amountTone(data.cashBankSummary?.totals.netMovement ?? 0) },
                { label: 'Account balance', value: formatBDT(data.cashBankSummary?.totals.accountBalance ?? 0), tone: 'info' },
              ]}
            />
          </PrintSection>
        </PrintPage>
      ) : null}

      {hasReportSection(filters, 'cheques') && shouldShow(showEmpty, data.chequeSummary.cheques.length) ? (
        <PrintPage breakBefore>
          <PrintSection title="Cheque Register Summary" description="Issued and received cheques by party, amount, and current status.">
            <PrintTable dense>
              <thead>
                <tr className="border-b border-slate-300 bg-slate-100 text-left text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-700">
                  <th className="px-2.5 py-2">Cheque No</th>
                  <th className="px-2.5 py-2">Type</th>
                  <th className="px-2.5 py-2">Party</th>
                  <th className="px-2.5 py-2 text-right">Amount</th>
                  <th className="px-2.5 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.chequeSummary.cheques.map((cheque) => (
                  <tr key={cheque.id} className="border-b border-slate-200">
                    <td className="px-2.5 py-2 font-medium text-slate-900">{cheque.chequeNo}</td>
                    <td className="px-2.5 py-2 text-slate-700">{cheque.chequeType.replaceAll('_', ' ')}</td>
                    <td className="px-2.5 py-2 text-slate-700">{cheque.partyName ?? cheque.partyType}</td>
                    <td className="px-2.5 py-2 text-right"><PrintAmount value={formatBDT(Number(cheque.amount))} /></td>
                    <td className="px-2.5 py-2"><PrintStatusPill label={cheque.status.replaceAll('_', ' ')} tone={statusTone(cheque.status)} /></td>
                  </tr>
                ))}
              </tbody>
            </PrintTable>
          </PrintSection>
        </PrintPage>
      ) : null}

      {hasReportSection(filters, 'tax-retention-service-charge') ? (
        <>
          {shouldShow(showEmpty, taxRows.length) ? (
            <PrintPage breakBefore>
              <PrintSection title="Tax / Deduction Summary" description="Bill-level VAT, AIT/TDS, and other deductions.">
                <PrintTable dense>
                  <thead>
                    <tr className="border-b border-slate-300 bg-slate-100 text-left text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-700">
                      <th className="px-2.5 py-2">Party</th>
                      <th className="px-2.5 py-2">Bill</th>
                      <th className="px-2.5 py-2 text-right">VAT</th>
                      <th className="px-2.5 py-2 text-right">AIT / TDS</th>
                      <th className="px-2.5 py-2 text-right">Other</th>
                    </tr>
                  </thead>
                  <tbody>
                    {taxRows.map((payable) => (
                      <tr key={payable.id} className="border-b border-slate-200">
                        <td className="px-2.5 py-2 font-medium text-slate-900">{payable.supplier.name}</td>
                        <td className="px-2.5 py-2 text-slate-700">{payable.billNo ?? 'Project bill'}</td>
                        <td className="px-2.5 py-2 text-right"><PrintAmount value={formatBDT(Number(payable.vatAmount ?? 0))} /></td>
                        <td className="px-2.5 py-2 text-right"><PrintAmount value={formatBDT(Number(payable.aitTdsAmount ?? 0))} /></td>
                        <td className="px-2.5 py-2 text-right"><PrintAmount value={formatBDT(Number(payable.otherDeductionAmount ?? 0))} /></td>
                      </tr>
                    ))}
                  </tbody>
                </PrintTable>
              </PrintSection>
            </PrintPage>
          ) : null}

          {shouldShow(showEmpty, retentionRows.length) ? (
            <PrintPage breakBefore>
              <PrintSection title="Retention Summary" description="Retention held, released, and outstanding balances.">
                <PrintTable dense>
                  <thead>
                    <tr className="border-b border-slate-300 bg-slate-100 text-left text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-700">
                      <th className="px-2.5 py-2">Party</th>
                      <th className="px-2.5 py-2">Bill</th>
                      <th className="px-2.5 py-2 text-right">Held</th>
                      <th className="px-2.5 py-2 text-right">Released</th>
                      <th className="px-2.5 py-2 text-right">Balance</th>
                      <th className="px-2.5 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {retentionRows.map((payable) => (
                      <tr key={payable.id} className="border-b border-slate-200">
                        <td className="px-2.5 py-2 font-medium text-slate-900">{payable.supplier.name}</td>
                        <td className="px-2.5 py-2 text-slate-700">{payable.billNo ?? 'Project bill'}</td>
                        <td className="px-2.5 py-2 text-right"><PrintAmount value={formatBDT(Number(payable.retentionAmount ?? 0))} /></td>
                        <td className="px-2.5 py-2 text-right"><PrintAmount value={formatBDT(Number(payable.retentionReleasedAmount ?? 0))} tone="positive" /></td>
                        <td className="px-2.5 py-2 text-right"><PrintAmount value={formatBDT(Math.max(Number(payable.retentionAmount ?? 0) - Number(payable.retentionReleasedAmount ?? 0), 0))} tone="negative" /></td>
                        <td className="px-2.5 py-2 text-slate-700">{payable.retentionStatus.replaceAll('_', ' ')}</td>
                      </tr>
                    ))}
                  </tbody>
                </PrintTable>
              </PrintSection>
            </PrintPage>
          ) : null}

          <PrintPage breakBefore>
            <PrintSection title="Service Charge Summary" description="Company Service Charge / Supervision Fee by phase or work item.">
              <PrintTable dense>
                <thead>
                  <tr className="border-b border-slate-300 bg-slate-100 text-left text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-700">
                    <th className="px-2.5 py-2">Phase / Work</th>
                    <th className="px-2.5 py-2 text-right">Construction Cost</th>
                    <th className="px-2.5 py-2 text-right">Percent</th>
                    <th className="px-2.5 py-2 text-right">Calculated</th>
                    <th className="px-2.5 py-2 text-right">Billed</th>
                    <th className="px-2.5 py-2 text-right">Collected</th>
                    <th className="px-2.5 py-2 text-right">Uncollected</th>
                    <th className="px-2.5 py-2">Flow Note</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.serviceChargeLedger?.rows ?? []).map((row) => (
                    <tr key={`${row.phaseId ?? 'project'}-${row.entryId ?? row.phaseName}`} className="border-b border-slate-200">
                      <td className="px-2.5 py-2 font-medium text-slate-900">{row.phaseName}</td>
                      <td className="px-2.5 py-2 text-right"><PrintAmount value={formatBDT(row.basisAmount)} /></td>
                      <td className="px-2.5 py-2 text-right text-slate-700">{Number(row.percentage ?? 0).toFixed(2)}%</td>
                      <td className="px-2.5 py-2 text-right"><PrintAmount value={formatBDT(row.serviceChargeAmount)} tone="info" /></td>
                      <td className="px-2.5 py-2 text-right"><PrintAmount value={formatBDT(row.billedAmount)} /></td>
                      <td className="px-2.5 py-2 text-right"><PrintAmount value={formatBDT(row.collectedAmount)} tone="positive" /></td>
                      <td className="px-2.5 py-2 text-right"><PrintAmount value={formatBDT(row.uncollectedAmount)} tone={row.uncollectedAmount > 0 ? 'warning' : 'default'} /></td>
                      <td className="px-2.5 py-2">
                        <PrintStatusPill
                          label={
                            row.includedInDemand
                              ? 'Demand-linked'
                              : row.settlementStatus === 'SETTLED'
                                ? 'Legacy separate settlement'
                                : row.settlementStatus.replaceAll('_', ' ')
                          }
                          tone={row.includedInDemand ? 'positive' : statusTone(row.settlementStatus)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </PrintTable>
            </PrintSection>
          </PrintPage>
        </>
      ) : null}

      {hasReportSection(filters, 'final-reconciliation') && data.reconciliationPreview ? (
        <PrintPage breakBefore>
          <PrintSection title="Final Reconciliation Summary" description="Ownership-based final surplus or deficit distribution.">
            <PrintSummaryTable
              rows={[
                { label: 'Final result', value: formatBDT(data.reconciliationPreview.finalSurplusDeficit), tone: amountTone(data.reconciliationPreview.finalSurplusDeficit) },
                { label: 'Direction', value: data.reconciliationPreview.direction },
                { label: 'Can post', value: data.reconciliationPreview.canPost ? 'Yes' : 'No', tone: data.reconciliationPreview.canPost ? 'positive' : 'warning' },
                { label: 'Posted', value: data.reconciliationPreview.posted ? 'Yes' : 'No', tone: data.reconciliationPreview.posted ? 'positive' : 'warning' },
              ]}
            />
          </PrintSection>
        </PrintPage>
      ) : null}

      {hasReportSection(filters, 'audit-summary') ? (
        <PrintPage breakBefore>
          <PrintSection title="Audit / Missing Voucher Summary" description="Voucher gaps, pending approvals, reversals, audit locks, and current report limitations.">
            <PrintSummaryTable
              rows={[
                { label: 'Missing vouchers', value: String(data.auditSummary.missingVoucher.length), tone: data.auditSummary.missingVoucher.length ? 'warning' : 'default' },
                { label: 'Pending approvals', value: String(data.auditSummary.pendingApprovals.length), tone: data.auditSummary.pendingApprovals.length ? 'warning' : 'default' },
                { label: 'Reversed records', value: String(data.auditSummary.reversedRecords.length), tone: data.auditSummary.reversedRecords.length ? 'warning' : 'default' },
                { label: 'Audit locked phases', value: String(data.auditSummary.lockedPhases.length), tone: data.auditSummary.lockedPhases.length ? 'info' : 'default' },
              ]}
            />
          </PrintSection>
        </PrintPage>
      ) : null}

      <PrintPage>
        <PrintSignatureBlock labels={['Prepared by', 'Checked by', 'Approved by', 'Company seal / signature']} />
      </PrintPage>
    </PrintDocumentShell>
  );
}

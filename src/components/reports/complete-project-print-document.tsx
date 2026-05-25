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
import type { getCompleteProjectReportData } from '@/lib/complete-project-report';
import { hasReportSection } from '@/lib/report-controls';
import { expenseCategoryLabel, formatBDT, formatDate } from '@/lib/utils';

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
    <ReportDocumentLayout
      branding={data.branding}
      project={data.project}
      title="Complete Project Report"
      subtitle="Print/PDF document generated from the same controlled report data as the screen and workbook."
      generatedAt={data.generatedAt}
      showHeader={false}
      showToolbar={false}
    >
      <ReportCoverPage
        branding={data.branding}
        project={data.project}
        title="Complete Project Report"
        reportingPeriod={data.reportingPeriod}
        generatedAt={data.generatedAt}
        generatedBy={generatedBy}
        note="This print document uses full document flow for browser Print / Save as PDF. Supplier bill items appear in daily project cost details; supplier ledger remains a separate payable report."
      />

      <ReportPageBreak />

      {data.reportNotes.length > 0 ? (
        <ReportNoteBox title="Data quality and interpretation note" tone="info">
          <ul className="space-y-1">
            {data.reportNotes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </ReportNoteBox>
      ) : null}

      {hasReportSection(filters, 'overview') ? (
        <ReportSection title="Complete Project Overview" description="Project identity, reporting controls, and seeded finance continuity.">
          <ReportTable>
            <tbody>
              {[
                ['Project code', data.project.code || 'Not assigned'],
                ['Project address', data.project.address || 'Project address not recorded'],
                ['Reporting period', data.reportingPeriod],
                ['Report mode', filters.detailMode.replace('-', ' ')],
                ['Cost rows in this slice', `${data.costReport.rows.length} of ${data.costReport.allRowsCount}`],
                ['Historical Top Sheet continuity', `Income ${formatBDT(data.summary.totalCollected)} | Expense ${formatBDT(data.summary.totalExpense)} | Balance ${formatBDT(data.summary.projectBalance)}`],
              ].map(([label, value]) => (
                <tr key={label} className="border-b border-slate-200">
                  <td className="w-[230px] px-4 py-3 font-medium text-slate-900">{label}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{value}</td>
                </tr>
              ))}
            </tbody>
          </ReportTable>
        </ReportSection>
      ) : null}

      {hasReportSection(filters, 'executive-summary') ? (
        <ReportSection title="Executive Financial Summary" description="Demand, collection, unified cost, payable, treasury, reconciliation, and audit exposure.">
          <ReportSummaryGrid>
            <ReportKpiCard label="Historical Collection" value={formatBDT(data.summary.totalCollected)} tone="positive" />
            <ReportKpiCard label="Issued Demand" value={formatBDT(data.summary.issuedDemand)} tone={data.summary.issuedDemand > 0 ? 'info' : 'warning'} />
            <ReportKpiCard label="Allocated Collection" value={formatBDT(data.summary.allocatedCollection)} tone="positive" />
            <ReportKpiCard label="Buyer Due" value={formatBDT(data.summary.buyerReceivable)} tone={data.summary.buyerReceivable > 0 ? 'negative' : 'default'} />
            <ReportKpiCard label="Actual Construction Cost" value={formatBDT(data.costReport.totals.DIRECT_EXPENSE + data.costReport.totals.SUPPLIER_BILL_ITEM + data.costReport.totals.SUBCONTRACTOR_PROGRESS_BILL + data.costReport.totals.ADJUSTMENT)} tone="negative" />
            <ReportKpiCard label="Company Service Charge" value={formatBDT(data.costReport.totals.COMPANY_SERVICE_CHARGE)} tone="info" />
            <ReportKpiCard label="Total Billable Cost" value={formatBDT(data.costReport.totals.total)} tone="negative" />
            <ReportKpiCard label="Project Balance" value={formatBDT(data.summary.projectBalance)} tone={amountTone(data.summary.projectBalance)} />
            <ReportKpiCard label="Supplier Payable" value={formatBDT(data.summary.supplierPayable)} tone={data.summary.supplierPayable > 0 ? 'negative' : 'default'} />
            <ReportKpiCard label="Subcontractor Payable" value={formatBDT(data.summary.subcontractorPayable)} tone={data.summary.subcontractorPayable > 0 ? 'negative' : 'default'} />
            <ReportKpiCard label="Cash In" value={formatBDT(data.summary.cashIn)} tone="positive" />
            <ReportKpiCard label="Cash Out" value={formatBDT(data.summary.cashOut)} tone="negative" />
          </ReportSummaryGrid>
        </ReportSection>
      ) : null}

      {hasReportSection(filters, 'phase-summary') ? (
        <ReportSection title="Phase Summary" description="Collection, actual construction cost, company service charge, total billable phase cost, and phase balance.">
          <ReportTable dense>
            <thead>
              <tr className="border-b bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-3 py-3">Phase</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3 text-right">Collection</th>
                <th className="px-3 py-3 text-right">Construction Cost</th>
                <th className="px-3 py-3 text-right">Service Charge</th>
                <th className="px-3 py-3 text-right">Billable Cost</th>
                <th className="px-3 py-3 text-right">Phase Balance</th>
                <th className="px-3 py-3 text-right">Missing Vouchers</th>
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
                    <td className="px-3 py-3 text-right"><ReportAmount value={formatBDT(row.actualConstructionCost)} tone="negative" /></td>
                    <td className="px-3 py-3 text-right"><ReportAmount value={formatBDT(row.serviceChargeCostTotal)} tone="info" /></td>
                    <td className="px-3 py-3 text-right"><ReportAmount value={formatBDT(row.totalBillablePhaseCost)} tone="negative" /></td>
                    <td className="px-3 py-3 text-right"><ReportAmount value={formatBDT(row.phaseBalance)} tone={amountTone(row.phaseBalance)} /></td>
                    <td className="px-3 py-3 text-right text-slate-700">{costGroup?.voucherMissingCount ?? 0}</td>
                  </tr>
                );
              })}
            </tbody>
          </ReportTable>
        </ReportSection>
      ) : null}

      {hasReportSection(filters, 'phase-details') ? (
        <ReportSection title="Phase Detail Sections" description="Each phase shows category breakdown and daily project cost rows from the unified project cost builder.">
          {data.costReport.phaseGroups.map((group, index) => {
            const phaseRow = data.phaseSummary.find((row) => row.phaseId === group.phaseId);
            return (
              <section key={group.phaseId ?? `project-general-${index}`} data-report-page="true" className="space-y-4">
                <div className="border-b border-slate-200 pb-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Phase Detail</div>
                  <h3 className="mt-1 text-xl font-semibold tracking-tight text-slate-950">{group.phaseName}</h3>
                </div>
                <ReportSummaryGrid>
                  <ReportKpiCard label="Collection" value={formatBDT(phaseRow?.collection ?? 0)} tone="positive" />
                  <ReportKpiCard label="Construction Cost" value={formatBDT((group.totals.DIRECT_EXPENSE ?? 0) + (group.totals.SUPPLIER_BILL_ITEM ?? 0) + (group.totals.SUBCONTRACTOR_PROGRESS_BILL ?? 0) + (group.totals.ADJUSTMENT ?? 0))} tone="negative" />
                  <ReportKpiCard label="Service Charge" value={formatBDT(group.totals.COMPANY_SERVICE_CHARGE)} tone="info" />
                  <ReportKpiCard label="Billable Cost" value={formatBDT(group.totalCost)} tone="negative" />
                </ReportSummaryGrid>

                {shouldShow(showEmpty, group.categoryBreakdown.length) ? (
                  <ReportTable dense>
                    <thead>
                      <tr className="border-b bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        <th className="px-3 py-3">Category</th>
                        <th className="px-3 py-3 text-right">Rows</th>
                        <th className="px-3 py-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.categoryBreakdown.length === 0 ? (
                        <tr><td className="px-3 py-6 text-center text-slate-500" colSpan={3}>No category rows found for this phase.</td></tr>
                      ) : (
                        group.categoryBreakdown.map((row) => (
                          <tr key={row.category} className="border-b border-slate-200">
                            <td className="px-3 py-3 font-medium text-slate-900">{expenseCategoryLabel(row.category)}</td>
                            <td className="px-3 py-3 text-right text-slate-700">{row.rowCount}</td>
                            <td className="px-3 py-3 text-right"><ReportAmount value={formatBDT(row.amount)} tone={row.category === 'SERVICE_CHARGE' ? 'info' : 'negative'} /></td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </ReportTable>
                ) : null}

                {shouldShow(showEmpty, group.rows.length) ? (
                  <ReportTable dense>
                    <thead>
                      <tr className="border-b bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        <th className="px-3 py-3">Date</th>
                        <th className="px-3 py-3">Source</th>
                        <th className="px-3 py-3">Bill / Voucher</th>
                        <th className="px-3 py-3">Party</th>
                        <th className="px-3 py-3">Description</th>
                        <th className="px-3 py-3 text-right">Qty</th>
                        <th className="px-3 py-3 text-right">Rate</th>
                        <th className="px-3 py-3 text-right">Amount</th>
                        <th className="px-3 py-3">Voucher</th>
                        <th className="px-3 py-3">Approval</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.rows.length === 0 ? (
                        <tr><td className="px-3 py-6 text-center text-slate-500" colSpan={10}>No daily project cost rows found.</td></tr>
                      ) : (
                        group.rows.map((row) => (
                          <tr key={row.id} className="border-b border-slate-200 align-top">
                            <td className="px-3 py-3 text-slate-700">{formatDate(row.date)}</td>
                            <td className="px-3 py-3">{sourceTypeLabel(row.sourceType)}</td>
                            <td className="px-3 py-3 font-mono text-[11px] text-slate-600">{row.sourceNo}</td>
                            <td className="px-3 py-3 text-slate-700">{row.partyName}</td>
                            <td className="px-3 py-3">
                              <div className="font-medium text-slate-900">{row.description}</div>
                              <div className="text-[11px] text-slate-500">{expenseCategoryLabel(row.category)}</div>
                            </td>
                            <td className="px-3 py-3 text-right text-slate-700">{row.quantity != null ? `${row.quantity} ${row.unit ?? ''}` : '-'}</td>
                            <td className="px-3 py-3 text-right text-slate-700">{row.rate != null ? formatBDT(row.rate) : '-'}</td>
                            <td className="px-3 py-3 text-right"><ReportAmount value={formatBDT(row.amount)} tone={row.sourceType === 'COMPANY_SERVICE_CHARGE' ? 'info' : 'negative'} /></td>
                            <td className="px-3 py-3"><ReportStatusBadge label={row.voucherStatus.replaceAll('_', ' ')} tone={statusTone(row.voucherStatus)} /></td>
                            <td className="px-3 py-3"><ReportStatusBadge label={row.approvalStatus.replaceAll('_', ' ')} tone={statusTone(row.approvalStatus)} /></td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </ReportTable>
                ) : null}
              </section>
            );
          })}
        </ReportSection>
      ) : null}

      {hasReportSection(filters, 'buyer-billing') && shouldShow(showEmpty, data.buyerBillingSummary.length) ? (
        <ReportSection title="Buyer Billing & Due" description="Buyer-level demand, collection, allocation, due, and advance.">
          <ReportTable dense>
            <thead>
              <tr className="border-b bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-3 py-3">Buyer</th>
                <th className="px-3 py-3">Units</th>
                <th className="px-3 py-3 text-right">Issued Demand</th>
                <th className="px-3 py-3 text-right">Collection</th>
                <th className="px-3 py-3 text-right">Allocated</th>
                <th className="px-3 py-3 text-right">Due</th>
                <th className="px-3 py-3 text-right">Advance</th>
              </tr>
            </thead>
            <tbody>
              {data.buyerBillingSummary.map((row) => (
                <tr key={row.buyerId} className="border-b border-slate-200">
                  <td className="px-3 py-3 font-medium text-slate-900">{row.buyerName}</td>
                  <td className="px-3 py-3 text-slate-700">{row.unitsText}</td>
                  <td className="px-3 py-3 text-right"><ReportAmount value={formatBDT(row.demanded)} /></td>
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

      {hasReportSection(filters, 'supplier-ledger') && shouldShow(showEmpty, data.projectSupplierAssignments.length) ? (
        <ReportSection title="Supplier Ledger Summary" description="Supplier-wise billed, paid, payable, and invoice/document status.">
          <ReportTable dense>
            <thead>
              <tr className="border-b bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-3 py-3">Supplier</th>
                <th className="px-3 py-3">Assignment</th>
                <th className="px-3 py-3 text-right">Bill Total</th>
                <th className="px-3 py-3 text-right">Paid</th>
                <th className="px-3 py-3 text-right">Payable</th>
                <th className="px-3 py-3 text-right">Documents</th>
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
                  <td className="px-3 py-3 text-right text-slate-700">{assignment.summary.documentCount}</td>
                </tr>
              ))}
            </tbody>
          </ReportTable>
        </ReportSection>
      ) : null}

      {hasReportSection(filters, 'subcontractor-ledger') && shouldShow(showEmpty, data.projectSubcontractorAssignments.length) ? (
        <ReportSection title="Subcontractor Ledger Summary" description="Subcontractor work-package bill, paid, due, retention, and document status.">
          <ReportTable dense>
            <thead>
              <tr className="border-b bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-3 py-3">Subcontractor</th>
                <th className="px-3 py-3">Work Type</th>
                <th className="px-3 py-3 text-right">Contract</th>
                <th className="px-3 py-3 text-right">Bill Total</th>
                <th className="px-3 py-3 text-right">Paid</th>
                <th className="px-3 py-3 text-right">Due</th>
                <th className="px-3 py-3 text-right">Retention</th>
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
                </tr>
              ))}
            </tbody>
          </ReportTable>
        </ReportSection>
      ) : null}

      {hasReportSection(filters, 'cash-bank') ? (
        <ReportSection title="Cash / Bank Summary" description="Account-wise treasury movement.">
          <ReportSummaryGrid>
            <ReportKpiCard label="Cash In" value={formatBDT(data.cashBankSummary?.totals.inflow ?? 0)} tone="positive" />
            <ReportKpiCard label="Cash Out" value={formatBDT(data.cashBankSummary?.totals.outflow ?? 0)} tone="negative" />
            <ReportKpiCard label="Net Movement" value={formatBDT(data.cashBankSummary?.totals.netMovement ?? 0)} tone={amountTone(data.cashBankSummary?.totals.netMovement ?? 0)} />
            <ReportKpiCard label="Account Balance" value={formatBDT(data.cashBankSummary?.totals.accountBalance ?? 0)} tone="info" />
          </ReportSummaryGrid>
        </ReportSection>
      ) : null}

      {hasReportSection(filters, 'cheques') && shouldShow(showEmpty, data.chequeSummary.cheques.length) ? (
        <ReportSection title="Cheque Register Summary" description="Issued and received cheques by party, amount, and current status.">
          <ReportTable dense>
            <thead>
              <tr className="border-b bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-3 py-3">Cheque No</th>
                <th className="px-3 py-3">Type</th>
                <th className="px-3 py-3">Party</th>
                <th className="px-3 py-3 text-right">Amount</th>
                <th className="px-3 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.chequeSummary.cheques.map((cheque) => (
                <tr key={cheque.id} className="border-b border-slate-200">
                  <td className="px-3 py-3 font-medium text-slate-900">{cheque.chequeNo}</td>
                  <td className="px-3 py-3 text-slate-700">{cheque.chequeType.replaceAll('_', ' ')}</td>
                  <td className="px-3 py-3 text-slate-700">{cheque.partyName ?? cheque.partyType}</td>
                  <td className="px-3 py-3 text-right"><ReportAmount value={formatBDT(Number(cheque.amount))} /></td>
                  <td className="px-3 py-3"><ReportStatusBadge label={cheque.status.replaceAll('_', ' ')} tone={statusTone(cheque.status)} /></td>
                </tr>
              ))}
            </tbody>
          </ReportTable>
        </ReportSection>
      ) : null}

      {hasReportSection(filters, 'tax-retention-service-charge') ? (
        <>
          {shouldShow(showEmpty, taxRows.length) ? (
            <ReportSection title="Tax / Deduction Summary" description="Bill-level VAT, AIT/TDS, and other deductions.">
              <ReportTable dense>
                <thead>
                  <tr className="border-b bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-3 py-3">Party</th>
                    <th className="px-3 py-3">Bill</th>
                    <th className="px-3 py-3 text-right">VAT</th>
                    <th className="px-3 py-3 text-right">AIT / TDS</th>
                    <th className="px-3 py-3 text-right">Other</th>
                  </tr>
                </thead>
                <tbody>
                  {taxRows.map((payable) => (
                    <tr key={payable.id} className="border-b border-slate-200">
                      <td className="px-3 py-3 font-medium text-slate-900">{payable.supplier.name}</td>
                      <td className="px-3 py-3 text-slate-700">{payable.billNo ?? 'Project bill'}</td>
                      <td className="px-3 py-3 text-right"><ReportAmount value={formatBDT(Number(payable.vatAmount ?? 0))} /></td>
                      <td className="px-3 py-3 text-right"><ReportAmount value={formatBDT(Number(payable.aitTdsAmount ?? 0))} /></td>
                      <td className="px-3 py-3 text-right"><ReportAmount value={formatBDT(Number(payable.otherDeductionAmount ?? 0))} /></td>
                    </tr>
                  ))}
                </tbody>
              </ReportTable>
            </ReportSection>
          ) : null}

          {shouldShow(showEmpty, retentionRows.length) ? (
            <ReportSection title="Retention Summary" description="Retention held, released, and outstanding balances.">
              <ReportTable dense>
                <thead>
                  <tr className="border-b bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-3 py-3">Party</th>
                    <th className="px-3 py-3">Bill</th>
                    <th className="px-3 py-3 text-right">Held</th>
                    <th className="px-3 py-3 text-right">Released</th>
                    <th className="px-3 py-3 text-right">Balance</th>
                    <th className="px-3 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {retentionRows.map((payable) => (
                    <tr key={payable.id} className="border-b border-slate-200">
                      <td className="px-3 py-3 font-medium text-slate-900">{payable.supplier.name}</td>
                      <td className="px-3 py-3 text-slate-700">{payable.billNo ?? 'Project bill'}</td>
                      <td className="px-3 py-3 text-right"><ReportAmount value={formatBDT(Number(payable.retentionAmount ?? 0))} /></td>
                      <td className="px-3 py-3 text-right"><ReportAmount value={formatBDT(Number(payable.retentionReleasedAmount ?? 0))} tone="positive" /></td>
                      <td className="px-3 py-3 text-right"><ReportAmount value={formatBDT(Math.max(Number(payable.retentionAmount ?? 0) - Number(payable.retentionReleasedAmount ?? 0), 0))} tone="negative" /></td>
                      <td className="px-3 py-3 text-slate-700">{payable.retentionStatus.replaceAll('_', ' ')}</td>
                    </tr>
                  ))}
                </tbody>
              </ReportTable>
            </ReportSection>
          ) : null}

          <ReportSection title="Service Charge Summary" description="Company Service Charge / Supervision Fee by phase or work item.">
            <ReportTable dense>
              <thead>
                <tr className="border-b bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-3 py-3">Phase / Work</th>
                  <th className="px-3 py-3 text-right">Basis</th>
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
                    <td className="px-3 py-3">{row.includedInDemand ? 'Yes' : 'No'}</td>
                  </tr>
                ))}
              </tbody>
            </ReportTable>
          </ReportSection>
        </>
      ) : null}

      {hasReportSection(filters, 'final-reconciliation') && data.reconciliationPreview ? (
        <ReportSection title="Final Reconciliation Summary" description="Ownership-based final surplus or deficit distribution.">
          <ReportSummaryGrid>
            <ReportKpiCard label="Final Result" value={formatBDT(data.reconciliationPreview.finalSurplusDeficit)} tone={amountTone(data.reconciliationPreview.finalSurplusDeficit)} />
            <ReportKpiCard label="Direction" value={data.reconciliationPreview.direction} />
            <ReportKpiCard label="Can Post" value={data.reconciliationPreview.canPost ? 'Yes' : 'No'} tone={data.reconciliationPreview.canPost ? 'positive' : 'warning'} />
            <ReportKpiCard label="Posted" value={data.reconciliationPreview.posted ? 'Yes' : 'No'} tone={data.reconciliationPreview.posted ? 'positive' : 'warning'} />
          </ReportSummaryGrid>
        </ReportSection>
      ) : null}

      {hasReportSection(filters, 'audit-summary') ? (
        <ReportSection title="Audit / Missing Voucher Summary" description="Voucher gaps, pending approvals, reversals, audit-locked phases, and report limitations.">
          <ReportSummaryGrid>
            <ReportKpiCard label="Missing Vouchers" value={String(data.auditSummary.missingVoucher.length)} tone={data.auditSummary.missingVoucher.length ? 'warning' : 'default'} />
            <ReportKpiCard label="Pending Approvals" value={String(data.auditSummary.pendingApprovals.length)} tone={data.auditSummary.pendingApprovals.length ? 'warning' : 'default'} />
            <ReportKpiCard label="Reversed Records" value={String(data.auditSummary.reversedRecords.length)} tone={data.auditSummary.reversedRecords.length ? 'warning' : 'default'} />
            <ReportKpiCard label="Audit Locked Phases" value={String(data.auditSummary.lockedPhases.length)} tone={data.auditSummary.lockedPhases.length ? 'info' : 'default'} />
          </ReportSummaryGrid>
        </ReportSection>
      ) : null}

      <ReportPageBreak />
      <ReportSignatureBlock labels={['Prepared by', 'Checked by', 'Approved by', 'Company seal / signature']} />
    </ReportDocumentLayout>
  );
}

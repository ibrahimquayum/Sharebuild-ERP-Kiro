import { notFound } from 'next/navigation';
import { getScopedProject } from '@/lib/access-control';
import { getCompleteProjectReportData } from '@/lib/complete-project-report';
import { balanceColor, cn, expenseCategoryLabel, formatBDT, formatDate } from '@/lib/utils';
import { ReportPageLayout, ReportSection, ReportSignatureBlock } from '@/components/reports/report-page-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

function MiniStat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-md border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={cn('mt-1 text-lg font-bold', tone)}>{value}</div>
    </div>
  );
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

  return (
    <ReportPageLayout
        branding={data.branding}
        project={data.project}
        title="Complete Project Report"
        subtitle="Executive summary, Top Sheet, phase balances, expenses, payables, buyer due, and audit summary"
        workbookHref={`/api/projects/${data.project.id}/reports/complete-project/xlsx`}
        csvHref={`/api/projects/${data.project.id}/reports/complete-project/excel`}
      >

      <ReportSection title="Executive Summary">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <MiniStat label="Total Demand" value={formatBDT(data.summary.totalDemanded)} />
          <MiniStat label="Total Collection" value={formatBDT(data.summary.totalCollected)} tone="text-green-600" />
          <MiniStat label="Buyer Due" value={formatBDT(data.summary.buyerReceivable)} tone="text-red-600" />
          <MiniStat label="Buyer Advance" value={formatBDT(data.summary.buyerAdvance)} tone="text-blue-600" />
          <MiniStat label="Approved Expense" value={formatBDT(data.summary.totalExpense)} tone="text-red-600" />
          <MiniStat label="Service Charge" value={formatBDT(data.summary.serviceChargeAccrued)} />
          <MiniStat label="Tax / Deduction" value={formatBDT(data.summary.taxDeductionTotal)} tone="text-fuchsia-600" />
          <MiniStat label="Retention Held" value={formatBDT(data.summary.retentionHeld)} tone="text-cyan-600" />
          <MiniStat label="Supplier Payable" value={formatBDT(data.summary.supplierPayable)} />
          <MiniStat label="Subcontractor Payable" value={formatBDT(data.summary.subcontractorPayable)} />
          <MiniStat label="Project Balance" value={formatBDT(data.summary.projectBalance)} tone={balanceColor(data.summary.projectBalance)} />
          <MiniStat label="Missing Vouchers" value={String(data.auditSummary.missingVoucher.length)} tone="text-amber-600" />
          <MiniStat label="Pending Approvals" value={String(data.auditSummary.pendingApprovals.length)} tone="text-amber-600" />
          <MiniStat label="Audit Locked Phases" value={String(data.auditSummary.lockedPhases.length)} />
          <MiniStat label="Surplus / Deficit" value={formatBDT(data.summary.surplusDeficit)} tone={balanceColor(data.summary.surplusDeficit)} />
        </div>
      </ReportSection>

      <ReportSection title="Top Sheet">
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/40"><th className="px-3 py-2 text-left">Phase</th><th className="px-3 py-2 text-left">Type</th><th className="px-3 py-2 text-right">Income</th><th className="px-3 py-2 text-right">Expense</th><th className="px-3 py-2 text-right">Balance</th></tr></thead>
              <tbody>
                {data.topSheet.map((row) => (
                  <tr key={row.phaseId} className="border-b">
                    <td className="px-3 py-2 font-medium">{row.phaseName}</td>
                    <td className="px-3 py-2 text-muted-foreground">{row.phaseType}</td>
                    <td className="px-3 py-2 text-right text-green-600">{formatBDT(row.income)}</td>
                    <td className="px-3 py-2 text-right text-red-600">{formatBDT(row.expense)}</td>
                    <td className={cn('px-3 py-2 text-right font-bold', balanceColor(row.balance))}>{formatBDT(row.balance)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr className="bg-muted/60 font-bold"><td colSpan={2} className="px-3 py-2">Grand Total</td><td className="px-3 py-2 text-right text-green-600">{formatBDT(data.summary.totalCollected)}</td><td className="px-3 py-2 text-right text-red-600">{formatBDT(data.summary.totalExpense)}</td><td className={cn('px-3 py-2 text-right', balanceColor(data.summary.projectBalance))}>{formatBDT(data.summary.projectBalance)}</td></tr></tfoot>
            </table>
          </CardContent>
        </Card>
      </ReportSection>

      <ReportSection title="Phase Summary">
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="border-b bg-muted/40"><th className="px-3 py-2 text-left">Phase</th><th>Status</th><th className="text-right">Demand</th><th className="text-right">Collection</th><th className="text-right">Expense</th><th className="text-right">Supplier</th><th className="text-right">Subcontractor</th><th className="text-right">Carry Out</th><th>Audit</th></tr></thead>
              <tbody>
                {data.phaseSummary.map((row) => (
                  <tr key={row.phaseId} className="border-b">
                    <td className="px-3 py-2 font-medium">{row.phaseName}</td><td>{row.status}</td><td className="text-right">{formatBDT(row.demand)}</td><td className="text-right">{formatBDT(row.collection)}</td><td className="text-right">{formatBDT(row.expense)}</td><td className="text-right">{formatBDT(row.supplierBill)}</td><td className="text-right">{formatBDT(row.subcontractorBill)}</td><td className={cn('text-right font-bold', balanceColor(row.carryOut))}>{formatBDT(row.carryOut)}</td><td>{row.auditLocked ? 'Locked' : 'Open'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </ReportSection>

      <ReportSection title="Daily Expenses By Phase">
        {Object.entries(groupedExpenses).map(([phaseName, expenses]) => (
          <Card key={phaseName} className="print:break-inside-avoid">
            <CardHeader><CardTitle className="text-sm">{phaseName}</CardTitle></CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="border-b bg-muted/40"><th className="px-3 py-2 text-left">Date</th><th className="text-left">Category</th><th className="text-left">Description</th><th className="text-left">Supplier / Local Shop</th><th className="text-right">Amount</th><th>Status</th><th>Voucher</th></tr></thead>
                <tbody>
                  {expenses.map((expense) => (
                    <tr key={expense.id} className="border-b"><td className="px-3 py-2">{formatDate(expense.expenseDate)}</td><td>{expenseCategoryLabel(expense.category)}</td><td>{expense.description}</td><td>{expense.supplier?.name ?? expense.localShopName ?? 'Cash / no supplier'}</td><td className="text-right">{formatBDT(Number(expense.amount))}</td><td>{expense.status}</td><td>{expense.documents.length > 0 ? 'Attached' : 'Missing'}</td></tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        ))}
      </ReportSection>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <ReportSection title="Supplier Assignment Summary">
          <Card><CardContent className="p-0 overflow-x-auto"><table className="w-full text-xs"><thead><tr className="border-b bg-muted/40"><th className="px-3 py-2 text-left">Supplier</th><th>Category</th><th className="text-right">Billed</th><th className="text-right">Paid</th><th className="text-right">Payable</th><th className="text-right">Docs</th></tr></thead><tbody>{data.projectSupplierAssignments.map((assignment) => <tr key={assignment.id} className="border-b"><td className="px-3 py-2">{assignment.supplier.name}</td><td>{assignment.materialCategory || '-'}</td><td className="text-right">{formatBDT(assignment.summary.totalBilled)}</td><td className="text-right">{formatBDT(assignment.summary.totalPaid)}</td><td className="text-right">{formatBDT(assignment.summary.totalDue)}</td><td className="text-right">{assignment.summary.documentCount}</td></tr>)}</tbody></table></CardContent></Card>
        </ReportSection>
        <ReportSection title="Subcontractor Contract Summary">
          <Card><CardContent className="p-0 overflow-x-auto"><table className="w-full text-xs"><thead><tr className="border-b bg-muted/40"><th className="px-3 py-2 text-left">Subcontractor</th><th>Work Type</th><th className="text-right">Contract</th><th className="text-right">Billed</th><th className="text-right">Paid</th><th className="text-right">Due</th></tr></thead><tbody>{data.projectSubcontractorAssignments.map((assignment) => <tr key={assignment.id} className="border-b"><td className="px-3 py-2">{assignment.supplier.name}</td><td>{assignment.workType.replaceAll('_', ' ')}</td><td className="text-right">{formatBDT(Number(assignment.contractAmount ?? 0) + Number(assignment.extraWorkAmount ?? 0))}</td><td className="text-right">{formatBDT(assignment.summary.totalBilled)}</td><td className="text-right">{formatBDT(assignment.summary.totalPaid)}</td><td className="text-right">{formatBDT(assignment.summary.totalDue)}</td></tr>)}</tbody></table></CardContent></Card>
        </ReportSection>
      </div>

      <ReportSection title="Treasury Snapshot">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <MiniStat label="Cash In" value={formatBDT(data.summary.cashIn)} tone="text-green-600" />
          <MiniStat label="Cash Out" value={formatBDT(data.summary.cashOut)} tone="text-red-600" />
          <MiniStat label="Pending Received Cheques" value={formatBDT(data.summary.pendingReceivedCheques)} />
          <MiniStat label="Pending Issued Cheques" value={formatBDT(data.summary.pendingIssuedCheques)} />
        </div>
      </ReportSection>

      <ReportSection title="Buyer Due Summary">
        <Card><CardContent className="p-0 overflow-x-auto"><table className="w-full text-xs"><thead><tr className="border-b bg-muted/40"><th className="px-3 py-2 text-left">Buyer</th><th>Units</th><th className="text-right">Demanded</th><th className="text-right">Paid</th><th className="text-right">Due</th><th className="text-right">Advance</th><th>Oldest Due</th></tr></thead><tbody>{data.buyerDue.map((row) => <tr key={row.buyerId} className="border-b"><td className="px-3 py-2">{row.buyerName}</td><td>{row.unitsText || '-'}</td><td className="text-right">{formatBDT(row.demanded)}</td><td className="text-right">{formatBDT(row.paid)}</td><td className="text-right">{formatBDT(row.due)}</td><td className="text-right">{formatBDT(row.advance)}</td><td>{formatDate(row.oldestDue)}</td></tr>)}</tbody></table></CardContent></Card>
      </ReportSection>

      <ReportSection title="Audit Summary">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <MiniStat label="Reversed Records" value={String(data.auditSummary.reversedRecords.length)} />
          <MiniStat label="Missing Vouchers" value={String(data.auditSummary.missingVoucher.length)} tone="text-amber-600" />
          <MiniStat label="Pending Approvals" value={String(data.auditSummary.pendingApprovals.length)} tone="text-amber-600" />
        </div>
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-xs"><thead><tr className="border-b bg-muted/40"><th className="px-3 py-2 text-left">Type</th><th className="text-left">Record</th><th className="text-right">Amount</th><th className="text-left">Reason</th></tr></thead><tbody>{data.auditSummary.reversedRecords.length === 0 ? <tr><td colSpan={4} className="px-3 py-8 text-center text-muted-foreground">No reversed records.</td></tr> : data.auditSummary.reversedRecords.map((row, index) => <tr key={`${row.type}-${index}`} className="border-b"><td className="px-3 py-2">{row.type}</td><td>{row.label}</td><td className="text-right">{formatBDT(row.amount)}</td><td>{row.reason}</td></tr>)}</tbody></table>
          </CardContent>
        </Card>
      </ReportSection>

      <ReportSection title="Signature">
        <ReportSignatureBlock />
      </ReportSection>
    </ReportPageLayout>
  );
}

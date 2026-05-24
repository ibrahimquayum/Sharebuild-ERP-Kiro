import {
  ReportDocumentLayout,
  ReportKpiCard,
  ReportSection,
  ReportSummaryGrid,
  ReportTable,
} from '@/components/reports/report-document';
import { getProjectCashBankSummary } from '@/lib/cash-bank';
import { getProjectReportContext } from '@/lib/project-report-page';
import { formatBDT, formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function ProjectCashBankBookReportPage({ params }: { params: { id: string } }) {
  const { project, branding } = await getProjectReportContext(params.id);
  const summary = await getProjectCashBankSummary(project.id);
  if (!summary) return null;

  return (
    <ReportDocumentLayout
      branding={branding}
      project={project}
      title="Cash / Bank Book"
      subtitle="Account-wise treasury movement posted from collections, expenses, vendor payments, and settlements."
      generatedAt={new Date()}
      backHref={`/projects/${project.id}/reports`}
      csvHref={`/api/projects/${project.id}/reports/cash-bank-book/excel`}
    >
      <ReportSummaryGrid>
        <ReportKpiCard label="Cash In" value={formatBDT(summary.totals.inflow)} tone="positive" />
        <ReportKpiCard label="Cash Out" value={formatBDT(summary.totals.outflow)} tone="negative" />
        <ReportKpiCard label="Net Movement" value={formatBDT(summary.totals.netMovement)} tone={summary.totals.netMovement >= 0 ? 'positive' : 'negative'} />
        <ReportKpiCard label="Pending Cheques" value={formatBDT(summary.totals.pendingIssuedCheques + summary.totals.pendingReceivedCheques)} tone="warning" />
      </ReportSummaryGrid>

      <ReportSection title="Treasury Transactions" description="Posted account movement by account, source, party, and payment method.">
        <ReportTable dense>
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <th className="px-3 py-3">Date</th>
              <th className="px-3 py-3">Account</th>
              <th className="px-3 py-3">Source</th>
              <th className="px-3 py-3">Party</th>
              <th className="px-3 py-3">Method</th>
              <th className="px-3 py-3 text-right">Inflow</th>
              <th className="px-3 py-3 text-right">Outflow</th>
              <th className="px-3 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {summary.transactions.map((transaction) => (
              <tr key={transaction.id} className="border-b border-slate-200">
                <td className="px-3 py-3 text-slate-700">{formatDate(transaction.transactionDate)}</td>
                <td className="px-3 py-3 font-medium text-slate-900">{transaction.account.name}</td>
                <td className="px-3 py-3 text-slate-700">{transaction.sourceType.replaceAll('_', ' ')}</td>
                <td className="px-3 py-3 text-slate-700">{transaction.partyName ?? '-'}</td>
                <td className="px-3 py-3 text-slate-700">{transaction.paymentMethod.replaceAll('_', ' ')}</td>
                <td className="px-3 py-3 text-right text-emerald-700">{['INFLOW', 'TRANSFER_IN'].includes(transaction.type) ? formatBDT(Number(transaction.amount)) : '-'}</td>
                <td className="px-3 py-3 text-right text-rose-700">{['OUTFLOW', 'TRANSFER_OUT'].includes(transaction.type) ? formatBDT(Number(transaction.amount)) : '-'}</td>
                <td className="px-3 py-3 text-slate-700">{transaction.status.replaceAll('_', ' ')}</td>
              </tr>
            ))}
          </tbody>
        </ReportTable>
      </ReportSection>
    </ReportDocumentLayout>
  );
}

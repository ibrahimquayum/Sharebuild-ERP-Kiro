import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getProjectCashBankSummary } from '@/lib/cash-bank';
import { getProjectReportContext } from '@/lib/project-report-page';
import { ReportHeader } from '@/components/shared/report-header';
import { ReportFooter } from '@/components/shared/report-footer';
import { ReportActions } from '@/components/shared/report-actions';
import { formatBDT, formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function ProjectCashBankBookReportPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as any)?.companyId ?? '';
  const { project, branding } = await getProjectReportContext(params.id);
  const summary = await getProjectCashBankSummary(project.id);
  if (!summary || summary.project.companyId !== companyId) return null;

  return (
    <div className="p-5 space-y-5 print:p-0">
      <div className="flex justify-end"><ReportActions csvHref={`/api/projects/${project.id}/reports/cash-bank-book/excel`} /></div>
      <ReportHeader branding={branding} project={project} title="Project Cash / Bank Book" subtitle="Account-wise money movement posted from collections, expenses, and vendor payments" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-md border p-3 text-sm"><div className="text-xs text-muted-foreground">Cash In</div><div className="mt-1 font-bold text-green-600">{formatBDT(summary.totals.inflow)}</div></div>
        <div className="rounded-md border p-3 text-sm"><div className="text-xs text-muted-foreground">Cash Out</div><div className="mt-1 font-bold text-red-600">{formatBDT(summary.totals.outflow)}</div></div>
        <div className="rounded-md border p-3 text-sm"><div className="text-xs text-muted-foreground">Net Movement</div><div className="mt-1 font-bold">{formatBDT(summary.totals.netMovement)}</div></div>
        <div className="rounded-md border p-3 text-sm"><div className="text-xs text-muted-foreground">Pending Cheques</div><div className="mt-1 font-bold">{formatBDT(summary.totals.pendingIssuedCheques + summary.totals.pendingReceivedCheques)}</div></div>
      </div>
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead><tr className="border-b bg-muted/40"><th className="px-3 py-2 text-left">Date</th><th className="px-3 py-2 text-left">Account</th><th className="px-3 py-2 text-left">Source</th><th className="px-3 py-2 text-left">Party</th><th className="px-3 py-2 text-left">Method</th><th className="px-3 py-2 text-right">Inflow</th><th className="px-3 py-2 text-right">Outflow</th><th className="px-3 py-2 text-left">Status</th></tr></thead>
          <tbody>
            {summary.transactions.map((transaction) => (
              <tr key={transaction.id} className="border-b">
                <td className="px-3 py-2">{formatDate(transaction.transactionDate)}</td>
                <td className="px-3 py-2">{transaction.account.name}</td>
                <td className="px-3 py-2">{transaction.sourceType.replaceAll('_', ' ')}</td>
                <td className="px-3 py-2">{transaction.partyName ?? '-'}</td>
                <td className="px-3 py-2">{transaction.paymentMethod.replaceAll('_', ' ')}</td>
                <td className="px-3 py-2 text-right text-green-600">{['INFLOW', 'TRANSFER_IN'].includes(transaction.type) ? formatBDT(Number(transaction.amount)) : '-'}</td>
                <td className="px-3 py-2 text-right text-red-600">{['OUTFLOW', 'TRANSFER_OUT'].includes(transaction.type) ? formatBDT(Number(transaction.amount)) : '-'}</td>
                <td className="px-3 py-2">{transaction.status.replaceAll('_', ' ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ReportFooter note={branding.reportFooterNote} />
    </div>
  );
}

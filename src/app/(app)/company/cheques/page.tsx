import { getServerSession } from 'next-auth';
import { notFound } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { getChequeSummary } from '@/lib/cash-bank';
import { Header } from '@/components/layout/header';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { ChequeStatusActions } from '@/components/company/cheque-status-actions';
import { formatBDT, formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function CompanyChequesPage() {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as any)?.companyId ?? '';
  if (!companyId) notFound();

  const { cheques, totals } = await getChequeSummary(companyId);

  return (
    <div className="p-5 space-y-5">
      <Header title="Cheque Register" />
      <PageHeader title="Company Cheques" subtitle="Track issued and received cheques across projects and company accounts." />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Pending</div><div className="mt-1 text-lg font-bold">{formatBDT(totals.pending)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Cleared</div><div className="mt-1 text-lg font-bold text-green-600">{formatBDT(totals.cleared)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Bounced</div><div className="mt-1 text-lg font-bold text-red-600">{formatBDT(totals.bounced)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Cancelled</div><div className="mt-1 text-lg font-bold">{formatBDT(totals.cancelled)}</div></CardContent></Card>
      </div>

      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase">Cheque</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase">Type</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase">Party</th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase">Amount</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase">Date</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase">Status</th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {cheques.map((cheque) => (
              <tr key={cheque.id}>
                <td className="px-4 py-3">
                  <div className="font-medium">{cheque.chequeNo}</div>
                  <div className="text-xs text-muted-foreground">{cheque.bankName}{cheque.branchName ? ` - ${cheque.branchName}` : ''}</div>
                </td>
                <td className="px-4 py-3 text-xs">{cheque.chequeType}</td>
                <td className="px-4 py-3 text-xs">{cheque.partyName ?? cheque.partyType}</td>
                <td className="px-4 py-3 text-right font-medium">{formatBDT(Number(cheque.amount))}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(cheque.chequeDate)}</td>
                <td className="px-4 py-3 text-xs">{cheque.status}</td>
                <td className="px-4 py-3 text-right">
                  {cheque.status === 'PENDING' ? <ChequeStatusActions chequeId={cheque.id} /> : <span className="text-xs text-muted-foreground">Locked</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

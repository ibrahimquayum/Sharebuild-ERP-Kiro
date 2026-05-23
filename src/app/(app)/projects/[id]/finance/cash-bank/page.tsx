import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { notFound } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { getProjectCashBankSummary } from '@/lib/cash-bank';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatBDT, formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function ProjectCashBankPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as any)?.companyId ?? '';
  const summary = await getProjectCashBankSummary(params.id);
  if (!summary || summary.project.companyId !== companyId) notFound();

  return (
    <div className="p-5 space-y-5">
      <Header title="Cash / Bank Book" />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold">Project Cash / Bank Book</h1>
          <p className="text-xs text-muted-foreground">{summary.project.name}</p>
        </div>
        <div className="flex gap-3 text-xs">
          <Link href={`/projects/${params.id}/finance`} className="text-primary hover:underline">Finance Overview</Link>
          <Link href={`/projects/${params.id}/finance/cheques`} className="text-primary hover:underline">Cheque Register</Link>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Cash In</div><div className="mt-1 text-lg font-bold text-green-600">{formatBDT(summary.totals.inflow)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Cash Out</div><div className="mt-1 text-lg font-bold text-red-600">{formatBDT(summary.totals.outflow)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Net Movement</div><div className="mt-1 text-lg font-bold">{formatBDT(summary.totals.netMovement)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Account Balance</div><div className="mt-1 text-lg font-bold">{formatBDT(summary.totals.accountBalance)}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Accounts Used In This Project</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {summary.accountsUsed.map((account) => (
            <div key={account.accountId} className="rounded-md border p-3 text-sm">
              <div className="font-semibold">{account.accountName}</div>
              <div className="text-xs text-muted-foreground">{account.type.replaceAll('_', ' ')}</div>
              <div className="mt-2 flex justify-between text-xs"><span>Inflow</span><span className="text-green-600">{formatBDT(account.inflow)}</span></div>
              <div className="flex justify-between text-xs"><span>Outflow</span><span className="text-red-600">{formatBDT(account.outflow)}</span></div>
              <div className="mt-2 flex justify-between font-semibold"><span>Balance</span><span>{formatBDT(account.balance)}</span></div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Project Transactions</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase">Date</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase">Account</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase">Source</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase">Party</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase">Method</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase">Inflow</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase">Outflow</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {summary.transactions.map((transaction) => (
                  <tr key={transaction.id}>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(transaction.transactionDate)}</td>
                    <td className="px-4 py-3 text-xs">{transaction.account.name}</td>
                    <td className="px-4 py-3 text-xs">{transaction.sourceType.replaceAll('_', ' ')}</td>
                    <td className="px-4 py-3 text-xs">{transaction.partyName ?? '-'}</td>
                    <td className="px-4 py-3 text-xs">{transaction.paymentMethod.replaceAll('_', ' ')}</td>
                    <td className="px-4 py-3 text-right text-green-600 font-medium">{['INFLOW', 'TRANSFER_IN'].includes(transaction.type) ? formatBDT(Number(transaction.amount)) : '-'}</td>
                    <td className="px-4 py-3 text-right text-red-600 font-medium">{['OUTFLOW', 'TRANSFER_OUT'].includes(transaction.type) ? formatBDT(Number(transaction.amount)) : '-'}</td>
                    <td className="px-4 py-3 text-xs">{transaction.status.replaceAll('_', ' ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

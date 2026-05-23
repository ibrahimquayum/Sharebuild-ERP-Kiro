import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { authOptions } from '@/lib/auth';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getAccountTransactions } from '@/lib/cash-bank';
import { formatBDT, formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function AccountDetailPage({ params }: { params: { accountId: string } }) {
  const session = await getServerSession(authOptions);
  if (!(session?.user as any)?.companyId) notFound();

  const account = await getAccountTransactions(params.accountId);
  if (!account) notFound();

  return (
    <div className="p-5 space-y-5">
      <Header title={account.name} />
      <Link href="/company/accounts" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to Accounts
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Opening Balance</div><div className="mt-1 text-lg font-bold">{formatBDT(Number(account.openingBalance))}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Inflow</div><div className="mt-1 text-lg font-bold text-green-600">{formatBDT(account.summary.inflow)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Outflow</div><div className="mt-1 text-lg font-bold text-red-600">{formatBDT(account.summary.outflow)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Balance</div><div className="mt-1 text-lg font-bold">{formatBDT(account.summary.balance)}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Account Info</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div><span className="text-muted-foreground">Type:</span> {account.type.replaceAll('_', ' ')}</div>
          <div><span className="text-muted-foreground">Currency:</span> {account.currency}</div>
          <div><span className="text-muted-foreground">Bank:</span> {account.bankName ?? '-'}</div>
          <div><span className="text-muted-foreground">Branch:</span> {account.branchName ?? '-'}</div>
          <div><span className="text-muted-foreground">Account No:</span> {account.accountNumber ?? '-'}</div>
          <div><span className="text-muted-foreground">Holder:</span> {account.accountHolderName ?? '-'}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Recent Transactions</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase">Date</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase">Source</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase">Party</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase">Amount</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase">Method</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {account.transactions.slice(0, 20).map((transaction) => (
                  <tr key={transaction.id}>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(transaction.transactionDate)}</td>
                    <td className="px-4 py-3 text-xs">{transaction.sourceType.replaceAll('_', ' ')}</td>
                    <td className="px-4 py-3 text-xs">{transaction.partyName ?? '-'}</td>
                    <td className={`px-4 py-3 text-right font-medium ${['INFLOW', 'TRANSFER_IN'].includes(transaction.type) ? 'text-green-600' : 'text-red-600'}`}>{formatBDT(Number(transaction.amount))}</td>
                    <td className="px-4 py-3 text-xs">{transaction.paymentMethod.replaceAll('_', ' ')}</td>
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

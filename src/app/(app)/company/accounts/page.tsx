import Link from 'next/link';
import { getCompanyAccountBalances } from '@/lib/cash-bank';
import { requireCompanyPageAccess } from '@/lib/access-control';
import { Header } from '@/components/layout/header';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { formatBDT } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function CompanyAccountsPage() {
  const context = await requireCompanyPageAccess('accounts', 'view');
  const companyId = context.companyId;

  const accounts = await getCompanyAccountBalances(companyId);
  const totalBalance = accounts.reduce((sum, account) => sum + account.summary.balance, 0);

  return (
    <div className="space-y-5 p-5">
      <Header title="Cash & Bank Accounts" />
      <PageHeader title="Accounts / Cash & Bank" subtitle="Company-level accounts used for collections, direct expenses, and supplier or subcontractor payments." action={context.isCompanyWide ? { label: 'New Account', href: '/company/accounts/new' } : undefined} />
      <div className="flex gap-4 text-xs">
        <Link href="/company/accounts/transfers" className="text-primary hover:underline">View account transfers</Link>
        <Link href="/company/cheques" className="text-primary hover:underline">Open cheque register</Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Active Accounts</div><div className="mt-1 text-lg font-bold">{accounts.filter((account) => account.isActive).length}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Default Account</div><div className="mt-1 text-lg font-bold">{accounts.find((account) => account.isDefault)?.name ?? 'Not set'}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Combined Balance</div><div className="mt-1 text-lg font-bold">{formatBDT(totalBalance)}</div></CardContent></Card>
      </div>

      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase">Account</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase">Type</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase">Bank / Mobile</th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase">Opening</th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase">Current</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase">Status</th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {accounts.map((account) => (
              <tr key={account.id}>
                <td className="px-4 py-3">
                  <div className="font-medium">{account.name}</div>
                  {account.isDefault && <div className="text-xs text-primary">Default account</div>}
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{account.type.replaceAll('_', ' ')}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{account.bankName ?? account.mobileProvider ?? '-'}</td>
                <td className="px-4 py-3 text-right font-medium">{formatBDT(Number(account.openingBalance))}</td>
                <td className="px-4 py-3 text-right font-bold">{formatBDT(account.summary.balance)}</td>
                <td className="px-4 py-3 text-xs">{account.isActive ? 'Active' : 'Inactive'}</td>
                <td className="px-4 py-3 text-right text-xs">
                  <div className="flex justify-end gap-3">
                    <Link href={`/company/accounts/${account.id}`} className="text-primary hover:underline">View</Link>
                    <Link href={`/company/accounts/${account.id}/edit`} className="text-primary hover:underline">Edit</Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import { getServerSession } from 'next-auth';
import { notFound } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { getActiveCompanyAccounts } from '@/lib/cash-bank';
import { Header } from '@/components/layout/header';
import { PageHeader } from '@/components/shared/page-header';
import { AccountTransferForm } from '@/components/company/account-transfer-form';

export const dynamic = 'force-dynamic';

export default async function NewAccountTransferPage() {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as any)?.companyId ?? '';
  if (!companyId) notFound();

  const accounts = await getActiveCompanyAccounts(companyId);

  return (
    <div className="space-y-5 p-5">
      <Header title="New Account Transfer" />
      <PageHeader title="Transfer Between Accounts" subtitle="Move money across company accounts while keeping project cost unchanged." />
      <div className="max-w-3xl rounded-lg border bg-card p-5">
        <AccountTransferForm accounts={accounts.map((account) => ({ id: account.id, label: `${account.name} - ${account.type.replaceAll('_', ' ')}` }))} />
      </div>
    </div>
  );
}

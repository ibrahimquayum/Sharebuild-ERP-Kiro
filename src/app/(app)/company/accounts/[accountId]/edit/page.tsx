import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AccountForm } from '@/components/company/account-form';
import { requireCompanyWidePageAccess } from '@/lib/access-control';

export const dynamic = 'force-dynamic';

export default async function EditAccountPage({ params }: { params: { accountId: string } }) {
  const context = await requireCompanyWidePageAccess('accounts', 'editDraft');
  const companyId = context.companyId;
  const account = await prisma.cashBankAccount.findFirst({
    where: { id: params.accountId, companyId },
  });
  if (!account) notFound();

  const initialAccount = {
    ...account,
    openingBalance: Number(account.openingBalance),
  };

  return (
    <div className="p-5 max-w-3xl mx-auto space-y-4">
      <Header title="Edit Account" />
      <Link href={`/company/accounts/${account.id}`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to Account
      </Link>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Edit Cash / Bank Account</CardTitle>
          <CardDescription>Update company account details used in treasury flows.</CardDescription>
        </CardHeader>
        <CardContent>
          <AccountForm initialAccount={initialAccount} />
        </CardContent>
      </Card>
    </div>
  );
}

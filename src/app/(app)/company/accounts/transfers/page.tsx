import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { notFound } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Header } from '@/components/layout/header';
import { PageHeader } from '@/components/shared/page-header';
import { formatBDT, formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function AccountTransfersPage() {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as any)?.companyId ?? '';
  if (!companyId) notFound();

  const transfers = await prisma.accountTransfer.findMany({
    where: { companyId },
    include: {
      fromAccount: { select: { name: true } },
      toAccount: { select: { name: true } },
    },
    orderBy: [{ transferDate: 'desc' }, { createdAt: 'desc' }],
  });

  return (
    <div className="space-y-5 p-5">
      <Header title="Account Transfers" />
      <PageHeader title="Account Transfers" subtitle="Move money between company cash, bank, and mobile accounts without affecting project cost." action={{ label: 'New Transfer', href: '/company/accounts/transfers/new' }} />

      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase">Date</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase">From</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase">To</th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase">Amount</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase">Reference</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {transfers.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">No account transfers recorded yet.</td>
              </tr>
            ) : transfers.map((transfer) => (
              <tr key={transfer.id}>
                <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(transfer.transferDate)}</td>
                <td className="px-4 py-3">{transfer.fromAccount.name}</td>
                <td className="px-4 py-3">{transfer.toAccount.name}</td>
                <td className="px-4 py-3 text-right font-medium">{formatBDT(Number(transfer.amount))}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{transfer.referenceNo ?? '-'}</td>
                <td className="px-4 py-3 text-xs">{transfer.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="text-xs text-muted-foreground">
        <Link href="/company/accounts" className="text-primary hover:underline">Back to Cash &amp; Bank Accounts</Link>
      </div>
    </div>
  );
}

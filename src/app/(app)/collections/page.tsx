import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Header } from '@/components/layout/header';
import { PageHeader } from '@/components/shared/page-header';
import { StatCard } from '@/components/shared/stat-card';
import { Card, CardContent } from '@/components/ui/card';
import { formatBDT, formatBDTCompact, formatDate, cn } from '@/lib/utils';
import { Receipt, TrendingUp, Users, CreditCard, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function CollectionsPage() {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as any)?.companyId ?? '';

  const collections = await prisma.collection.findMany({
    where: { phase: { project: { companyId } } },
    include: {
      buyer: { select: { id: true, name: true, nameBn: true, phone: true } },
      phase: { select: { id: true, name: true, nameBn: true } },
    },
    orderBy: { receivedDate: 'desc' },
    take: 100,
  });

  const [totalAgg, countAgg] = await Promise.all([
    prisma.collection.aggregate({
      where: { phase: { project: { companyId } } },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.buyer.count({ where: { companyId } }),
  ]);

  const total = Number(totalAgg._sum.amount ?? 0);

  const paymentMethodColors: Record<string, string> = {
    CASH: 'bg-green-100 text-green-700',
    CHEQUE: 'bg-blue-100 text-blue-700',
    BANK_TRANSFER: 'bg-violet-100 text-violet-700',
    MOBILE_BANKING: 'bg-pink-100 text-pink-700',
    OTHER: 'bg-gray-100 text-gray-600',
  };

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Collections" />
      <PageHeader
        title="Payment Collections"
        subtitle="All buyer payments recorded"
        action={{ label: 'Record Payment', href: '/collections/new' }}
      />

      <div className="p-6 space-y-6">
        {/* Legacy notice */}
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 flex items-start gap-3">
          <Receipt className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800">
            <strong>Tip:</strong> For project-specific collections, use the{' '}
            <strong>Project Workspace</strong>:{' '}
            <Link href="/projects" className="underline font-medium">Projects</Link>{' '}
            → select a project → <strong>Collections</strong> or <strong>Due Follow-up</strong>.
            Daily payment recording should be done inside a project context.
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard title="Total Collected" value={formatBDTCompact(total)} subtitle={formatBDT(total)} icon={TrendingUp} iconColor="text-green-600" iconBg="bg-green-50" />
          <StatCard title="Total Transactions" value={String(totalAgg._count)} subtitle="Payment records" icon={Receipt} iconColor="text-blue-600" iconBg="bg-blue-50" />
          <StatCard title="Registered Buyers" value={String(countAgg)} subtitle="Across all projects" icon={Users} iconColor="text-violet-600" iconBg="bg-violet-50" />
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">#</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Date</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Buyer</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Phase</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Amount</th>
                    <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">Method</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Receipt</th>
                  </tr>
                </thead>
                <tbody>
                  {collections.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                        No collections recorded yet.
                      </td>
                    </tr>
                  ) : (
                    collections.map((c, i) => (
                      <tr key={c.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 text-muted-foreground text-xs">{i + 1}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                          {formatDate(c.receivedDate)}
                        </td>
                        <td className="px-4 py-3">
                          <Link href={`/buyers/${c.buyer.id}`} className="font-medium hover:text-primary hover:underline">
                            {c.buyer.name}
                          </Link>
                          {c.buyer.nameBn && <div className="bn text-xs text-muted-foreground">{c.buyer.nameBn}</div>}
                        </td>
                        <td className="px-4 py-3">
                          <Link href={`/phases/${c.phase.id}`} className="text-xs hover:text-primary hover:underline">
                            {c.phase.name}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-green-600">
                          {formatBDT(Number(c.amount))}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={cn(
                            'text-xs px-2 py-0.5 rounded-full font-medium',
                            paymentMethodColors[c.paymentMethod] ?? 'bg-gray-100 text-gray-600'
                          )}>
                            {c.paymentMethod.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground font-mono">
                          {c.receiptNo ?? '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

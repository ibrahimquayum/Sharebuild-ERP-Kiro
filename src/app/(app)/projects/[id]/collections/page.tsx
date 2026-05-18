import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { formatBDT, formatBDTCompact, formatDate, cn } from '@/lib/utils';
import { TrendingUp, Receipt, Plus, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { StatCard } from '@/components/shared/stat-card';
import { Card, CardContent } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

const METHOD_COLORS: Record<string, string> = {
  CASH:           'bg-green-100 text-green-700',
  CHEQUE:         'bg-blue-100 text-blue-700',
  BANK_TRANSFER:  'bg-violet-100 text-violet-700',
  MOBILE_BANKING: 'bg-pink-100 text-pink-700',
  OTHER:          'bg-gray-100 text-gray-600',
};

export default async function ProjectCollectionsPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as any)?.companyId ?? '';

  const project = await prisma.project.findFirst({
    where: { id: params.id, companyId },
    select: { id: true, name: true },
  });
  if (!project) notFound();

  const [collections, agg] = await Promise.all([
    prisma.collection.findMany({
      where: { phase: { projectId: project.id } },
      include: {
        buyer: { select: { id: true, name: true, nameBn: true, phone: true } },
        phase: { select: { id: true, name: true } },
      },
      orderBy: { receivedDate: 'desc' },
      take: 200,
    }),
    prisma.collection.aggregate({
      where: { phase: { projectId: project.id }, status: { not: 'REVERSED' } },
      _sum: { amount: true },
      _count: true,
    }),
  ]);

  const total = Number(agg._sum.amount ?? 0);

  return (
    <div className="p-5 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">Collections — Money Received</h2>
          <p className="text-xs text-muted-foreground">{project.name} · all buyer payments</p>
        </div>
        <Link
          href={`/projects/${project.id}/collections/new`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-green-600 text-white text-xs font-medium hover:bg-green-700 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" /> Record Payment
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard title="Total Collected"    value={formatBDTCompact(total)}    subtitle={formatBDT(total)}           icon={TrendingUp} iconColor="text-green-600" iconBg="bg-green-50" />
        <StatCard title="Total Transactions" value={String(agg._count)}          subtitle="Payment records in project"  icon={Receipt}    iconColor="text-blue-600"  iconBg="bg-blue-50" />
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
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Action</th>
                </tr>
              </thead>
              <tbody>
                {collections.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                      No collections yet.{' '}
                      <Link href={`/projects/${project.id}/collections/new`} className="text-primary hover:underline">Record a payment</Link>
                    </td>
                  </tr>
                ) : (
                  collections.map((c, i) => (
                    <tr key={c.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 text-xs text-muted-foreground">{i + 1}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{formatDate(c.receivedDate)}</td>
                      <td className="px-4 py-3">
                        <Link href={`/projects/${project.id}/buyers/${c.buyer.id}`} className="font-medium hover:text-primary hover:underline">{c.buyer.name}</Link>
                        {c.buyer.nameBn && <div className="bn text-xs text-muted-foreground">{c.buyer.nameBn}</div>}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        <Link href={`/phases/${c.phase.id}`} className="hover:text-primary hover:underline">{c.phase.name}</Link>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-green-600">{formatBDT(Number(c.amount))}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', METHOD_COLORS[c.paymentMethod] ?? 'bg-gray-100 text-gray-600')}>
                          {c.paymentMethod.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-muted-foreground">{c.receiptNo ?? '—'}</td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/projects/${project.id}/collections/${c.id}`} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                          View <ArrowRight className="h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {collections.length > 0 && (
                <tfoot>
                  <tr className="bg-muted/60 font-bold border-t-2">
                    <td colSpan={4} className="px-4 py-3">Total</td>
                    <td className="px-4 py-3 text-right text-green-600">{formatBDT(total)}</td>
                    <td colSpan={3} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Header } from '@/components/layout/header';
import { PageHeader } from '@/components/shared/page-header';
import { StatCard } from '@/components/shared/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatBDT, formatBDTCompact, formatDate, cn } from '@/lib/utils';
import { AlertCircle, Users, TrendingDown, Clock } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function DuesDashboardPage() {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as any)?.companyId ?? '';

  // Get all buyers with their demands and collections
  const buyers = await prisma.buyer.findMany({
    where: { companyId },
    include: {
      demands: {
        where: { status: { in: ['ISSUED', 'PARTIALLY_PAID', 'OVERDUE'] } },
        include: {
          collections: { select: { amount: true } },
          phase: { select: { name: true } },
        },
      },
      collections: {
        select: { amount: true },
      },
    },
    orderBy: { name: 'asc' },
  });

  // Build due report
  const buyerDues = buyers.map((buyer) => {
    const totalDemanded = buyer.demands.reduce((s, d) => s + Number(d.amount), 0);
    const totalCollected = buyer.collections.reduce((s, c) => s + Number(c.amount), 0);
    const totalDue = totalDemanded - totalCollected;
    const overdueDemands = buyer.demands.filter((d) => d.status === 'OVERDUE');
    return {
      buyer,
      totalDemanded,
      totalCollected,
      totalDue,
      overdueCount: overdueDemands.length,
    };
  }).filter((b) => b.totalDue !== 0 || b.totalDemanded > 0);

  const totalDue = buyerDues.reduce((s, b) => s + Math.max(0, b.totalDue), 0);
  const overdueCount = buyerDues.filter((b) => b.overdueCount > 0).length;
  const defaulters = buyerDues.filter((b) => b.totalDue > 0).length;
  const cleared = buyerDues.filter((b) => b.totalDue <= 0 && b.totalDemanded > 0).length;

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Due Dashboard" />
      <PageHeader
        title="Due Dashboard"
        subtitle="Buyer-wise outstanding balance tracker"
      />

      <div className="p-6 space-y-6">
        {/* KPI Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Outstanding"
            value={formatBDTCompact(totalDue)}
            subtitle={formatBDT(totalDue)}
            icon={TrendingDown}
            iconColor="text-red-600"
            iconBg="bg-red-50"
          />
          <StatCard
            title="Buyers with Due"
            value={String(defaulters)}
            subtitle="Have pending balance"
            icon={AlertCircle}
            iconColor="text-orange-500"
            iconBg="bg-orange-50"
          />
          <StatCard
            title="Overdue Demands"
            value={String(overdueCount)}
            subtitle="Past due date"
            icon={Clock}
            iconColor="text-red-500"
            iconBg="bg-red-50"
          />
          <StatCard
            title="Cleared Buyers"
            value={String(cleared)}
            subtitle="Fully paid up"
            icon={Users}
            iconColor="text-green-600"
            iconBg="bg-green-50"
          />
        </div>

        {/* Due Table */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Buyer-wise Due Statement</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {buyerDues.length === 0 ? (
              <div className="px-6 py-12 text-center text-muted-foreground">
                <AlertCircle className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p>No due records found. All buyers are cleared!</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">#</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Buyer</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Total Demand</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Total Paid</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Due Balance</th>
                      <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                      <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {buyerDues.map(({ buyer, totalDemanded, totalCollected, totalDue, overdueCount }, i) => (
                      <tr
                        key={buyer.id}
                        className={cn(
                          'border-b last:border-0 hover:bg-muted/30 transition-colors',
                          totalDue > 0 && overdueCount > 0 && 'bg-red-50/40'
                        )}
                      >
                        <td className="px-4 py-3 text-muted-foreground text-xs">{i + 1}</td>
                        <td className="px-4 py-3">
                          <div className="font-medium">{buyer.name}</div>
                          {buyer.nameBn && <div className="bn text-xs text-muted-foreground">{buyer.nameBn}</div>}
                          {buyer.phone && <div className="text-xs text-muted-foreground">{buyer.phone}</div>}
                        </td>
                        <td className="px-4 py-3 text-right font-medium">{formatBDT(totalDemanded)}</td>
                        <td className="px-4 py-3 text-right text-green-600 font-medium">{formatBDT(totalCollected)}</td>
                        <td className={cn(
                          'px-4 py-3 text-right font-bold text-base',
                          totalDue > 0 ? 'text-red-600' : 'text-green-600'
                        )}>
                          {totalDue > 0 ? formatBDT(totalDue) : <span className="text-green-600 text-sm font-medium">✅ Cleared</span>}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={cn(
                            'text-xs px-2 py-0.5 rounded-full font-medium',
                            buyer.status === 'ACTIVE' ? 'bg-blue-100 text-blue-700' :
                            buyer.status === 'DEFAULTER' ? 'bg-red-100 text-red-600' :
                            buyer.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                            'bg-gray-100 text-gray-600'
                          )}>
                            {overdueCount > 0 ? `⚠️ Overdue (${overdueCount})` : buyer.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Link
                            href={`/buyers/${buyer.id}`}
                            className="text-xs text-primary hover:underline"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {/* Summary Footer */}
                  <tfoot>
                    <tr className="bg-muted/60 font-bold border-t-2">
                      <td className="px-4 py-3" colSpan={2}>Total</td>
                      <td className="px-4 py-3 text-right">
                        {formatBDT(buyerDues.reduce((s, b) => s + b.totalDemanded, 0))}
                      </td>
                      <td className="px-4 py-3 text-right text-green-600">
                        {formatBDT(buyerDues.reduce((s, b) => s + b.totalCollected, 0))}
                      </td>
                      <td className="px-4 py-3 text-right text-red-600">
                        {formatBDT(totalDue)}
                      </td>
                      <td colSpan={2} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

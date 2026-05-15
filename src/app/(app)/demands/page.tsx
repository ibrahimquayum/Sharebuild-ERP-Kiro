import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Header } from '@/components/layout/header';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { StatCard } from '@/components/shared/stat-card';
import { formatBDT, formatDate, cn } from '@/lib/utils';
import { FileText, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function DemandsPage() {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as any)?.companyId ?? '';

  const demands = await prisma.demand.findMany({
    where: { buyer: { companyId } },
    include: {
      buyer: { select: { id: true, name: true } },
      phase: { select: { id: true, name: true } },
      unit: { select: { unitNo: true, floor: true } },
      collections: { select: { amount: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const demandRows = demands.map((d) => {
    const paid = d.collections.reduce((s, c) => s + Number(c.amount), 0);
    return { demand: d, paid, balance: Number(d.amount) - paid };
  });

  const totalDemanded = demandRows.reduce((s, r) => s + Number(r.demand.amount), 0);
  const totalPaid = demandRows.reduce((s, r) => s + r.paid, 0);
  const overdueCount = demandRows.filter(r => r.demand.status === 'OVERDUE').length;
  const fullyPaid = demandRows.filter(r => r.demand.status === 'FULLY_PAID').length;

  const statusMeta: Record<string, { label: string; color: string }> = {
    DRAFT: { label: 'Draft', color: 'bg-gray-100 text-gray-600' },
    ISSUED: { label: 'Issued', color: 'bg-blue-100 text-blue-700' },
    PARTIALLY_PAID: { label: 'Part Paid', color: 'bg-orange-100 text-orange-700' },
    FULLY_PAID: { label: 'Paid', color: 'bg-green-100 text-green-700' },
    OVERDUE: { label: 'Overdue', color: 'bg-red-100 text-red-600' },
    CANCELLED: { label: 'Cancelled', color: 'bg-gray-100 text-gray-500' },
  };

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Demand Notices" />
      <PageHeader title="Demand Notices" subtitle="Payment demands issued to buyers" action={{ label: 'Issue Demand', href: '/demands/new' }} />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Demanded" value={formatBDT(totalDemanded)} subtitle={`${demands.length} notices`} icon={FileText} iconColor="text-blue-600" iconBg="bg-blue-50" />
          <StatCard title="Total Collected" value={formatBDT(totalPaid)} subtitle="Against demands" icon={CheckCircle2} iconColor="text-green-600" iconBg="bg-green-50" />
          <StatCard title="Overdue" value={String(overdueCount)} subtitle="Past due date" icon={AlertCircle} iconColor="text-red-500" iconBg="bg-red-50" />
          <StatCard title="Fully Paid" value={String(fullyPaid)} subtitle="Cleared demands" icon={Clock} iconColor="text-emerald-600" iconBg="bg-emerald-50" />
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase">#</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase">Demand</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase">Buyer</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase">Phase</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase">Amount</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase">Paid</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase">Balance</th>
                    <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground uppercase">Due Date</th>
                    <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground uppercase">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {demandRows.length === 0 ? (
                    <tr><td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">No demand notices yet.</td></tr>
                  ) : (
                    demandRows.map(({ demand: d, paid, balance }, i) => {
                      const sm = statusMeta[d.status] ?? { label: d.status, color: 'bg-gray-100 text-gray-600' };
                      return (
                        <tr key={d.id} className={cn('border-b last:border-0 hover:bg-muted/30', d.status === 'OVERDUE' && 'bg-red-50/30')}>
                          <td className="px-4 py-3 text-xs text-muted-foreground">{i + 1}</td>
                          <td className="px-4 py-3">
                            <div className="font-medium">{d.title}</div>
                            {d.demandNo && <div className="text-xs font-mono text-muted-foreground">{d.demandNo}</div>}
                          </td>
                          <td className="px-4 py-3">
                            <Link href={`/buyers/${d.buyer.id}`} className="hover:text-primary hover:underline text-sm">{d.buyer.name}</Link>
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            {d.phase ? <Link href={`/phases/${d.phase.id}`} className="hover:text-primary hover:underline">{d.phase.name}</Link> : '—'}
                          </td>
                          <td className="px-4 py-3 text-right font-medium">{formatBDT(Number(d.amount))}</td>
                          <td className="px-4 py-3 text-right text-green-600 font-medium">{formatBDT(paid)}</td>
                          <td className={cn('px-4 py-3 text-right font-bold', balance > 0 ? 'text-red-600' : 'text-green-600')}>
                            {balance > 0 ? formatBDT(balance) : '✅'}
                          </td>
                          <td className={cn('px-4 py-3 text-center text-xs', d.status === 'OVERDUE' ? 'text-red-600 font-semibold' : 'text-muted-foreground')}>
                            {d.dueDate ? formatDate(d.dueDate) : '—'}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', sm.color)}>{sm.label}</span>
                          </td>
                        </tr>
                      );
                    })
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

import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { notFound } from 'next/navigation';
import { AlertCircle, CheckCircle2, Clock, FileText, Plus } from 'lucide-react';

import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { cn, formatBDT } from '@/lib/utils';
import { StatCard } from '@/components/shared/stat-card';
import { Card, CardContent } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

const STATUS_META: Record<string, { label: string; color: string }> = {
  DRAFT: { label: 'Draft', color: 'bg-gray-100 text-gray-600' },
  ISSUED: { label: 'Issued', color: 'bg-blue-100 text-blue-700' },
  PARTIALLY_PAID: { label: 'Part Paid', color: 'bg-orange-100 text-orange-700' },
  FULLY_PAID: { label: 'Paid', color: 'bg-green-100 text-green-700' },
  OVERDUE: { label: 'Overdue', color: 'bg-red-100 text-red-600' },
  CANCELLED: { label: 'Cancelled', color: 'bg-gray-100 text-gray-500' },
};

export default async function ProjectDemandsPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as any)?.companyId ?? '';

  const project = await prisma.project.findFirst({
    where: { id: params.id, companyId },
    select: { id: true, name: true },
  });
  if (!project) notFound();

  const demands = await prisma.demand.findMany({
    where: {
      OR: [
        { phase: { projectId: project.id } },
        { unit: { projectId: project.id } },
        { finalReconciliation: { projectId: project.id } },
      ],
    },
    include: {
      buyer: { select: { id: true, name: true } },
      phase: { select: { id: true, name: true } },
      unit: { select: { id: true, unitNo: true } },
      finalReconciliation: { select: { id: true, status: true } },
      collections: { where: { status: { not: 'REVERSED' } }, select: { amount: true } },
      allocations: { where: { collection: { status: { not: 'REVERSED' } } }, select: { amount: true } },
    },
    orderBy: [{ dueDate: 'desc' }, { createdAt: 'desc' }],
  });

  const rows = demands.map((demand) => {
    const allocated = demand.allocations.reduce((sum, allocation) => sum + Number(allocation.amount), 0);
    const paid = allocated > 0 ? allocated : demand.collections.reduce((sum, collection) => sum + Number(collection.amount), 0);
    return { demand, paid, balance: Number(demand.amount) - paid };
  });

  const totalDemanded = rows.reduce((sum, row) => sum + Number(row.demand.amount), 0);
  const totalPaid = rows.reduce((sum, row) => sum + row.paid, 0);
  const overdueCount = rows.filter((row) => row.demand.status === 'OVERDUE').length;
  const paidCount = rows.filter((row) => row.demand.status === 'FULLY_PAID').length;

  return (
    <div className="p-5 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">Demand Notices</h2>
          <p className="text-xs text-muted-foreground">{project.name} · {demands.length} demands</p>
        </div>
        <Link
          href={`/projects/${project.id}/demands/new`}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus className="h-3.5 w-3.5" /> Issue Demand
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          title="Total Demanded"
          value={formatBDT(totalDemanded)}
          subtitle={`${demands.length} notices`}
          icon={FileText}
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
        />
        <StatCard
          title="Total Collected"
          value={formatBDT(totalPaid)}
          subtitle="Against demands"
          icon={CheckCircle2}
          iconColor="text-green-600"
          iconBg="bg-green-50"
        />
        <StatCard
          title="Overdue"
          value={String(overdueCount)}
          subtitle="Past due date"
          icon={AlertCircle}
          iconColor="text-red-500"
          iconBg="bg-red-50"
        />
        <StatCard
          title="Fully Paid"
          value={String(paidCount)}
          subtitle="Cleared demands"
          icon={Clock}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">#</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Demand</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Buyer</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Source</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Amount</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Paid</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Balance</th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                      No demand notices yet for this project.
                    </td>
                  </tr>
                ) : (
                  rows.map(({ demand, paid, balance }, index) => {
                    const statusMeta = STATUS_META[demand.status] ?? {
                      label: demand.status,
                      color: 'bg-gray-100 text-gray-600',
                    };

                    return (
                      <tr
                        key={demand.id}
                        className={cn('border-b last:border-0 hover:bg-muted/30', demand.status === 'OVERDUE' && 'bg-red-50/30')}
                      >
                        <td className="px-4 py-3 text-xs text-muted-foreground">{index + 1}</td>
                        <td className="px-4 py-3">
                          <div className="font-medium">{demand.title}</div>
                          {demand.demandNo && (
                            <div className="text-xs font-mono text-muted-foreground">{demand.demandNo}</div>
                          )}
                          {demand.demandType === 'FINAL_RECONCILIATION' && (
                            <div className="text-[11px] font-medium text-amber-700">Final reconciliation demand</div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Link href={`/buyers/${demand.buyer.id}`} className="text-sm hover:text-primary hover:underline">
                            {demand.buyer.name}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {demand.phase ? (
                            <Link href={`/phases/${demand.phase.id}`} className="hover:text-primary hover:underline">
                              {demand.phase.name}
                            </Link>
                          ) : demand.demandType === 'FINAL_RECONCILIATION' ? (
                            <span>Final reconciliation{demand.unit ? ` · Unit ${demand.unit.unitNo}` : ''}</span>
                          ) : demand.unit ? (
                            <span>Unit {demand.unit.unitNo}</span>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-medium">{formatBDT(Number(demand.amount))}</td>
                        <td className="px-4 py-3 text-right font-medium text-green-600">{formatBDT(paid)}</td>
                        <td className={cn('px-4 py-3 text-right font-bold', balance > 0 ? 'text-red-600' : 'text-green-600')}>
                          {balance > 0 ? formatBDT(balance) : 'Paid'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', statusMeta.color)}>
                            {statusMeta.label}
                          </span>
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
  );
}

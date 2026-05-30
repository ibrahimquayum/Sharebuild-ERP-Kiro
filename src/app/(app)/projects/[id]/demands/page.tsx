import Link from 'next/link';
import { AlertCircle, CheckCircle2, Clock, FileText, Plus } from 'lucide-react';
import { getScopedProject } from '@/lib/access-control';
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
  const { project } = await getScopedProject(params.id, 'demands', 'view');

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
        <div className="flex gap-2">
          <Link
            href={`/projects/${project.id}/demands/batches`}
            className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
          >
            <FileText className="h-3.5 w-3.5" /> Demand Batches
          </Link>
          <Link
            href={`/projects/${project.id}/demands/new`}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus className="h-3.5 w-3.5" /> Issue Demand
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard title="Total Demanded" value={formatBDT(totalDemanded)} subtitle={`${demands.length} notices`} icon={FileText} iconColor="text-blue-600" iconBg="bg-blue-50" />
        <StatCard title="Total Collected" value={formatBDT(totalPaid)} subtitle="Against demands" icon={CheckCircle2} iconColor="text-green-600" iconBg="bg-green-50" />
        <StatCard title="Overdue" value={String(overdueCount)} subtitle="Past due date" icon={AlertCircle} iconColor="text-red-500" iconBg="bg-red-50" />
        <StatCard title="Fully Paid" value={String(paidCount)} subtitle="Cleared demands" icon={Clock} iconColor="text-emerald-600" iconBg="bg-emerald-50" />
      </div>

      <Card>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 px-4 py-16 text-center">
              <div className="rounded-full bg-blue-50 p-3">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold">No demand notices yet</h3>
                <p className="text-xs text-muted-foreground">Issue a demand notice to start billing buyers for this project.</p>
              </div>
              <Link
                href={`/projects/${project.id}/demands/new`}
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <Plus className="h-3.5 w-3.5" /> Issue Demand
              </Link>
            </div>
          ) : (
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
                  {rows.map(({ demand, paid, balance }, index) => {
                    const statusMeta = STATUS_META[demand.status] ?? { label: demand.status, color: 'bg-gray-100 text-gray-600' };

                    return (
                      <tr key={demand.id} className={cn('border-b last:border-0 hover:bg-muted/30', demand.status === 'OVERDUE' && 'bg-red-50/30')}>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{index + 1}</td>
                        <td className="px-4 py-3">
                          <div className="font-medium">{demand.title}</div>
                          {demand.demandNo ? <div className="text-xs font-mono text-muted-foreground">{demand.demandNo}</div> : null}
                          {demand.demandType === 'FINAL_RECONCILIATION' ? (
                            <div className="text-[11px] font-medium text-amber-700">Final reconciliation demand</div>
                          ) : null}
                          {Number(demand.serviceChargeAmount ?? 0) > 0 ? (
                            <div className="text-[11px] text-muted-foreground">
                              Base {formatBDT(Number(demand.baseAmount ?? 0))} · Service charge {formatBDT(Number(demand.serviceChargeAmount ?? 0))}
                            </div>
                          ) : null}
                        </td>
                        <td className="px-4 py-3">{demand.buyer.name}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {demand.phase ? demand.phase.name : demand.demandType === 'FINAL_RECONCILIATION' ? `Final reconciliation · Unit ${demand.unit?.unitNo ?? '-'}` : demand.unit ? `Unit ${demand.unit.unitNo}` : '-'}
                        </td>
                        <td className="px-4 py-3 text-right font-medium">{formatBDT(Number(demand.amount))}</td>
                        <td className="px-4 py-3 text-right font-medium text-green-600">{formatBDT(paid)}</td>
                        <td className={cn('px-4 py-3 text-right font-bold', balance > 0 ? 'text-red-600' : 'text-green-600')}>
                          {balance > 0 ? formatBDT(balance) : 'Paid'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', statusMeta.color)}>{statusMeta.label}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

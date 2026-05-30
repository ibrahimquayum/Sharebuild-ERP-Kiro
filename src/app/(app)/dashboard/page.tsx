import Link from 'next/link';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Layers,
  MapPin,
  ReceiptText,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';

import { Header } from '@/components/layout/header';
import { StatCard } from '@/components/shared/stat-card';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { requireCompanyPageAccess } from '@/lib/access-control';
import { getProjectFinanceSummary } from '@/lib/project-finance';
import { prisma } from '@/lib/prisma';
import { balanceColor, cn, formatBDT, formatBDTCompact, normalizeDisplayText, phaseStatusMeta } from '@/lib/utils';

export const dynamic = 'force-dynamic';

async function getDashboardData(companyId: string, projectIds?: string[]) {
  const [projects, buyers, phases, pendingExpenses] = await Promise.all([
    prisma.project.findMany({
      where: { companyId, ...(projectIds ? { id: { in: projectIds } } : {}) },
      include: { _count: { select: { phases: true, buyers: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.buyer.count({
      where: { companyId, ...(projectIds ? { projectLinks: { some: { projectId: { in: projectIds } } } } : {}) },
    }),
    prisma.phase.findMany({
      where: { project: { companyId, ...(projectIds ? { id: { in: projectIds } } : {}) } },
      include: { _count: { select: { collections: true, expenses: true } } },
      orderBy: [{ sequence: 'asc' }, { createdAt: 'asc' }],
    }),
    prisma.expense.count({
      where: {
        phase: { project: { companyId, ...(projectIds ? { id: { in: projectIds } } : {}) } },
        status: 'PENDING_APPROVAL',
      },
    }),
  ]);

  const financeSummaries = await Promise.all(projects.map((project) => getProjectFinanceSummary(project.id)));
  const totals = financeSummaries.reduce(
    (acc, summary) => ({
      totalCollection: acc.totalCollection + summary.totalCollected,
      actualConstructionCost: acc.actualConstructionCost + summary.projectCostTotal,
      serviceCharge: acc.serviceCharge + summary.serviceChargeAccrued,
      totalBillableCost: acc.totalBillableCost + summary.projectCostTotal + summary.serviceChargeAccrued,
      projectBalance: acc.projectBalance + summary.finalSurplusDeficit,
      buyerDue: acc.buyerDue + summary.buyerDue,
      allocatedCollection: acc.allocatedCollection + summary.allocatedCollection,
      buyerAdvance: acc.buyerAdvance + summary.unallocatedCollection,
    }),
    {
      totalCollection: 0,
      actualConstructionCost: 0,
      serviceCharge: 0,
      totalBillableCost: 0,
      projectBalance: 0,
      buyerDue: 0,
      allocatedCollection: 0,
      buyerAdvance: 0,
    },
  );

  return { projects, buyers, phases, pendingExpenses, financeSummaries, totals };
}

export default async function DashboardPage() {
  const context = await requireCompanyPageAccess('dashboard', 'view');
  const scopedProjectIds = context.isCompanyWide ? undefined : context.activeProjectIds;
  const data = await getDashboardData(context.companyId, scopedProjectIds);

  const activePhases = data.phases.filter((phase) => phase.status === 'ACTIVE' || phase.status === 'INCLUDED_IN_SUMMARY');
  const recentPhases = data.phases.slice(0, 8);

  return (
    <div className="flex min-h-full flex-col">
      <Header title="Dashboard" />

      <div className="w-full max-w-[1440px] flex-1 space-y-6 p-6">
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Financial Summary</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Total Collection"
              value={formatBDTCompact(data.totals.totalCollection)}
              subtitle={formatBDT(data.totals.totalCollection)}
              icon={TrendingUp}
              iconColor="text-green-600"
              iconBg="bg-green-50"
              accent="green"
            />
            <StatCard
              title="Actual Construction Cost"
              value={formatBDTCompact(data.totals.actualConstructionCost)}
              subtitle={formatBDT(data.totals.actualConstructionCost)}
              icon={TrendingDown}
              iconColor="text-red-500"
              iconBg="bg-red-50"
              accent="slate"
            />
            <StatCard
              title="Company Service Charge"
              value={formatBDTCompact(data.totals.serviceCharge)}
              subtitle={formatBDT(data.totals.serviceCharge)}
              icon={ReceiptText}
              iconColor="text-sky-600"
              iconBg="bg-sky-50"
              accent="sky"
            />
            <StatCard
              title="Total Billable Cost"
              value={formatBDTCompact(data.totals.totalBillableCost)}
              subtitle={formatBDT(data.totals.totalBillableCost)}
              icon={Wallet}
              iconColor="text-violet-600"
              iconBg="bg-violet-50"
              accent="violet"
            />
          </div>
        </div>

        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Operational Status</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Project Balance"
              value={formatBDTCompact(data.totals.projectBalance)}
              subtitle={data.totals.projectBalance >= 0 ? 'Collection - total billable cost' : 'Below total billable cost'}
              icon={data.totals.projectBalance >= 0 ? CheckCircle2 : AlertCircle}
              iconColor={data.totals.projectBalance >= 0 ? 'text-emerald-600' : 'text-red-600'}
              iconBg={data.totals.projectBalance >= 0 ? 'bg-emerald-50' : 'bg-red-50'}
              accent={data.totals.projectBalance >= 0 ? 'green' : 'red'}
            />
            <StatCard
              title="Buyer Due"
              value={formatBDTCompact(data.totals.buyerDue)}
              subtitle={formatBDT(data.totals.buyerDue)}
              icon={Users}
              iconColor="text-amber-600"
              iconBg="bg-amber-50"
              accent="amber"
            />
            <StatCard
              title="Pending Approvals"
              value={String(data.pendingExpenses)}
              subtitle="Expenses awaiting review"
              icon={Clock}
              iconColor="text-orange-500"
              iconBg="bg-orange-50"
              accent="amber"
            />
            <StatCard
              title="Buyer Advance / Unallocated"
              value={formatBDTCompact(data.totals.buyerAdvance)}
              subtitle={formatBDT(data.totals.buyerAdvance)}
              icon={Layers}
              iconColor="text-cyan-600"
              iconBg="bg-cyan-50"
              accent="sky"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-3 lg:col-span-1">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Projects</h2>
              <div className="flex items-center gap-3">
                <Link href="/projects/new" className="text-xs text-primary hover:underline">
                  New Project
                </Link>
                <Link href="/projects" className="flex items-center gap-1 text-xs text-primary hover:underline">
                  View all <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>

            {data.projects.map((project, index) => {
              const finance = data.financeSummaries[index];

              return (
                <Link key={project.id} href={`/projects/${project.id}`}>
                  <Card className="cursor-pointer rounded-xl border-slate-200 shadow-sm transition-shadow hover:shadow-md">
                    <CardContent className="space-y-3 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900">{project.name}</p>
                          {project.nameBn ? (
                            <p className="bn truncate text-xs text-muted-foreground">{normalizeDisplayText(project.nameBn)}</p>
                          ) : null}
                        </div>
                        <Badge
                          className={cn(
                            'shrink-0 border-0 text-xs',
                            project.status === 'ACTIVE'
                              ? 'bg-blue-100 text-blue-700'
                              : project.status === 'COMPLETED'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-100 text-gray-600',
                          )}
                        >
                          {project.status}
                        </Badge>
                      </div>

                      {project.address ? (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{project.address}</span>
                        </div>
                      ) : null}

                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span>{project._count.phases} phases</span>
                        <span>{project._count.buyers} buyers</span>
                        {project.totalFloors ? <span>{project.totalFloors} floors</span> : null}
                      </div>

                      <div className="grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 text-xs">
                        <div>
                          <p className="text-muted-foreground">Total Collection</p>
                          <p className="font-medium text-slate-900">{formatBDT(finance.totalCollected)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Project Balance</p>
                          <p className={cn('font-medium', balanceColor(finance.finalSurplusDeficit))}>
                            {formatBDT(finance.finalSurplusDeficit)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>

          <div className="lg:col-span-2">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Phase Overview</h2>
              <Link href="/phases" className="flex items-center gap-1 text-xs text-primary hover:underline">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <Card className="rounded-xl border-slate-200 shadow-sm">
              <div className="divide-y divide-slate-100">
                {recentPhases.map((phase, index) => {
                  const meta = phaseStatusMeta(phase.status);
                  return (
                    <Link key={phase.id} href={`/phases/${phase.id}`}>
                      <div className="flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-slate-50">
                        <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                          {index + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-slate-900">{phase.name}</p>
                          {phase.nameBn ? (
                            <p className="bn truncate text-xs text-muted-foreground">{normalizeDisplayText(phase.nameBn)}</p>
                          ) : null}
                        </div>
                        <div className="shrink-0 text-xs text-muted-foreground">
                          {phase._count.collections} collections · {phase._count.expenses} expenses
                        </div>
                        <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-xs font-medium', meta.color)}>
                          {meta.label}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </Card>
          </div>
        </div>

        <Card className="rounded-xl border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Portfolio Financial Summary</CardTitle>
            <CardDescription>Visible projects combined using the same project-finance helper logic.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Total Collection</p>
                <p className="mt-1 break-words text-2xl font-bold tabular-nums text-green-600">
                  {formatBDTCompact(data.totals.totalCollection)}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">{formatBDT(data.totals.totalCollection)}</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Total Billable Cost</p>
                <p className="mt-1 break-words text-2xl font-bold tabular-nums text-slate-900">
                  {formatBDTCompact(data.totals.totalBillableCost)}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">{formatBDT(data.totals.totalBillableCost)}</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Project Balance</p>
                <p className={cn('mt-1 break-words text-2xl font-bold tabular-nums', balanceColor(data.totals.projectBalance))}>
                  {formatBDTCompact(data.totals.projectBalance)}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {data.totals.projectBalance >= 0 ? 'Collection ahead of billable cost' : 'Collection below billable cost'}
                </p>
              </div>
            </div>

            <div className="mt-5">
              <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                <span>Collection vs billable cost coverage</span>
                <span>
                  {data.totals.totalCollection > 0
                    ? Math.round((data.totals.totalBillableCost / data.totals.totalCollection) * 100)
                    : 0}
                  % billed-cost coverage
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    data.totals.totalBillableCost > data.totals.totalCollection ? 'bg-amber-500' : 'bg-emerald-500',
                  )}
                  style={{
                    width: `${Math.min(
                      100,
                      data.totals.totalCollection > 0
                        ? Math.round((data.totals.totalBillableCost / data.totals.totalCollection) * 100)
                        : 0,
                    )}%`,
                  }}
                />
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 text-xs md:grid-cols-4">
              <div className="rounded-lg border border-slate-200 p-3">
                <p className="text-muted-foreground">Projects</p>
                <p className="mt-0.5 text-base font-semibold text-slate-900">{data.projects.length}</p>
              </div>
              <div className="rounded-lg border border-slate-200 p-3">
                <p className="text-muted-foreground">Buyers</p>
                <p className="mt-0.5 text-base font-semibold text-slate-900">{data.buyers}</p>
              </div>
              <div className="rounded-lg border border-slate-200 p-3">
                <p className="text-muted-foreground">Phases</p>
                <p className="mt-0.5 text-base font-semibold text-slate-900">{data.phases.length}</p>
              </div>
              <div className="rounded-lg border border-slate-200 p-3">
                <p className="text-muted-foreground">Active phases</p>
                <p className="mt-0.5 text-base font-semibold text-slate-900">{activePhases.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

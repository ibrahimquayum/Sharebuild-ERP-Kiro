import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { notFound } from 'next/navigation';
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  Building2,
  CheckCircle2,
  Clock,
  FileText,
  MoreHorizontal,
  Receipt,
  ShoppingCart,
  Truck,
  Upload,
  Users,
} from 'lucide-react';

import { authOptions } from '@/lib/auth';
import { getProjectFinanceSummary } from '@/lib/project-finance';
import { prisma } from '@/lib/prisma';
import { balanceColor, cn, formatBDT, formatBDTCompact, formatDate, normalizeDisplayText, phaseStatusMeta } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { StatCard } from '@/components/shared/stat-card';

export const dynamic = 'force-dynamic';

function actionButtonClassName(kind: 'primary' | 'secondary' | 'subtle') {
  if (kind === 'primary') {
    return 'inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90';
  }
  if (kind === 'secondary') {
    return 'inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted';
  }
  return 'inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground';
}

export default async function ProjectOverviewPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as { companyId?: string } | undefined)?.companyId ?? '';

  const project = await prisma.project.findFirst({
    where: { id: params.id, companyId },
    include: {
      phases: {
        select: { id: true, name: true, nameBn: true, status: true, sequence: true },
        orderBy: { sequence: 'asc' },
      },
      buyers: {
        include: { buyer: { select: { id: true, name: true, phone: true } } },
        take: 8,
      },
      _count: { select: { phases: true, buyers: true, units: true } },
    },
  });

  if (!project) notFound();

  const finance = await getProjectFinanceSummary(project.id);
  const pendingApprovalCount = finance.pendingApprovalCount;
  const missingVoucherCount = finance.missingVoucherCount;
  const activePhaseCount = project.phases.filter((phase) => phase.status === 'ACTIVE' || phase.status === 'INCLUDED_IN_SUMMARY').length;
  const recentPhases = project.phases.slice(0, 6);
  const base = `/projects/${project.id}`;
  const totalBillableCost = finance.projectCostTotal + finance.serviceChargeAccrued;

  return (
    <div className="space-y-5 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-base font-semibold">Project Overview</h1>
          <p className="text-xs text-muted-foreground">
            {project.code ? `${project.code} · ` : ''}
            {project.address || 'Project address not recorded'}
          </p>
          {project.nameBn ? <p className="bn text-xs text-muted-foreground">{normalizeDisplayText(project.nameBn)}</p> : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link href={`${base}/collections/new`} className={actionButtonClassName('primary')}>
            <Receipt className="h-3.5 w-3.5" />
            Record Collection
          </Link>
          <Link href={`${base}/expenses/new`} className={actionButtonClassName('secondary')}>
            <ShoppingCart className="h-3.5 w-3.5" />
            Add Expense
          </Link>
          <Link href={`${base}/demands/new`} className={actionButtonClassName('secondary')}>
            <FileText className="h-3.5 w-3.5" />
            Issue Demand
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger className={actionButtonClassName('subtle')}>
              <MoreHorizontal className="h-3.5 w-3.5" />
              More Actions
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`${base}/payables/new`}><Truck className="mr-2 h-4 w-4" />Add Supplier Bill</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`${base}/subcontractors/bills/new`}><Building2 className="mr-2 h-4 w-4" />Add Subcontractor Bill</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`${base}/buyers`}><Users className="mr-2 h-4 w-4" />Add Buyer / Assign Unit</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`${base}/documents/upload`}><Upload className="mr-2 h-4 w-4" />Upload Document</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`${base}/due-followup`}><AlertCircle className="mr-2 h-4 w-4" />View Due</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`${base}/reports/top-sheet`}><BarChart3 className="mr-2 h-4 w-4" />Top Sheet</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          title="Total Collection"
          value={formatBDTCompact(finance.totalCollected)}
          subtitle={formatBDT(finance.totalCollected)}
          icon={Receipt}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50"
        />
        <StatCard
          title="Actual Construction Cost"
          value={formatBDTCompact(finance.projectCostTotal)}
          subtitle={formatBDT(finance.projectCostTotal)}
          icon={ShoppingCart}
          iconColor="text-rose-600"
          iconBg="bg-rose-50"
        />
        <StatCard
          title="Company Service Charge"
          value={formatBDTCompact(finance.serviceChargeAccrued)}
          subtitle={formatBDT(finance.serviceChargeAccrued)}
          icon={FileText}
          iconColor="text-sky-600"
          iconBg="bg-sky-50"
        />
        <StatCard
          title="Total Billable Cost"
          value={formatBDTCompact(totalBillableCost)}
          subtitle={formatBDT(totalBillableCost)}
          icon={Building2}
          iconColor="text-violet-600"
          iconBg="bg-violet-50"
        />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          title="Project Balance"
          value={formatBDTCompact(finance.finalSurplusDeficit)}
          subtitle={finance.finalSurplusDeficit >= 0 ? 'Total collection - total billable cost' : 'Below total billable cost'}
          icon={finance.finalSurplusDeficit >= 0 ? CheckCircle2 : AlertCircle}
          iconColor={finance.finalSurplusDeficit >= 0 ? 'text-emerald-600' : 'text-red-600'}
          iconBg={finance.finalSurplusDeficit >= 0 ? 'bg-emerald-50' : 'bg-red-50'}
        />
        <StatCard
          title="Buyer Due"
          value={formatBDTCompact(finance.buyerDue)}
          subtitle={formatBDT(finance.buyerDue)}
          icon={Users}
          iconColor="text-amber-600"
          iconBg="bg-amber-50"
        />
        <StatCard
          title="Pending Approvals"
          value={String(pendingApprovalCount)}
          subtitle="Expenses to review"
          icon={Clock}
          iconColor="text-orange-600"
          iconBg="bg-orange-50"
        />
        <StatCard
          title="Missing Vouchers"
          value={String(missingVoucherCount)}
          subtitle="Rows without document support"
          icon={AlertCircle}
          iconColor={missingVoucherCount > 0 ? 'text-red-500' : 'text-emerald-600'}
          iconBg={missingVoucherCount > 0 ? 'bg-red-50' : 'bg-emerald-50'}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardContent className="space-y-4 p-4">
            <h3 className="text-sm font-semibold">Project Balance</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Collection</span>
                <span className="font-medium text-emerald-700">{formatBDT(finance.totalCollected)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Actual Construction Cost</span>
                <span className="font-medium text-rose-700">{formatBDT(finance.projectCostTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Company Service Charge</span>
                <span className="font-medium text-sky-700">{formatBDT(finance.serviceChargeAccrued)}</span>
              </div>
              <div className="h-px bg-border" />
              <div className="flex justify-between font-bold">
                <span>Project Balance</span>
                <span className={balanceColor(finance.finalSurplusDeficit)}>{formatBDT(finance.finalSurplusDeficit)}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 border-t pt-3 text-xs">
              <div>
                <p className="text-muted-foreground">Allocated Collection</p>
                <p className="font-medium text-slate-900">{formatBDT(finance.allocatedCollection)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Buyer Advance / Unallocated</p>
                <p className="font-medium text-slate-900">{formatBDT(finance.unallocatedCollection)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Service charge %</p>
                <p className="font-medium text-slate-900">{Number(project.defaultServiceChargePct ?? 0).toFixed(2)}%</p>
              </div>
              <div>
                <p className="text-muted-foreground">Started</p>
                <p className="font-medium text-slate-900">{project.startDate ? formatDate(project.startDate) : 'Not set'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold">Phases</CardTitle>
            <Link href={`${base}/phases`} className="flex items-center gap-1 text-xs text-primary hover:underline">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {recentPhases.map((phase, index) => {
                const meta = phaseStatusMeta(phase.status);
                return (
                  <Link key={phase.id} href={`/phases/${phase.id}`}>
                    <div className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-muted/40">
                      <span className="w-5 shrink-0 text-xs text-muted-foreground">{index + 1}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{phase.name}</p>
                        {phase.nameBn ? <p className="bn truncate text-xs text-muted-foreground">{normalizeDisplayText(phase.nameBn)}</p> : null}
                      </div>
                      <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-xs font-medium', meta.color)}>
                        {meta.label}
                      </span>
                    </div>
                  </Link>
                );
              })}
              {recentPhases.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No phases yet. <Link href="/phases/new" className="text-primary hover:underline">Add a phase</Link>
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>

      {project.buyers.length > 0 ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold">Buyers in This Project</CardTitle>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>{project._count.units} units</span>
              <span>{project._count.phases} phases</span>
              <span>{activePhaseCount} active/current</span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="grid grid-cols-1 divide-x divide-y sm:grid-cols-2 lg:grid-cols-4">
              {project.buyers.map(({ buyer }) => (
                <Link key={buyer.id} href={`${base}/buyers`}>
                  <div className="flex items-center gap-2.5 px-4 py-3 transition-colors hover:bg-muted/30">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      {buyer.name[0]?.toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{buyer.name}</p>
                      {buyer.phone ? <p className="text-xs text-muted-foreground">{buyer.phone}</p> : null}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

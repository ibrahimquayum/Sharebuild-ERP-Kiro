import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { StatCard } from '@/components/shared/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  formatBDT, formatBDTCompact, formatDate,
  phaseStatusMeta, phaseTypeLabel, balanceColor, cn,
} from '@/lib/utils';
import {
  TrendingUp, TrendingDown, Users, Layers,
  AlertCircle, CheckCircle2, Clock, ArrowRight,
  Receipt, Truck, Plus, BarChart3,
} from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function ProjectOverviewPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as any)?.companyId ?? '';

  const project = await prisma.project.findFirst({
    where: { id: params.id, companyId },
    include: {
      phases: {
        include: { _count: { select: { collections: true, expenses: true } } },
        orderBy: { sequence: 'asc' },
      },
      buyers: { include: { buyer: { select: { id: true, name: true, phone: true, status: true } } }, take: 8 },
      _count: { select: { phases: true, buyers: true, units: true } },
    },
  });

  if (!project) notFound();

  // ── Financial aggregates ─────────────────────────────────────
  const [incAgg, expAgg, payableAgg, pendingExpenses, missingVouchers] = await Promise.all([
    prisma.collection.aggregate({
      where: { phase: { projectId: project.id } },
      _sum: { amount: true },
    }),
    prisma.expense.aggregate({
      where: { phase: { projectId: project.id } },
      _sum: { amount: true },
    }),
    prisma.supplierPayable.aggregate({
      where: { projectId: project.id },
      _sum: { dueAmount: true },
    }),
    prisma.expense.count({
      where: { phase: { projectId: project.id }, status: 'PENDING_APPROVAL' },
    }),
    prisma.expense.count({
      where: {
        phase: { projectId: project.id },
        documents: { none: {} },
        status: { in: ['APPROVED', 'PENDING_APPROVAL'] },
      },
    }),
  ]);

  const income   = Number(incAgg._sum.amount   ?? 0);
  const expense  = Number(expAgg._sum.amount   ?? 0);
  const balance  = income - expense;
  const payable  = Number(payableAgg._sum.dueAmount ?? 0);

  // ── Buyer due ─────────────────────────────────────────────────
  const buyers = await prisma.buyer.findMany({
    where: { projectLinks: { some: { projectId: project.id } } },
    include: {
      collections: { where: { phase: { projectId: project.id } }, select: { amount: true } },
    },
  });
  const buyerDue = buyers.reduce((sum, b) => {
    const paid = b.collections.reduce((s, c) => s + Number(c.amount), 0);
    return sum + Math.max(0, -paid); // simplified without demands; real due needs demand model
  }, 0);

  // ── Phase financials for top-5 ────────────────────────────────
  const recentPhases = project.phases.slice(0, 6);

  const base = `/projects/${project.id}`;

  return (
    <div className="p-5 space-y-5">

      {/* Quick actions */}
      <div className="flex flex-wrap gap-2">
        <Link href={`${base}/collections/new`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-green-600 text-white text-xs font-medium hover:bg-green-700 transition-colors">
          <Plus className="h-3.5 w-3.5" /> Money Received
        </Link>
        <Link href={`${base}/expenses/new`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-red-600 text-white text-xs font-medium hover:bg-red-700 transition-colors">
          <Plus className="h-3.5 w-3.5" /> Add Expense
        </Link>
        <Link href={`${base}/payables/new`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-orange-600 text-white text-xs font-medium hover:bg-orange-700 transition-colors">
          <Plus className="h-3.5 w-3.5" /> Supplier Bill
        </Link>
        <Link href={`${base}/due-followup`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-yellow-600 text-white text-xs font-medium hover:bg-yellow-700 transition-colors">
          <AlertCircle className="h-3.5 w-3.5" /> View Dues
        </Link>
        <Link href={`${base}/reports/top-sheet`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-medium hover:bg-muted transition-colors">
          <BarChart3 className="h-3.5 w-3.5" /> Top Sheet
        </Link>
      </div>

      {/* KPI row 1 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard title="Total Collection"   value={formatBDTCompact(income)}   subtitle={formatBDT(income)}   icon={TrendingUp}    iconColor="text-green-600"  iconBg="bg-green-50" />
        <StatCard title="Total Expense"      value={formatBDTCompact(expense)}  subtitle={formatBDT(expense)}  icon={TrendingDown}  iconColor="text-red-500"    iconBg="bg-red-50" />
        <StatCard
          title="Net Balance"
          value={formatBDTCompact(balance)}
          subtitle={balance >= 0 ? 'Surplus' : 'Deficit'}
          icon={balance >= 0 ? CheckCircle2 : AlertCircle}
          iconColor={balance >= 0 ? 'text-emerald-600' : 'text-red-600'}
          iconBg={balance >= 0 ? 'bg-emerald-50' : 'bg-red-50'}
        />
        <StatCard title="Supplier Payable"   value={formatBDTCompact(payable)}  subtitle={formatBDT(payable)}  icon={Truck}         iconColor="text-orange-500" iconBg="bg-orange-50" />
      </div>

      {/* KPI row 2 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard title="Total Phases"       value={String(project._count.phases)}        subtitle="All construction stages" icon={Layers}    iconColor="text-blue-600"  iconBg="bg-blue-50" />
        <StatCard title="Project Buyers"     value={String(project._count.buyers)}        subtitle="Registered in project"   icon={Users}     iconColor="text-violet-600" iconBg="bg-violet-50" />
        <StatCard title="Pending Approvals"  value={String(pendingExpenses)}              subtitle="Expenses to review"      icon={Clock}     iconColor="text-amber-600" iconBg="bg-amber-50" />
        <StatCard title="Missing Vouchers"   value={String(missingVouchers)}             subtitle="Expenses without docs"   icon={AlertCircle} iconColor={missingVouchers > 0 ? 'text-red-500' : 'text-green-600'} iconBg={missingVouchers > 0 ? 'bg-red-50' : 'bg-green-50'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Balance bar */}
        <Card className="lg:col-span-1">
          <CardContent className="p-4 space-y-4">
            <h3 className="text-sm font-semibold">Project Balance</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Income</span>
                <span className="font-medium text-green-600">{formatBDT(income)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Expense</span>
                <span className="font-medium text-red-500">{formatBDT(expense)}</span>
              </div>
              <div className="h-px bg-border" />
              <div className="flex justify-between font-bold">
                <span>Balance</span>
                <span className={balanceColor(balance)}>{formatBDT(balance)}</span>
              </div>
            </div>
            {income > 0 && (
              <div>
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Expense / Income</span>
                  <span>{Math.min(100, Math.round((expense / income) * 100))}%</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn('h-full rounded-full', expense > income ? 'bg-red-500' : 'bg-green-500')}
                    style={{ width: `${Math.min(100, Math.round((expense / income) * 100))}%` }}
                  />
                </div>
              </div>
            )}
            <div className="pt-2 space-y-2 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>Supplier payable</span>
                <span className="text-orange-600 font-medium">{formatBDT(payable)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Started</span>
                <span>{project.startDate ? formatDate(project.startDate) : '—'}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Phase snapshot */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold">Recent Phases</CardTitle>
            <Link href={`${base}/phases`} className="text-xs text-primary flex items-center gap-1 hover:underline">
              Phase Board <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {recentPhases.map((ph, i) => {
                const meta = phaseStatusMeta(ph.status);
                return (
                  <Link key={ph.id} href={`${base}/phases`}>
                    <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/40 transition-colors">
                      <span className="text-xs text-muted-foreground w-5 shrink-0">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{ph.name}</p>
                        {ph.nameBn && <p className="text-xs bn text-muted-foreground truncate">{ph.nameBn}</p>}
                      </div>
                      <div className="text-xs text-muted-foreground shrink-0 hidden sm:block">
                        {ph._count.collections}↑ {ph._count.expenses}↓
                      </div>
                      <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium shrink-0', meta.color)}>
                        {meta.label}
                      </span>
                    </div>
                  </Link>
                );
              })}
              {recentPhases.length === 0 && (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No phases yet.{' '}
                  <Link href="/phases/new" className="text-primary hover:underline">Add a phase</Link>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Buyers snapshot */}
      {project.buyers.length > 0 && (
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold">Buyers in This Project</CardTitle>
            <Link href={`${base}/buyers`} className="text-xs text-primary flex items-center gap-1 hover:underline">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-x divide-y">
              {project.buyers.map(({ buyer }) => (
                <Link key={buyer.id} href={`${base}/buyers`}>
                  <div className="flex items-center gap-2.5 px-4 py-3 hover:bg-muted/30 transition-colors">
                    <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                      {buyer.name[0]?.toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{buyer.name}</p>
                      {buyer.phone && <p className="text-xs text-muted-foreground">{buyer.phone}</p>}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

    </div>
  );
}

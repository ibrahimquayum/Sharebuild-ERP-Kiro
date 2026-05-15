import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Header } from '@/components/layout/header';
import { StatCard } from '@/components/shared/stat-card';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatBDT, formatBDTCompact, formatDate, phaseStatusMeta, balanceColor } from '@/lib/utils';
import {
  Building2, TrendingUp, TrendingDown, Users, Layers,
  AlertCircle, CheckCircle2, Clock, ArrowRight,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

async function getDashboardData(companyId: string) {
  const [projects, buyers, phases, collections, expenses, pendingExpenses] = await Promise.all([
    prisma.project.findMany({
      where: { companyId },
      include: { _count: { select: { phases: true, buyers: true } } },
    }),
    prisma.buyer.count({ where: { companyId } }),
    prisma.phase.findMany({
      where: { project: { companyId } },
      include: {
        _count: { select: { collections: true, expenses: true } },
      },
      orderBy: { sequence: 'asc' },
    }),
    prisma.collection.aggregate({
      where: { phase: { project: { companyId } } },
      _sum: { amount: true },
    }),
    prisma.expense.aggregate({
      where: { phase: { project: { companyId } } },
      _sum: { amount: true },
    }),
    prisma.expense.count({
      where: {
        phase: { project: { companyId } },
        status: 'PENDING_APPROVAL',
      },
    }),
  ]);

  const totalIncome = Number(collections._sum.amount ?? 0);
  const totalExpense = Number(expenses._sum.amount ?? 0);
  const balance = totalIncome - totalExpense;

  return { projects, buyers, phases, totalIncome, totalExpense, balance, pendingExpenses };
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as any)?.companyId ?? '';
  const data = await getDashboardData(companyId);

  const activePhases = data.phases.filter((p) => p.status === 'ACTIVE' || p.status === 'INCLUDED_IN_SUMMARY');
  const recentPhases = data.phases.slice(0, 8);

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Dashboard" />

      <div className="flex-1 p-6 space-y-6">

        {/* KPI Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Collection"
            value={formatBDTCompact(data.totalIncome)}
            subtitle={formatBDT(data.totalIncome)}
            icon={TrendingUp}
            iconColor="text-green-600"
            iconBg="bg-green-50"
          />
          <StatCard
            title="Total Expense"
            value={formatBDTCompact(data.totalExpense)}
            subtitle={formatBDT(data.totalExpense)}
            icon={TrendingDown}
            iconColor="text-red-500"
            iconBg="bg-red-50"
          />
          <StatCard
            title="Net Balance"
            value={formatBDTCompact(data.balance)}
            subtitle={data.balance >= 0 ? 'Surplus' : 'Deficit'}
            icon={data.balance >= 0 ? CheckCircle2 : AlertCircle}
            iconColor={data.balance >= 0 ? 'text-emerald-600' : 'text-red-600'}
            iconBg={data.balance >= 0 ? 'bg-emerald-50' : 'bg-red-50'}
          />
          <StatCard
            title="Pending Approvals"
            value={String(data.pendingExpenses)}
            subtitle="Expenses awaiting review"
            icon={Clock}
            iconColor="text-orange-500"
            iconBg="bg-orange-50"
          />
        </div>

        {/* Second row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Projects"
            value={String(data.projects.length)}
            subtitle="Active construction projects"
            icon={Building2}
            iconColor="text-blue-600"
            iconBg="bg-blue-50"
          />
          <StatCard
            title="Total Buyers"
            value={String(data.buyers)}
            subtitle="Registered buyers/investors"
            icon={Users}
            iconColor="text-violet-600"
            iconBg="bg-violet-50"
          />
          <StatCard
            title="Total Phases"
            value={String(data.phases.length)}
            subtitle="Piling → Finishing"
            icon={Layers}
            iconColor="text-cyan-600"
            iconBg="bg-cyan-50"
          />
          <StatCard
            title="Active Phases"
            value={String(activePhases.length)}
            subtitle="Currently in progress"
            icon={CheckCircle2}
            iconColor="text-teal-600"
            iconBg="bg-teal-50"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Project Cards */}
          <div className="lg:col-span-1 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Projects</h2>
              <Link href="/projects" className="text-xs text-primary flex items-center gap-1 hover:underline">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            {data.projects.map((project) => (
              <Link key={project.id} href={`/projects/${project.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-sm">{project.name}</p>
                        {project.nameBn && (
                          <p className="text-xs bn text-muted-foreground">{project.nameBn}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">{project.address}</p>
                      </div>
                      <Badge
                        className={cn(
                          'text-xs shrink-0',
                          project.status === 'ACTIVE' ? 'bg-blue-100 text-blue-700 border-0' :
                          project.status === 'COMPLETED' ? 'bg-green-100 text-green-700 border-0' :
                          'bg-gray-100 text-gray-600 border-0'
                        )}
                      >
                        {project.status}
                      </Badge>
                    </div>
                    <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
                      <span>{project._count.phases} phases</span>
                      <span>{project._count.buyers} buyers</span>
                      {project.totalFloors && <span>{project.totalFloors} floors</span>}
                    </div>
                    {project.phone && (
                      <p className="text-xs text-muted-foreground mt-1">📞 {project.phone}</p>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          {/* Phase Overview */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold">Phase Overview</h2>
              <Link href="/phases" className="text-xs text-primary flex items-center gap-1 hover:underline">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <Card>
              <div className="divide-y">
                {recentPhases.map((phase, i) => {
                  const meta = phaseStatusMeta(phase.status);
                  return (
                    <Link key={phase.id} href={`/phases/${phase.id}`}>
                      <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors cursor-pointer">
                        <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">
                          {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{phase.name}</p>
                          {phase.nameBn && (
                            <p className="text-xs bn text-muted-foreground truncate">{phase.nameBn}</p>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground shrink-0">
                          {phase._count.collections} collections · {phase._count.expenses} expenses
                        </div>
                        <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium shrink-0', meta.color)}>
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

        {/* Balance Breakdown */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Project Financial Summary</CardTitle>
            <CardDescription>
              Relax Tower — All phases combined
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-6">
              <div className="text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Collection</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{formatBDTCompact(data.totalIncome)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{formatBDT(data.totalIncome)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Expense</p>
                <p className="text-2xl font-bold text-red-500 mt-1">{formatBDTCompact(data.totalExpense)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{formatBDT(data.totalExpense)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Balance</p>
                <p className={cn('text-2xl font-bold mt-1', balanceColor(data.balance))}>
                  {formatBDTCompact(data.balance)}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {data.balance >= 0 ? '✅ Surplus' : '⚠️ Deficit'}
                </p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="mt-5">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Expense vs Collection</span>
                <span>
                  {data.totalIncome > 0
                    ? Math.round((data.totalExpense / data.totalIncome) * 100)
                    : 0}% spent
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    data.totalExpense > data.totalIncome ? 'bg-red-500' : 'bg-green-500'
                  )}
                  style={{
                    width: `${Math.min(
                      100,
                      data.totalIncome > 0
                        ? Math.round((data.totalExpense / data.totalIncome) * 100)
                        : 0
                    )}%`,
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}

import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/shared/stat-card';
import {
  formatBDT, formatBDTCompact, formatDate,
  phaseStatusMeta, phaseTypeLabel, balanceColor, cn,
} from '@/lib/utils';
import {
  Building2, MapPin, Phone, Layers, Users, TrendingUp,
  TrendingDown, CheckCircle2, AlertCircle, ArrowRight,
} from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function ProjectDetailPage({ params }: { params: { id: string } }) {
  const project = await prisma.project.findUnique({
    where: { id: params.id },
    include: {
      phases: {
        include: {
          _count: { select: { collections: true, expenses: true } },
        },
        orderBy: { sequence: 'asc' },
      },
      buyers: {
        include: { buyer: true },
        take: 10,
      },
      _count: { select: { phases: true, buyers: true, units: true } },
    },
  });

  if (!project) notFound();

  // Aggregate financials
  const [totalIncome, totalExpense] = await Promise.all([
    prisma.collection.aggregate({
      where: { phase: { projectId: project.id } },
      _sum: { amount: true },
    }),
    prisma.expense.aggregate({
      where: { phase: { projectId: project.id } },
      _sum: { amount: true },
    }),
  ]);

  const income = Number(totalIncome._sum.amount ?? 0);
  const expense = Number(totalExpense._sum.amount ?? 0);
  const balance = income - expense;

  // Phase-wise summary
  const phaseFinancials = await Promise.all(
    project.phases.map(async (phase) => {
      const [inc, exp] = await Promise.all([
        prisma.collection.aggregate({ where: { phaseId: phase.id }, _sum: { amount: true } }),
        prisma.expense.aggregate({ where: { phaseId: phase.id }, _sum: { amount: true } }),
      ]);
      return {
        phase,
        income: Number(inc._sum.amount ?? 0),
        expense: Number(exp._sum.amount ?? 0),
      };
    })
  );

  return (
    <div className="flex flex-col min-h-full">
      <Header title={project.name} />

      <div className="p-6 space-y-6">
        {/* Project Info Card */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">{project.name}</h2>
                    {project.nameBn && <p className="bn text-sm text-muted-foreground">{project.nameBn}</p>}
                  </div>
                </div>
                <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                  {project.address && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      <span>{project.address}</span>
                    </div>
                  )}
                  {project.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      <span>{project.phone}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <Badge className={cn(
                  'text-sm px-3 py-1',
                  project.status === 'ACTIVE' ? 'bg-blue-100 text-blue-700 border-0' : 'border-0'
                )}>
                  {project.status}
                </Badge>
                {project.code && <span className="text-xs font-mono text-muted-foreground">{project.code}</span>}
                {project.startDate && (
                  <span className="text-xs text-muted-foreground">Started: {formatDate(project.startDate)}</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Financial KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Collection" value={formatBDTCompact(income)} subtitle={formatBDT(income)} icon={TrendingUp} iconColor="text-green-600" iconBg="bg-green-50" />
          <StatCard title="Total Expense" value={formatBDTCompact(expense)} subtitle={formatBDT(expense)} icon={TrendingDown} iconColor="text-red-500" iconBg="bg-red-50" />
          <StatCard
            title="Net Balance"
            value={formatBDTCompact(balance)}
            subtitle={balance >= 0 ? 'Surplus' : 'Deficit'}
            icon={balance >= 0 ? CheckCircle2 : AlertCircle}
            iconColor={balance >= 0 ? 'text-emerald-600' : 'text-red-600'}
            iconBg={balance >= 0 ? 'bg-emerald-50' : 'bg-red-50'}
          />
          <StatCard title="Total Phases" value={String(project._count.phases)} subtitle={`${project._count.buyers} buyers`} icon={Layers} iconColor="text-blue-600" iconBg="bg-blue-50" />
        </div>

        {/* Phase Financial Table */}
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-base">Phase-wise Financial Summary</CardTitle>
            <Link href={`/reports/top-sheet?projectId=${project.id}`} className="text-xs text-primary flex items-center gap-1 hover:underline">
              Full Top Sheet <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">#</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Phase</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Type</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Income</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Expense</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Balance</th>
                    <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {phaseFinancials.map(({ phase, income: pIncome, expense: pExpense }, i) => {
                    const pBalance = pIncome - pExpense;
                    const meta = phaseStatusMeta(phase.status);
                    return (
                      <tr key={phase.id} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="px-4 py-3 text-muted-foreground text-xs">{i + 1}</td>
                        <td className="px-4 py-3">
                          <Link href={`/phases/${phase.id}`} className="font-medium hover:text-primary hover:underline">
                            {phase.name}
                          </Link>
                          {phase.nameBn && <div className="bn text-xs text-muted-foreground">{phase.nameBn}</div>}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{phaseTypeLabel(phase.phaseType)}</td>
                        <td className="px-4 py-3 text-right text-green-600 font-medium">{formatBDT(pIncome)}</td>
                        <td className="px-4 py-3 text-right text-red-500 font-medium">{formatBDT(pExpense)}</td>
                        <td className={cn('px-4 py-3 text-right font-bold', balanceColor(pBalance))}>
                          {formatBDT(pBalance)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', meta.color)}>
                            {meta.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {/* Grand Total Row */}
                  <tr className="bg-muted/60 font-bold border-t-2">
                    <td className="px-4 py-3" colSpan={3}>Grand Total</td>
                    <td className="px-4 py-3 text-right text-green-600">{formatBDT(income)}</td>
                    <td className="px-4 py-3 text-right text-red-500">{formatBDT(expense)}</td>
                    <td className={cn('px-4 py-3 text-right', balanceColor(balance))}>{formatBDT(balance)}</td>
                    <td />
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Recent Buyers */}
        {project.buyers.length > 0 && (
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-base">Recent Buyers</CardTitle>
              <Link href={`/buyers?projectId=${project.id}`} className="text-xs text-primary flex items-center gap-1 hover:underline">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {project.buyers.map(({ buyer }) => (
                  <div key={buyer.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                      {buyer.name[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{buyer.name}</p>
                      {buyer.phone && <p className="text-xs text-muted-foreground">{buyer.phone}</p>}
                    </div>
                    <div className="ml-auto">
                      <span className={cn(
                        'text-xs px-2 py-0.5 rounded-full font-medium',
                        buyer.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                        buyer.status === 'DEFAULTER' ? 'bg-red-100 text-red-600' :
                        'bg-gray-100 text-gray-600'
                      )}>
                        {buyer.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

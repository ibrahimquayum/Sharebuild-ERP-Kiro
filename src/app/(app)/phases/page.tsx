import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Header } from '@/components/layout/header';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { StatCard } from '@/components/shared/stat-card';
import { LegacyWorkNotice } from '@/components/shared/legacy-work-notice';
import { formatBDT, formatBDTCompact, formatDate, phaseStatusMeta, phaseTypeLabel, balanceColor, cn } from '@/lib/utils';
import { Layers, TrendingUp, TrendingDown, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function PhasesPage() {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as any)?.companyId ?? '';

  const phases = await prisma.phase.findMany({
    where: { project: { companyId } },
    include: {
      project: { select: { id: true, name: true } },
      _count: { select: { collections: true, expenses: true } },
    },
    orderBy: [{ project: { name: 'asc' } }, { sequence: 'asc' }],
  });

  // fetch financials for each phase
  const phaseFinancials = await Promise.all(
    phases.map(async (p) => {
      const [inc, exp] = await Promise.all([
        prisma.collection.aggregate({ where: { phaseId: p.id }, _sum: { amount: true } }),
        prisma.expense.aggregate({ where: { phaseId: p.id }, _sum: { amount: true } }),
      ]);
      return {
        phaseId: p.id,
        income: Number(inc._sum.amount ?? 0),
        expense: Number(exp._sum.amount ?? 0),
      };
    })
  );

  const finMap = Object.fromEntries(phaseFinancials.map((f) => [f.phaseId, f]));
  const totalIncome = phaseFinancials.reduce((s, f) => s + f.income, 0);
  const totalExpense = phaseFinancials.reduce((s, f) => s + f.expense, 0);

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Phases" />
      <PageHeader
        title="Construction Phases"
        subtitle="All project phases from Piling to Finishing"
        action={{ label: 'Add Phase', href: '/phases/new' }}
      />

      <div className="p-6 space-y-6">
        <LegacyWorkNotice />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Phases" value={String(phases.length)} subtitle="Piling → Finishing" icon={Layers} iconColor="text-blue-600" iconBg="bg-blue-50" />
          <StatCard title="Total Collection" value={formatBDTCompact(totalIncome)} subtitle={formatBDT(totalIncome)} icon={TrendingUp} iconColor="text-green-600" iconBg="bg-green-50" />
          <StatCard title="Total Expense" value={formatBDTCompact(totalExpense)} subtitle={formatBDT(totalExpense)} icon={TrendingDown} iconColor="text-red-500" iconBg="bg-red-50" />
          <StatCard
            title="Net Balance"
            value={formatBDTCompact(totalIncome - totalExpense)}
            subtitle={(totalIncome - totalExpense) >= 0 ? 'Surplus' : 'Deficit'}
            icon={CheckCircle2}
            iconColor={(totalIncome - totalExpense) >= 0 ? 'text-emerald-600' : 'text-red-600'}
            iconBg={(totalIncome - totalExpense) >= 0 ? 'bg-emerald-50' : 'bg-red-50'}
          />
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">#</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Phase</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Project</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Type</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Income</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Expense</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Balance</th>
                    <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                    <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">Entries</th>
                  </tr>
                </thead>
                <tbody>
                  {phases.map((phase, i) => {
                    const fin = finMap[phase.id] ?? { income: 0, expense: 0 };
                    const bal = fin.income - fin.expense;
                    const meta = phaseStatusMeta(phase.status);
                    return (
                      <tr key={phase.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 text-muted-foreground text-xs">{i + 1}</td>
                        <td className="px-4 py-3">
                          <Link href={`/phases/${phase.id}`} className="font-medium hover:text-primary hover:underline">
                            {phase.name}
                          </Link>
                          {phase.nameBn && <div className="bn text-xs text-muted-foreground">{phase.nameBn}</div>}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          <Link href={`/projects/${phase.project.id}`} className="hover:text-primary hover:underline">
                            {phase.project.name}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{phaseTypeLabel(phase.phaseType)}</td>
                        <td className="px-4 py-3 text-right text-green-600 font-medium">{formatBDT(fin.income)}</td>
                        <td className="px-4 py-3 text-right text-red-500 font-medium">{formatBDT(fin.expense)}</td>
                        <td className={cn('px-4 py-3 text-right font-bold', balanceColor(bal))}>{formatBDT(bal)}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', meta.color)}>{meta.label}</span>
                        </td>
                        <td className="px-4 py-3 text-center text-xs text-muted-foreground">
                          {phase._count.collections}↑ / {phase._count.expenses}↓
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="bg-muted/60 font-bold border-t-2">
                    <td className="px-4 py-3" colSpan={4}>Grand Total</td>
                    <td className="px-4 py-3 text-right text-green-600">{formatBDT(totalIncome)}</td>
                    <td className="px-4 py-3 text-right text-red-500">{formatBDT(totalExpense)}</td>
                    <td className={cn('px-4 py-3 text-right', balanceColor(totalIncome - totalExpense))}>{formatBDT(totalIncome - totalExpense)}</td>
                    <td colSpan={2} />
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

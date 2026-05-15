import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Header } from '@/components/layout/header';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { formatBDT, phaseTypeLabel, phaseStatusMeta, balanceColor, cn } from '@/lib/utils';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function PhaseSummaryReportPage() {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as any)?.companyId ?? '';

  const phases = await prisma.phase.findMany({
    where: { project: { companyId } },
    include: { project: { select: { id: true, name: true } } },
    orderBy: [{ project: { name: 'asc' } }, { sequence: 'asc' }],
  });

  const phaseData = await Promise.all(phases.map(async (ph) => {
    const [inc, exp, colCount, expCount] = await Promise.all([
      prisma.collection.aggregate({ where: { phaseId: ph.id }, _sum: { amount: true } }),
      prisma.expense.aggregate({ where: { phaseId: ph.id }, _sum: { amount: true } }),
      prisma.collection.count({ where: { phaseId: ph.id } }),
      prisma.expense.count({ where: { phaseId: ph.id } }),
    ]);
    return {
      phase: ph,
      income: Number(inc._sum.amount ?? 0),
      expense: Number(exp._sum.amount ?? 0),
      collections: colCount,
      expenses: expCount,
    };
  }));

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Phase Summary" />
      <PageHeader title="Phase Summary Report" subtitle="Income, expense, and balance per phase" />
      <div className="p-6">
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase">#</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase">Phase</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase">Type</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase">Status</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-green-700 uppercase">Income</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-red-600 uppercase">Expense</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase">Balance</th>
                    <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground uppercase">Entries</th>
                  </tr>
                </thead>
                <tbody>
                  {phaseData.map((d, i) => {
                    const bal = d.income - d.expense;
                    const meta = phaseStatusMeta(d.phase.status);
                    return (
                      <tr key={d.phase.id} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="px-4 py-3 text-xs text-muted-foreground">{i + 1}</td>
                        <td className="px-4 py-3">
                          <Link href={`/phases/${d.phase.id}`} className="font-medium hover:text-primary hover:underline">{d.phase.name}</Link>
                          <div className="text-xs text-muted-foreground">{d.phase.project.name}</div>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{phaseTypeLabel(d.phase.phaseType)}</td>
                        <td className="px-4 py-3"><span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', meta.color)}>{meta.label}</span></td>
                        <td className="px-4 py-3 text-right text-green-600 font-medium">{formatBDT(d.income)}</td>
                        <td className="px-4 py-3 text-right text-red-500 font-medium">{formatBDT(d.expense)}</td>
                        <td className={cn('px-4 py-3 text-right font-bold', balanceColor(bal))}>{formatBDT(bal)}</td>
                        <td className="px-4 py-3 text-center text-xs text-muted-foreground">{d.collections}↑ {d.expenses}↓</td>
                      </tr>
                    );
                  })}
                  <tr className="bg-muted/60 font-bold border-t-2">
                    <td colSpan={4} className="px-4 py-3">Total</td>
                    <td className="px-4 py-3 text-right text-green-600">{formatBDT(phaseData.reduce((s, d) => s + d.income, 0))}</td>
                    <td className="px-4 py-3 text-right text-red-500">{formatBDT(phaseData.reduce((s, d) => s + d.expense, 0))}</td>
                    <td className={cn('px-4 py-3 text-right', balanceColor(phaseData.reduce((s, d) => s + (d.income - d.expense), 0)))}>
                      {formatBDT(phaseData.reduce((s, d) => s + (d.income - d.expense), 0))}
                    </td>
                    <td />
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

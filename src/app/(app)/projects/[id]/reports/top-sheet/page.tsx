/**
 * Project-scoped Top Sheet.
 * The project ID comes from the URL — no project selector needed.
 * Reuses exactly the same query logic as the global /reports/top-sheet
 * but pins it to this project only.
 */
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { formatBDT, formatDate, phaseTypeLabel, balanceColor, cn } from '@/lib/utils';
import { BarChart3, MapPin, Phone } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { getCompanyBranding } from '@/lib/branding';
import { ReportHeader } from '@/components/shared/report-header';
import { ReportActions } from '@/components/shared/report-actions';
import { FINAL_EXPENSE_STATUSES } from '@/lib/accounting';

export const dynamic = 'force-dynamic';

export default async function ProjectTopSheetPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as any)?.companyId ?? '';

  const project = await prisma.project.findFirst({
    where: { id: params.id, companyId },
  });
  if (!project) notFound();
  const branding = await getCompanyBranding(companyId);

  const phases = await prisma.phase.findMany({
    where: { projectId: project.id, status: { in: ['ACTIVE', 'APPROVED', 'INCLUDED_IN_SUMMARY'] } },
    orderBy: { sequence: 'asc' },
  });

  const phaseData = await Promise.all(
    phases.map(async (ph) => {
      const [inc, exp] = await Promise.all([
        prisma.collection.aggregate({ where: { phaseId: ph.id, status: { not: 'REVERSED' } }, _sum: { amount: true } }),
        prisma.expense.aggregate({ where: { phaseId: ph.id, status: { in: [...FINAL_EXPENSE_STATUSES] }, reversedAt: null }, _sum: { amount: true } }),
      ]);
      return { phase: ph, income: Number(inc._sum.amount ?? 0), expense: Number(exp._sum.amount ?? 0) };
    })
  );

  const slabPhases    = phaseData.filter(d => d.phase.phaseType !== 'GATHUNI');
  const gathuniPhases = phaseData.filter(d => d.phase.phaseType === 'GATHUNI');

  const totalSlabIncome    = slabPhases.reduce((s, d) => s + d.income, 0);
  const totalSlabExpense   = slabPhases.reduce((s, d) => s + d.expense, 0);
  const totalGathuniIncome = gathuniPhases.reduce((s, d) => s + d.income, 0);
  const totalGathuniExpense= gathuniPhases.reduce((s, d) => s + d.expense, 0);
  const grandTotalIncome   = totalSlabIncome + totalGathuniIncome;
  const grandTotalExpense  = totalSlabExpense + totalGathuniExpense;
  const finalBalance       = grandTotalIncome - grandTotalExpense;

  return (
    <div className="p-5 space-y-5 print:p-0">
      <div className="flex justify-end">
        <ReportActions pdfReady csvHref={`/api/projects/${project.id}/reports/top-sheet/excel`} />
      </div>
      <ReportHeader
        branding={branding}
        project={project}
        title="Project Top Sheet"
        subtitle="Phase-wise income, expense, and balance summary"
      />
      {/* Project header */}
      <Card className="border-2 border-primary/20 print:hidden">
        <CardContent className="p-5 text-center space-y-1">
          <h1 className="text-2xl font-bold">{project.name}</h1>
          {project.nameBn && <p className="bn text-base text-muted-foreground">{project.nameBn}</p>}
          <div className="flex items-center justify-center gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
            {project.address && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{project.address}</span>}
            {project.phone  && <span className="flex items-center gap-1"><Phone  className="h-3.5 w-3.5" />{project.phone}</span>}
          </div>
          {project.startDate && <p className="text-xs text-muted-foreground">Started: {formatDate(project.startDate)}</p>}
        </CardContent>
      </Card>

      {/* Grand KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-green-200 bg-green-50/40">
          <CardContent className="p-4 text-center">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Grand Total Income</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{formatBDT(grandTotalIncome)}</p>
            <p className="text-xs text-muted-foreground mt-1">Slab: {formatBDT(totalSlabIncome)} | Gathuni: {formatBDT(totalGathuniIncome)}</p>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50/40">
          <CardContent className="p-4 text-center">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Grand Total Expense</p>
            <p className="text-2xl font-bold text-red-500 mt-1">{formatBDT(grandTotalExpense)}</p>
            <p className="text-xs text-muted-foreground mt-1">Slab: {formatBDT(totalSlabExpense)} | Gathuni: {formatBDT(totalGathuniExpense)}</p>
          </CardContent>
        </Card>
        <Card className={cn('border-2', finalBalance >= 0 ? 'border-emerald-200 bg-emerald-50/40' : 'border-red-300 bg-red-50/40')}>
          <CardContent className="p-4 text-center">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Final Balance</p>
            <p className={cn('text-2xl font-bold mt-1', balanceColor(finalBalance))}>{formatBDT(finalBalance)}</p>
            <p className={cn('text-xs font-semibold mt-1', finalBalance >= 0 ? 'text-emerald-600' : 'text-red-600')}>
              {finalBalance >= 0 ? '✅ Surplus' : '⚠️ Deficit'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" /> Top Sheet — Phase-wise Summary
          </CardTitle>
          <CardDescription>All construction phases · Income vs Expense · Balance</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase w-8">#</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Phase</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Period</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-green-700 uppercase">Income (৳)</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-red-600 uppercase">Expense (৳)</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase">Balance (৳)</th>
                </tr>
              </thead>
              <tbody>
                {slabPhases.length > 0 && (
                  <>
                    <tr className="bg-blue-50/60 border-b">
                      <td colSpan={7} className="px-4 py-2 text-xs font-bold text-blue-700 uppercase tracking-wide">── Construction / Slab Phases</td>
                    </tr>
                    {slabPhases.map((d, i) => {
                      const bal = d.income - d.expense;
                      return (
                        <tr key={d.phase.id} className="border-b hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 text-xs text-muted-foreground">{i + 1}</td>
                          <td className="px-4 py-3">
                            <Link href={`/phases/${d.phase.id}`} className="font-semibold hover:text-primary hover:underline">{d.phase.name}</Link>
                            {d.phase.nameBn && <div className="bn text-xs text-muted-foreground">{d.phase.nameBn}</div>}
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">{phaseTypeLabel(d.phase.phaseType)}</td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            {d.phase.startDate ? formatDate(d.phase.startDate) : ''}
                            {d.phase.endDate ? ` – ${formatDate(d.phase.endDate)}` : ''}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-green-600">{formatBDT(d.income)}</td>
                          <td className="px-4 py-3 text-right font-semibold text-red-500">{formatBDT(d.expense)}</td>
                          <td className={cn('px-4 py-3 text-right font-bold', balanceColor(bal))}>{formatBDT(bal)}</td>
                        </tr>
                      );
                    })}
                    <tr className="bg-blue-50/80 border-b-2 font-bold">
                      <td colSpan={4} className="px-4 py-3 text-xs text-blue-700">Sub-total (Slab)</td>
                      <td className="px-4 py-3 text-right text-green-600">{formatBDT(totalSlabIncome)}</td>
                      <td className="px-4 py-3 text-right text-red-500">{formatBDT(totalSlabExpense)}</td>
                      <td className={cn('px-4 py-3 text-right', balanceColor(totalSlabIncome - totalSlabExpense))}>{formatBDT(totalSlabIncome - totalSlabExpense)}</td>
                    </tr>
                  </>
                )}
                {gathuniPhases.length > 0 && (
                  <>
                    <tr className="bg-amber-50/60 border-b">
                      <td colSpan={7} className="px-4 py-2 text-xs font-bold text-amber-700 uppercase tracking-wide">── Gathuni / Masonry Phases</td>
                    </tr>
                    {gathuniPhases.map((d, i) => {
                      const bal = d.income - d.expense;
                      return (
                        <tr key={d.phase.id} className="border-b hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 text-xs text-muted-foreground">{i + 1}</td>
                          <td className="px-4 py-3">
                            <Link href={`/phases/${d.phase.id}`} className="font-semibold hover:text-primary hover:underline">{d.phase.name}</Link>
                            {d.phase.nameBn && <div className="bn text-xs text-muted-foreground">{d.phase.nameBn}</div>}
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">{phaseTypeLabel(d.phase.phaseType)}</td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            {d.phase.startDate ? formatDate(d.phase.startDate) : ''}
                            {d.phase.endDate ? ` – ${formatDate(d.phase.endDate)}` : ''}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-green-600">{formatBDT(d.income)}</td>
                          <td className="px-4 py-3 text-right font-semibold text-red-500">{formatBDT(d.expense)}</td>
                          <td className={cn('px-4 py-3 text-right font-bold', balanceColor(bal))}>{formatBDT(bal)}</td>
                        </tr>
                      );
                    })}
                    <tr className="bg-amber-50/80 border-b-2 font-bold">
                      <td colSpan={4} className="px-4 py-3 text-xs text-amber-700">Sub-total (Gathuni)</td>
                      <td className="px-4 py-3 text-right text-green-600">{formatBDT(totalGathuniIncome)}</td>
                      <td className="px-4 py-3 text-right text-red-500">{formatBDT(totalGathuniExpense)}</td>
                      <td className={cn('px-4 py-3 text-right', balanceColor(totalGathuniIncome - totalGathuniExpense))}>{formatBDT(totalGathuniIncome - totalGathuniExpense)}</td>
                    </tr>
                  </>
                )}
                <tr className="bg-slate-100 font-bold text-base border-t-2 border-slate-400">
                  <td colSpan={4} className="px-4 py-4 text-slate-800">GRAND TOTAL</td>
                  <td className="px-4 py-4 text-right text-green-700 text-lg">{formatBDT(grandTotalIncome)}</td>
                  <td className="px-4 py-4 text-right text-red-600 text-lg">{formatBDT(grandTotalExpense)}</td>
                  <td className={cn('px-4 py-4 text-right text-lg font-extrabold', balanceColor(finalBalance))}>{formatBDT(finalBalance)}</td>
                </tr>
                <tr className={cn('font-bold', finalBalance >= 0 ? 'bg-emerald-50' : 'bg-red-50')}>
                  <td colSpan={6} className={cn('px-4 py-3 text-sm', finalBalance >= 0 ? 'text-emerald-700' : 'text-red-700')}>
                    {finalBalance >= 0
                      ? `✅ Project has a surplus of ${formatBDT(finalBalance)}`
                      : `⚠️ Project has a deficit of ${formatBDT(Math.abs(finalBalance))}`}
                  </td>
                  <td />
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

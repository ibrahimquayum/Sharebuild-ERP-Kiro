import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { formatBDT, phaseStatusMeta, cn } from '@/lib/utils';
import { getProjectPhaseBalances } from '@/lib/project-finance';
import { Plus, LayoutGrid, Eye, ShoppingCart, Receipt, FileText, Pencil, BarChart3 } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function ProjectPhasesPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as any)?.companyId ?? '';

  const project = await prisma.project.findFirst({
    where: { id: params.id, companyId },
    select: { id: true, name: true },
  });
  if (!project) notFound();

  // Load all phases for this project ordered by sequence
  const phases = await prisma.phase.findMany({
    where: { projectId: project.id },
    orderBy: { sequence: 'asc' },
  });

  const [phaseBalances, expenseProgressRows] = await Promise.all([
    getProjectPhaseBalances(project.id),
    Promise.all(
      phases.map(async (ph) => {
        const [expTotal, expApproved] = await Promise.all([
          prisma.expense.count({ where: { phaseId: ph.id } }),
          prisma.expense.count({ where: { phaseId: ph.id, status: 'APPROVED' } }),
        ]);
        return {
          phaseId: ph.id,
          progress: expTotal > 0 ? Math.round((expApproved / expTotal) * 100) : 0,
        };
      }),
    ),
  ]);

  const finMap = Object.fromEntries(
    phaseBalances.map((row) => [
      row.phaseId,
      {
        collection: row.collection,
        actualConstructionCost: row.actualConstructionCost,
        totalPhaseCost: row.totalPhaseCost,
        serviceCharge: row.serviceCharge,
        serviceChargePct: row.serviceChargePct,
        balance: row.balance,
        payable: row.supplierPayable + row.subcontractorPayable,
        buyerDue: Math.max(row.demand - row.collection, 0),
      },
    ]),
  );
  const progressMap = Object.fromEntries(expenseProgressRows.map((row) => [row.phaseId, row.progress]));
  const base = `/projects/${project.id}`;

  return (
    <div className="p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold">Phases</h1>
          <p className="text-xs text-muted-foreground">
            {project.name} · {phases.length} phase{phases.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`${base}/phases/board`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-medium hover:bg-muted transition-colors"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            Board View
          </Link>
          <Link
            href="/phases/new"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Phase
          </Link>
        </div>
      </div>

      {/* Phase table */}
      {phases.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <p className="text-sm text-muted-foreground mb-3">No phases yet for this project.</p>
          <Link
            href="/phases/new"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Create First Phase
          </Link>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground whitespace-nowrap">#</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground whitespace-nowrap">Phase</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground whitespace-nowrap">Status</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground whitespace-nowrap">Progress</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground whitespace-nowrap">Collection</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground whitespace-nowrap">Phase Cost</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground whitespace-nowrap">Balance</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground whitespace-nowrap">Buyer Due</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground whitespace-nowrap">Payable</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {phases.map((ph, idx) => {
                  const fin  = finMap[ph.id] ?? {
                    collection: 0,
                    actualConstructionCost: 0,
                    totalPhaseCost: 0,
                    serviceCharge: 0,
                    serviceChargePct: 0,
                    balance: 0,
                    payable: 0,
                    buyerDue: 0,
                  };
                  const meta = phaseStatusMeta(ph.status);
                  const progress = progressMap[ph.id] ?? 0;
                  return (
                    <tr key={ph.id} className="hover:bg-muted/30 transition-colors">
                      {/* # */}
                      <td className="px-4 py-3 text-xs text-muted-foreground">{idx + 1}</td>

                      {/* Phase name */}
                      <td className="px-4 py-3">
                        <p className="font-medium text-sm leading-tight">{ph.name}</p>
                        {ph.nameBn && (
                          <p className="text-xs bn text-muted-foreground">{ph.nameBn}</p>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', meta.color)}>
                          {meta.label}
                        </span>
                      </td>

                      {/* Progress */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden hidden sm:block">
                            <div
                              className="h-full rounded-full bg-blue-500"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium tabular-nums">{progress}%</span>
                        </div>
                      </td>

                      {/* Collection */}
                      <td className="px-4 py-3 text-right text-xs font-medium text-green-600 tabular-nums whitespace-nowrap">
                        {formatBDT(fin.collection)}
                      </td>

                      {/* Total phase cost */}
                      <td className="px-4 py-3 text-right text-xs font-medium text-red-500 tabular-nums whitespace-nowrap">
                        {formatBDT(fin.totalPhaseCost)}
                        {fin.serviceCharge > 0 ? (
                          <div className="text-[11px] font-normal text-slate-500">
                            {formatBDT(fin.actualConstructionCost)} + SC {fin.serviceChargePct.toFixed(2)}%
                          </div>
                        ) : null}
                      </td>

                      {/* Balance */}
                      <td className={cn(
                        'px-4 py-3 text-right text-xs font-bold tabular-nums whitespace-nowrap',
                        fin.balance >= 0 ? 'text-emerald-600' : 'text-red-600'
                      )}>
                        {formatBDT(fin.balance)}
                      </td>

                      {/* Buyer Due */}
                      <td className="px-4 py-3 text-right text-xs font-medium text-amber-600 tabular-nums whitespace-nowrap">
                        {formatBDT(fin.buyerDue)}
                      </td>

                      {/* Payable */}
                      <td className="px-4 py-3 text-right text-xs font-medium text-orange-600 tabular-nums whitespace-nowrap">
                        {formatBDT(fin.payable)}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 flex-wrap">
                          <Link
                            href={`/phases/${ph.id}`}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-muted hover:bg-muted/80 transition-colors"
                            title="View"
                          >
                            <Eye className="h-3 w-3" />
                            <span className="hidden lg:inline">View</span>
                          </Link>
                          <Link
                            href={`${base}/expenses/new?phaseId=${ph.id}`}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-red-50 text-red-700 hover:bg-red-100 transition-colors"
                            title="Add Expense"
                          >
                            <ShoppingCart className="h-3 w-3" />
                            <span className="hidden lg:inline">Expense</span>
                          </Link>
                          <Link
                            href={`${base}/collections/new?phaseId=${ph.id}`}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-green-50 text-green-700 hover:bg-green-100 transition-colors"
                            title="Record Collection"
                          >
                            <Receipt className="h-3 w-3" />
                            <span className="hidden lg:inline">Collect</span>
                          </Link>
                          <Link
                            href={`${base}/demands?phaseId=${ph.id}`}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                            title="Issue Demand"
                          >
                            <FileText className="h-3 w-3" />
                            <span className="hidden lg:inline">Demand</span>
                          </Link>
                          <Link
                            href={`/phases/${ph.id}/edit`}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-muted hover:bg-muted/80 transition-colors"
                            title="Edit"
                          >
                            <Pencil className="h-3 w-3" />
                            <span className="hidden lg:inline">Edit</span>
                          </Link>
                          <Link
                            href={`${base}/reports/top-sheet?phaseId=${ph.id}`}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-muted hover:bg-muted/80 transition-colors"
                            title="Report"
                          >
                            <BarChart3 className="h-3 w-3" />
                            <span className="hidden lg:inline">Report</span>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* Totals footer */}
              {phases.length > 1 && (() => {
                const totals = Object.values(finMap).reduce(
                  (acc, f) => ({
                    collection: acc.collection + f.collection,
                    totalPhaseCost: acc.totalPhaseCost + f.totalPhaseCost,
                    balance: acc.balance + f.balance,
                    buyerDue: acc.buyerDue + f.buyerDue,
                    payable: acc.payable + f.payable,
                  }),
                  { collection: 0, totalPhaseCost: 0, balance: 0, buyerDue: 0, payable: 0 }
                );
                return (
                  <tfoot>
                    <tr className="border-t-2 bg-muted/50 font-bold">
                      <td colSpan={4} className="px-4 py-2.5 text-xs text-muted-foreground">
                        Totals ({phases.length} phases)
                      </td>
                      <td className="px-4 py-2.5 text-right text-xs text-green-600 tabular-nums whitespace-nowrap">
                        {formatBDT(totals.collection)}
                      </td>
                      <td className="px-4 py-2.5 text-right text-xs text-red-500 tabular-nums whitespace-nowrap">
                        {formatBDT(totals.totalPhaseCost)}
                      </td>
                      <td className={cn(
                        'px-4 py-2.5 text-right text-xs tabular-nums whitespace-nowrap',
                        totals.balance >= 0 ? 'text-emerald-600' : 'text-red-600'
                      )}>
                        {formatBDT(totals.balance)}
                      </td>
                      <td className="px-4 py-2.5 text-right text-xs text-amber-600 tabular-nums whitespace-nowrap">
                        {formatBDT(totals.buyerDue)}
                      </td>
                      <td className="px-4 py-2.5 text-right text-xs text-orange-600 tabular-nums whitespace-nowrap">
                        {formatBDT(totals.payable)}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                );
              })()}
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

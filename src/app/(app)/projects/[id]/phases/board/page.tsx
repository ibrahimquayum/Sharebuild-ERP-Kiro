import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { formatBDT, cn } from '@/lib/utils';
import { AlertCircle, ArrowLeft, TrendingUp, TrendingDown } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

/**
 * Operational board columns — these map to derived workflow state,
 * NOT directly to PhaseStatus enum values.
 */
const BOARD_COLUMNS = [
  {
    key: 'planned',
    label: 'Planned',
    description: 'No demands or expenses yet',
    color: 'bg-slate-50 border-slate-200',
    badge: 'bg-slate-100 text-slate-600',
    cardBorder: 'border-slate-200',
  },
  {
    key: 'demand_issued',
    label: 'Demand Issued',
    description: 'Demand sent, work not started',
    color: 'bg-blue-50 border-blue-200',
    badge: 'bg-blue-100 text-blue-700',
    cardBorder: 'border-blue-200',
  },
  {
    key: 'running',
    label: 'Running',
    description: 'Expenses being recorded',
    color: 'bg-green-50 border-green-200',
    badge: 'bg-green-100 text-green-700',
    cardBorder: 'border-green-300',
  },
  {
    key: 'final_bill_pending',
    label: 'Final Bill Pending',
    description: 'Expenses pending approval',
    color: 'bg-amber-50 border-amber-200',
    badge: 'bg-amber-100 text-amber-700',
    cardBorder: 'border-amber-300',
  },
  {
    key: 'ready_for_audit',
    label: 'Ready for Audit',
    description: 'All expenses approved & documented',
    color: 'bg-emerald-50 border-emerald-200',
    badge: 'bg-emerald-100 text-emerald-700',
    cardBorder: 'border-emerald-300',
  },
] as const;

type BoardColumnKey = (typeof BOARD_COLUMNS)[number]['key'];

interface PhaseCard {
  id: string;
  name: string;
  nameBn: string | null;
  collection: number;
  expense: number;
  balance: number;
  progress: number;
  collectionPct: number;
  missingVouchers: number;
  demandTotal: number;
}

function classifyPhase(
  demandCount: number,
  expenseCount: number,
  approvedExpenseCount: number,
  pendingExpenseCount: number,
  missingVouchers: number
): BoardColumnKey {
  if (demandCount === 0 && expenseCount === 0) return 'planned';
  if (demandCount > 0 && approvedExpenseCount === 0) return 'demand_issued';
  if (pendingExpenseCount > 0) return 'final_bill_pending';
  if (approvedExpenseCount > 0 && missingVouchers === 0) return 'ready_for_audit';
  return 'running';
}

export default async function ProjectPhaseBoardPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as any)?.companyId ?? '';

  const project = await prisma.project.findFirst({
    where: { id: params.id, companyId },
    select: { id: true, name: true },
  });
  if (!project) notFound();

  // Only operational phases: DRAFT or ACTIVE
  const phases = await prisma.phase.findMany({
    where: {
      projectId: project.id,
      status: { in: ['DRAFT', 'ACTIVE'] },
    },
    orderBy: { sequence: 'asc' },
  });

  // Per-phase data
  const phaseData = await Promise.all(
    phases.map(async (ph) => {
      const [collAgg, expAgg, expTotal, expApproved, expPending, missingVouchers, demandAgg] =
        await Promise.all([
          prisma.collection.aggregate({ where: { phaseId: ph.id }, _sum: { amount: true } }),
          prisma.expense.aggregate({ where: { phaseId: ph.id }, _sum: { amount: true } }),
          prisma.expense.count({ where: { phaseId: ph.id } }),
          prisma.expense.count({ where: { phaseId: ph.id, status: 'APPROVED' } }),
          prisma.expense.count({ where: { phaseId: ph.id, status: 'PENDING_APPROVAL' } }),
          prisma.expense.count({
            where: {
              phaseId: ph.id,
              documents: { none: {} },
              status: { in: ['APPROVED', 'PENDING_APPROVAL'] },
            },
          }),
          prisma.demand.aggregate({
            where: { phaseId: ph.id, status: { notIn: ['CANCELLED'] } },
            _sum: { amount: true },
          }),
        ]);

      const collection  = Number(collAgg._sum.amount ?? 0);
      const expense     = Number(expAgg._sum.amount ?? 0);
      const demandTotal = Number(demandAgg._sum.amount ?? 0);
      const progress    = expTotal > 0 ? Math.round((expApproved / expTotal) * 100) : 0;
      const collectionPct =
        demandTotal > 0 ? Math.min(100, Math.round((collection / demandTotal) * 100)) : -1;

      const columnKey = classifyPhase(
        demandTotal > 0 ? 1 : 0, // demand count proxy
        expTotal,
        expApproved,
        expPending,
        missingVouchers
      );

      const card: PhaseCard = {
        id: ph.id,
        name: ph.name,
        nameBn: ph.nameBn,
        collection,
        expense,
        balance: collection - expense,
        progress,
        collectionPct,
        missingVouchers,
        demandTotal,
      };

      return { columnKey, card };
    })
  );

  // Group into columns
  const grouped: Record<BoardColumnKey, PhaseCard[]> = {
    planned: [],
    demand_issued: [],
    running: [],
    final_bill_pending: [],
    ready_for_audit: [],
  };
  for (const { columnKey, card } of phaseData) {
    grouped[columnKey].push(card);
  }

  const base = `/projects/${project.id}`;
  const totalOperational = phases.length;

  return (
    <div className="p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href={`${base}/phases`}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Phase List
            </Link>
          </div>
          <h1 className="text-base font-semibold mt-1">Phase Board</h1>
          <p className="text-xs text-muted-foreground">
            {project.name} · {totalOperational} operational phase{totalOperational !== 1 ? 's' : ''}
            {' '}(DRAFT &amp; ACTIVE only)
          </p>
        </div>
      </div>

      {totalOperational === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <p className="text-sm text-muted-foreground mb-2">
            No operational phases (DRAFT or ACTIVE) found for this project.
          </p>
          <Link
            href={`${base}/phases`}
            className="text-xs text-primary hover:underline"
          >
            ← Back to Phase List
          </Link>
        </div>
      ) : (
        <>
          {/* Board */}
          <div className="overflow-x-auto pb-3">
            <div className="flex gap-3 min-w-max">
              {BOARD_COLUMNS.map((col) => {
                const cards = grouped[col.key];
                return (
                  <div
                    key={col.key}
                    className={cn('w-60 rounded-xl border-2 flex flex-col', col.color)}
                  >
                    {/* Column header */}
                    <div className="px-3 py-2 border-b border-inherit flex items-center justify-between">
                      <div>
                        <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full', col.badge)}>
                          {col.label}
                        </span>
                        <p className="text-xs text-muted-foreground mt-0.5 px-1">{col.description}</p>
                      </div>
                      <span className="text-xs font-bold text-muted-foreground ml-2 shrink-0">
                        {cards.length}
                      </span>
                    </div>

                    {/* Cards */}
                    <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[calc(100vh-240px)]">
                      {cards.map((card) => (
                        <Link key={card.id} href={`/phases/${card.id}`}>
                          <div
                            className={cn(
                              'bg-white rounded-lg border-2 p-3 space-y-2 hover:shadow-md transition-all cursor-pointer',
                              col.cardBorder
                            )}
                          >
                            {/* Name */}
                            <div>
                              <p className="text-sm font-semibold leading-tight">{card.name}</p>
                              {card.nameBn && (
                                <p className="text-xs bn text-muted-foreground">{card.nameBn}</p>
                              )}
                            </div>

                            {/* Progress bar */}
                            <div>
                              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                                <span>Progress</span>
                                <span className="font-medium">{card.progress}%</span>
                              </div>
                              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-blue-500"
                                  style={{ width: `${card.progress}%` }}
                                />
                              </div>
                            </div>

                            {/* Collection % */}
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">Collection</span>
                              <span className="font-medium text-green-600">
                                {card.collectionPct < 0 ? 'No Demand' : `${card.collectionPct}%`}
                              </span>
                            </div>

                            {/* Financials */}
                            <div className="space-y-1 text-xs border-t pt-2">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground flex items-center gap-1">
                                  <TrendingDown className="h-3 w-3" /> Expense
                                </span>
                                <span className="font-medium text-red-500">
                                  {formatBDT(card.expense)}
                                </span>
                              </div>
                              <div className="flex justify-between font-semibold">
                                <span>Balance</span>
                                <span className={card.balance >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                                  {formatBDT(card.balance)}
                                </span>
                              </div>
                            </div>

                            {/* Issue indicator */}
                            {card.missingVouchers > 0 && (
                              <div className="flex items-center gap-1 text-xs text-red-500 border-t pt-1.5">
                                <AlertCircle className="h-3 w-3 shrink-0" />
                                {card.missingVouchers} missing voucher
                                {card.missingVouchers > 1 ? 's' : ''}
                              </div>
                            )}
                          </div>
                        </Link>
                      ))}

                      {cards.length === 0 && (
                        <p className="text-xs text-muted-foreground text-center py-6 px-2">
                          No phases here
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <p className="text-xs text-muted-foreground bg-blue-50 border border-blue-200 rounded-md px-3 py-2">
            Board shows operational phases only (DRAFT &amp; ACTIVE). Columns reflect workflow state — they do not modify financial records.
            Use the <Link href={`${base}/phases`} className="text-primary hover:underline">Phase List</Link> for full financial detail.
          </p>
        </>
      )}
    </div>
  );
}

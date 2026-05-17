import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { formatBDT, formatDate, phaseTypeLabel, balanceColor, cn } from '@/lib/utils';
import {
  TrendingUp, TrendingDown, AlertCircle, CheckCircle2,
  Clock, Plus, ArrowRight, Layers,
} from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

/** Map PhaseStatus to a display-friendly column label and colour */
const STATUS_META: Record<string, { label: string; col: string; cardBorder: string; badge: string }> = {
  DRAFT:                 { label: 'Draft',               col: 'bg-gray-50  border-gray-200',   cardBorder: 'border-gray-200',  badge: 'bg-gray-100 text-gray-600' },
  ACTIVE:                { label: 'Active / Running',    col: 'bg-blue-50  border-blue-200',   cardBorder: 'border-blue-300',  badge: 'bg-blue-100 text-blue-700' },
  APPROVED:              { label: 'Approved',            col: 'bg-green-50 border-green-200',  cardBorder: 'border-green-300', badge: 'bg-green-100 text-green-700' },
  INCLUDED_IN_SUMMARY:   { label: 'In Summary',          col: 'bg-teal-50  border-teal-200',   cardBorder: 'border-teal-300',  badge: 'bg-teal-100 text-teal-700' },
  EXCLUDED_FROM_SUMMARY: { label: 'Excluded',            col: 'bg-yellow-50 border-yellow-200', cardBorder: 'border-yellow-300', badge: 'bg-yellow-100 text-yellow-700' },
  CANCELLED:             { label: 'Cancelled',           col: 'bg-red-50   border-red-200',    cardBorder: 'border-red-200',   badge: 'bg-red-100 text-red-600' },
  DUPLICATE:             { label: 'Duplicate',           col: 'bg-orange-50 border-orange-200', cardBorder: 'border-orange-200', badge: 'bg-orange-100 text-orange-700' },
};

const COLUMN_ORDER = [
  'DRAFT',
  'ACTIVE',
  'APPROVED',
  'INCLUDED_IN_SUMMARY',
  'EXCLUDED_FROM_SUMMARY',
  'CANCELLED',
];

export default async function ProjectPhaseBoardPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as any)?.companyId ?? '';

  const project = await prisma.project.findFirst({
    where: { id: params.id, companyId },
    select: { id: true, name: true },
  });
  if (!project) notFound();

  const phases = await prisma.phase.findMany({
    where: { projectId: project.id },
    include: {
      _count: { select: { collections: true, expenses: true, demands: true } },
    },
    orderBy: { sequence: 'asc' },
  });

  // ── Per-phase financial figures ───────────────────────────────
  const phaseFinancials = await Promise.all(
    phases.map(async (ph) => {
      const [inc, exp, payable, pending, missing] = await Promise.all([
        prisma.collection.aggregate({ where: { phaseId: ph.id }, _sum: { amount: true } }),
        prisma.expense.aggregate({ where: { phaseId: ph.id }, _sum: { amount: true } }),
        prisma.supplierPayable.aggregate({ where: { phaseId: ph.id, projectId: project.id }, _sum: { dueAmount: true } }),
        prisma.expense.count({ where: { phaseId: ph.id, status: 'PENDING_APPROVAL' } }),
        prisma.expense.count({ where: { phaseId: ph.id, documents: { none: {} }, status: { in: ['APPROVED', 'PENDING_APPROVAL'] } } }),
      ]);
      return {
        phaseId: ph.id,
        income:  Number(inc._sum.amount    ?? 0),
        expense: Number(exp._sum.amount    ?? 0),
        payable: Number(payable._sum.dueAmount ?? 0),
        pending,
        missing,
      };
    })
  );
  const finMap = Object.fromEntries(phaseFinancials.map(f => [f.phaseId, f]));

  // ── Group phases by status ────────────────────────────────────
  const grouped: Record<string, typeof phases> = {};
  for (const col of COLUMN_ORDER) grouped[col] = [];
  for (const ph of phases) {
    const bucket = grouped[ph.status] ?? grouped['DRAFT'];
    bucket.push(ph);
  }

  const base = `/projects/${project.id}`;

  return (
    <div className="p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">Phase Board</h2>
          <p className="text-xs text-muted-foreground">{project.name} · {phases.length} phases</p>
        </div>
        <Link
          href="/phases/new"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" /> Add Phase
        </Link>
      </div>

      {/* Board: horizontal scroll */}
      <div className="overflow-x-auto pb-3">
        <div className="flex gap-3 min-w-max">
          {COLUMN_ORDER.map(status => {
            const meta = STATUS_META[status];
            const columnPhases = grouped[status] ?? [];
            return (
              <div key={status} className={cn('w-64 rounded-xl border-2 flex flex-col', meta.col)}>
                {/* Column header */}
                <div className="px-3 py-2 border-b border-inherit flex items-center justify-between">
                  <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full', meta.badge)}>{meta.label}</span>
                  <span className="text-xs text-muted-foreground">{columnPhases.length}</span>
                </div>
                {/* Cards */}
                <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[calc(100vh-220px)]">
                  {columnPhases.map(ph => {
                    const fin  = finMap[ph.id] ?? { income: 0, expense: 0, payable: 0, pending: 0, missing: 0 };
                    const bal  = fin.income - fin.expense;
                    return (
                      <Link key={ph.id} href={`/phases/${ph.id}`}>
                        <div className={cn('bg-white rounded-lg border-2 p-3 space-y-2.5 hover:shadow-md transition-all cursor-pointer', meta.cardBorder)}>
                          {/* Name */}
                          <div>
                            <p className="text-sm font-semibold leading-tight">{ph.name}</p>
                            {ph.nameBn && <p className="text-xs bn text-muted-foreground">{ph.nameBn}</p>}
                            <p className="text-xs text-muted-foreground mt-0.5">{phaseTypeLabel(ph.phaseType)}{ph.floorNo != null ? ` · Floor ${ph.floorNo}` : ''}</p>
                          </div>

                          {/* Financials */}
                          <div className="space-y-1 text-xs border-t pt-2">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Collected</span>
                              <span className="font-medium text-green-600">{formatBDT(fin.income)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Expense</span>
                              <span className="font-medium text-red-500">{formatBDT(fin.expense)}</span>
                            </div>
                            {fin.payable > 0 && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Payable</span>
                                <span className="font-medium text-orange-600">{formatBDT(fin.payable)}</span>
                              </div>
                            )}
                            <div className="flex justify-between font-bold border-t pt-1">
                              <span>Balance</span>
                              <span className={balanceColor(bal)}>{formatBDT(bal)}</span>
                            </div>
                          </div>

                          {/* Status indicators */}
                          <div className="flex flex-wrap gap-1.5 text-xs border-t pt-2">
                            <span className="flex items-center gap-0.5 text-muted-foreground">
                              <TrendingUp className="h-3 w-3" /> {ph._count.collections}
                            </span>
                            <span className="flex items-center gap-0.5 text-muted-foreground">
                              <TrendingDown className="h-3 w-3" /> {ph._count.expenses}
                            </span>
                            {fin.pending > 0 && (
                              <span className="flex items-center gap-0.5 text-amber-600">
                                <Clock className="h-3 w-3" /> {fin.pending} pending
                              </span>
                            )}
                            {fin.missing > 0 && (
                              <span className="flex items-center gap-0.5 text-red-500">
                                <AlertCircle className="h-3 w-3" /> {fin.missing} no voucher
                              </span>
                            )}
                          </div>

                          {/* Date range */}
                          {(ph.startDate || ph.endDate) && (
                            <p className="text-xs text-muted-foreground border-t pt-1.5">
                              {ph.startDate ? formatDate(ph.startDate) : '?'}
                              {' – '}
                              {ph.endDate ? formatDate(ph.endDate) : 'ongoing'}
                            </p>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                  {columnPhases.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4 px-2">No phases here</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Note about status change */}
      <p className="text-xs text-muted-foreground bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
        ⚠️ Phase status is changed in the phase detail page. Changing status affects workflow only — it does not lock or modify financial records.
        Only <strong>Audit Locked</strong> (future feature) will prevent edits.
      </p>
    </div>
  );
}

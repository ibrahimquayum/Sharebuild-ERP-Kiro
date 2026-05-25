import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  BarChart3,
  CalendarDays,
  ClipboardList,
  FileText,
  Receipt,
  ShieldCheck,
  ShoppingCart,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getScopedProject } from '@/lib/access-control';
import { getPhaseFinancialSummary } from '@/lib/project-cost-report';
import { prisma } from '@/lib/prisma';
import {
  balanceColor,
  cn,
  expenseCategoryLabel,
  formatBDT,
  formatBDTCompact,
  formatDate,
  phaseStatusMeta,
  phaseTypeLabel,
} from '@/lib/utils';

export const dynamic = 'force-dynamic';

function sourceTypeLabel(value: string) {
  return {
    DIRECT_EXPENSE: 'Direct Expense',
    SUPPLIER_BILL_ITEM: 'Supplier Bill Item',
    SUBCONTRACTOR_PROGRESS_BILL: 'Subcontractor Progress Bill',
    COMPANY_SERVICE_CHARGE: 'Company Service Charge / Supervision Fee',
    ADJUSTMENT: 'Adjustment',
  }[value] ?? value.replaceAll('_', ' ');
}

function statusTone(status: string) {
  const normalized = status.toUpperCase();
  if (['APPROVED', 'PAID', 'FULLY_PAID', 'POSTED', 'SETTLED', 'PREVIEW'].includes(normalized)) {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  }
  if (['PENDING', 'PENDING_APPROVAL', 'DRAFT', 'CALCULATED', 'ISSUED', 'PARTIALLY_PAID'].includes(normalized)) {
    return 'border-amber-200 bg-amber-50 text-amber-700';
  }
  if (['REVERSED', 'CANCELLED', 'REJECTED', 'BOUNCED'].includes(normalized)) {
    return 'border-rose-200 bg-rose-50 text-rose-700';
  }
  return 'border-slate-200 bg-slate-50 text-slate-700';
}

function StatusBadge({ label }: { label: string }) {
  return (
    <span className={cn('inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide', statusTone(label))}>
      {label.replaceAll('_', ' ')}
    </span>
  );
}

function MetricCard({
  label,
  value,
  caption,
  tone = 'default',
}: {
  label: string;
  value: string;
  caption?: string;
  tone?: 'default' | 'positive' | 'negative' | 'warning' | 'info';
}) {
  const toneClass = {
    default: 'border-slate-200 bg-white',
    positive: 'border-emerald-200 bg-emerald-50/70',
    negative: 'border-rose-200 bg-rose-50/70',
    warning: 'border-amber-200 bg-amber-50/70',
    info: 'border-sky-200 bg-sky-50/70',
  }[tone];

  return (
    <div className={cn('rounded-lg border px-4 py-4 shadow-sm', toneClass)}>
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</div>
      <div className="mt-2 text-xl font-semibold tracking-tight text-slate-950">{value}</div>
      {caption ? <div className="mt-1 text-xs leading-5 text-slate-600">{caption}</div> : null}
    </div>
  );
}

export default async function PhaseDetailPage({ params }: { params: { id: string } }) {
  const phaseLookup = await prisma.phase.findUnique({
    where: { id: params.id },
    select: { projectId: true },
  });
  if (!phaseLookup) notFound();

  const { project } = await getScopedProject(phaseLookup.projectId, 'phases', 'view');
  const summary = await getPhaseFinancialSummary(project.id, params.id);
  if (!summary) notFound();

  const phase = summary.phase;
  const meta = phaseStatusMeta(phase.status);
  const base = `/projects/${project.id}`;
  const collectionsByBuyer = summary.buyerCollections.reduce<Record<string, number>>((map, row) => {
    map[row.buyerName] = (map[row.buyerName] ?? 0) + row.amount;
    return map;
  }, {});
  const collectionSummaryRows = [
    { label: 'Issued Demand', value: summary.issuedDemand, tone: summary.issuedDemand > 0 ? 'text-sky-700' : 'text-amber-700' },
    { label: 'Allocated Collection', value: summary.allocatedCollection, tone: 'text-emerald-700' },
    { label: 'Buyer Due', value: summary.buyerDue, tone: summary.buyerDue > 0 ? 'text-rose-700' : 'text-slate-700' },
    { label: 'Advance / Unallocated', value: summary.buyerAdvance, tone: summary.buyerAdvance > 0 ? 'text-amber-700' : 'text-slate-700' },
  ];
  const costSummaryRows = [
    { label: 'Direct Expense', value: summary.directExpenseTotal },
    { label: 'Supplier Bill Items', value: summary.supplierBillItemTotal },
    { label: 'Subcontractor Bills', value: summary.subcontractorBillTotal },
    { label: 'Adjustments', value: summary.adjustmentTotal },
  ];

  return (
    <div className="space-y-6 px-5 py-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href={`${base}/phases`} className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-950">
          <ArrowLeft className="h-4 w-4" />
          Back to project phases
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`${base}/demands/batches/new?phaseId=${phase.id}`} className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:bg-slate-50">
            <FileText className="h-4 w-4" />
            Issue Bill
          </Link>
          <Link href={`${base}/collections/new?phaseId=${phase.id}`} className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:bg-slate-50">
            <Receipt className="h-4 w-4" />
            Record Collection
          </Link>
          <Link href={`${base}/expenses/new?phaseId=${phase.id}`} className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800">
            <ShoppingCart className="h-4 w-4" />
            Add Cost
          </Link>
        </div>
      </div>

      <Card className="overflow-hidden border-slate-200">
        <CardContent className="p-0">
          <div className="border-b bg-slate-50 px-6 py-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl font-semibold tracking-tight text-slate-950">{phase.name}</h1>
                  {phase.nameBn ? <span className="bn text-sm text-slate-600">{phase.nameBn}</span> : null}
                  <span className={cn('rounded-full px-2.5 py-1 text-xs font-semibold', meta.color)}>{meta.label}</span>
                </div>
                <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-600">
                  <span>Project: <strong className="text-slate-900">{project.name}</strong></span>
                  <span>Type: <strong className="text-slate-900">{phaseTypeLabel(phase.phaseType)}</strong></span>
                  {phase.floorNo != null ? <span>Floor: <strong className="text-slate-900">{phase.floorNo}</strong></span> : null}
                  <span>Service charge: <strong className="text-slate-900">{summary.serviceChargePercentage.toFixed(2)}%</strong></span>
                </div>
                {phase.workDesc ? <p className="max-w-4xl text-sm leading-6 text-slate-600">{phase.workDesc}</p> : null}
                {(phase.startDate || phase.endDate) ? (
                  <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {phase.startDate ? formatDate(phase.startDate) : 'Start not set'} to {phase.endDate ? formatDate(phase.endDate) : 'End not set'}
                  </div>
                ) : null}
              </div>
              <Link href={`${base}/reports/complete-project?phase=${phase.id}`} className="inline-flex items-center gap-2 rounded-md border bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50">
                <BarChart3 className="h-4 w-4" />
                Report Slice
              </Link>
            </div>
          </div>

          <div className="grid gap-3 p-5 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Total Collection" value={formatBDTCompact(summary.totalCollection)} caption={formatBDT(summary.totalCollection)} tone="positive" />
            <MetricCard label="Total Phase Cost" value={formatBDTCompact(summary.totalBillablePhaseCost)} caption="Construction cost + service charge" tone="negative" />
            <MetricCard label="Phase Balance" value={formatBDTCompact(summary.phaseBalance)} caption={summary.phaseBalance >= 0 ? 'Surplus after billable cost' : 'Deficit after billable cost'} tone={summary.phaseBalance >= 0 ? 'positive' : 'negative'} />
            <MetricCard label="Payments Received" value={String(summary.buyerCollections.length)} caption={`${Object.keys(collectionsByBuyer).length} buyer account(s)`} tone="default" />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Receipt className="h-4 w-4 text-emerald-600" />
              Income / Collections
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-slate-200 bg-slate-50">
              <div className="grid divide-y divide-slate-200 text-sm md:grid-cols-2 md:divide-x md:divide-y-0">
                {collectionSummaryRows.map((row) => (
                  <div key={row.label} className="flex items-center justify-between gap-3 px-4 py-3">
                    <span className="text-slate-600">{row.label}</span>
                    <span className={cn('font-semibold tabular-nums', row.tone)}>{formatBDT(row.value)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-2 text-left">Buyer</th>
                    <th className="px-3 py-2 text-left">Method / Account</th>
                    <th className="px-3 py-2 text-right">Amount</th>
                    <th className="px-3 py-2 text-right">Unallocated</th>
                    <th className="px-3 py-2 text-right">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.buyerCollections.length === 0 ? (
                    <tr>
                      <td className="px-3 py-8 text-center text-sm text-slate-500" colSpan={5}>No collections recorded for this phase.</td>
                    </tr>
                  ) : (
                    summary.buyerCollections.map((row) => (
                      <tr key={row.id} className="border-t">
                        <td className="px-3 py-2 font-medium text-slate-900">
                          {row.buyerName}
                          {row.buyerNameBn ? <div className="bn text-xs text-slate-500">{row.buyerNameBn}</div> : null}
                        </td>
                        <td className="px-3 py-2 text-slate-600">
                          {row.paymentMethod}
                          {row.accountName ? <div className="text-xs text-slate-500">{row.accountName}</div> : null}
                        </td>
                        <td className="px-3 py-2 text-right font-medium text-emerald-700">{formatBDT(row.amount)}</td>
                        <td className="px-3 py-2 text-right text-amber-700">{formatBDT(row.unallocatedAmount)}</td>
                        <td className="px-3 py-2 text-right text-slate-600">{formatDate(row.receivedDate)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot className="bg-slate-50">
                  <tr className="border-t">
                    <td className="px-3 py-3 font-semibold text-slate-900" colSpan={2}>Total Collection</td>
                    <td className="px-3 py-3 text-right font-semibold text-emerald-700">{formatBDT(summary.totalCollection)}</td>
                    <td className="px-3 py-3 text-right text-amber-700">{formatBDT(summary.buyerAdvance)}</td>
                    <td className="px-3 py-3 text-right text-slate-500">Buyer advance / unallocated</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardList className="h-4 w-4 text-rose-600" />
              Expenses / Project Cost
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-2 text-left">Cost source</th>
                    <th className="px-3 py-2 text-left">Meaning</th>
                    <th className="px-3 py-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {costSummaryRows.map((row) => (
                    <tr key={row.label} className="border-t">
                      <td className="px-3 py-2 font-medium text-slate-900">{row.label}</td>
                      <td className="px-3 py-2 text-slate-600">
                        {row.label === 'Supplier Bill Items'
                          ? 'Line items from supplier bills, included inside daily project cost details.'
                          : row.label === 'Subcontractor Bills'
                            ? 'Approved progress-bill cost rows.'
                            : row.label === 'Adjustments'
                              ? 'Cost-affecting adjustments only. Payments stay in ledger/treasury reports.'
                              : 'Direct site/project expense rows.'}
                      </td>
                      <td className="px-3 py-2 text-right font-medium tabular-nums text-slate-900">{formatBDT(row.value)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50">
                  <tr className="border-t">
                    <td className="px-3 py-2 font-medium text-slate-700" colSpan={2}>Subtotal Construction Cost</td>
                    <td className="px-3 py-2 text-right font-semibold text-slate-950">{formatBDT(summary.actualConstructionCost)}</td>
                  </tr>
                  <tr className="border-t">
                    <td className="px-3 py-2 font-medium text-slate-700" colSpan={2}>Company Service Charge / Supervision Fee ({summary.serviceChargePercentage.toFixed(2)}%)</td>
                    <td className="px-3 py-2 text-right font-semibold text-sky-700">{formatBDT(summary.serviceChargeAmount)}</td>
                  </tr>
                  <tr className="border-t">
                    <td className="px-3 py-2 font-semibold text-slate-900" colSpan={2}>Total Phase Cost</td>
                    <td className="px-3 py-2 text-right font-semibold text-rose-700">{formatBDT(summary.totalBillablePhaseCost)}</td>
                  </tr>
                  <tr className="border-t">
                    <td className="px-3 py-2 font-semibold text-slate-900" colSpan={2}>Phase Balance</td>
                    <td className={cn('px-3 py-2 text-right font-semibold', balanceColor(summary.phaseBalance))}>{formatBDT(summary.phaseBalance)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-base">Category Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          {summary.categoryBreakdown.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-slate-500">No cost rows found for this phase.</div>
          ) : (
            <div className="space-y-3">
              {summary.categoryBreakdown.map((row) => (
                <div key={row.category} className="grid gap-3 rounded-lg border border-slate-200 px-4 py-3 md:grid-cols-[220px_1fr_140px_70px] md:items-center">
                  <div>
                    <div className="font-medium text-slate-900">{expenseCategoryLabel(row.category)}</div>
                    <div className="text-xs text-slate-500">{row.rowCount} row{row.rowCount === 1 ? '' : 's'}</div>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-slate-700" style={{ width: `${Math.min(100, row.percentage)}%` }} />
                  </div>
                  <div className="text-right font-medium tabular-nums text-slate-950">{formatBDT(row.amount)}</div>
                  <div className="text-right text-sm text-slate-500">{row.percentage.toFixed(1)}%</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-base">Daily Project Cost Details</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2 text-left">Date</th>
                  <th className="px-3 py-2 text-left">Source</th>
                  <th className="px-3 py-2 text-left">Bill / Voucher</th>
                  <th className="px-3 py-2 text-left">Party</th>
                  <th className="px-3 py-2 text-left">Description</th>
                  <th className="px-3 py-2 text-right">Qty</th>
                  <th className="px-3 py-2 text-right">Rate</th>
                  <th className="px-3 py-2 text-right">Amount</th>
                  <th className="px-3 py-2 text-left">Voucher</th>
                  <th className="px-3 py-2 text-left">Approval</th>
                </tr>
              </thead>
              <tbody>
                {summary.dailyProjectCostRows.length === 0 ? (
                  <tr>
                    <td className="px-3 py-8 text-center text-sm text-slate-500" colSpan={10}>No cost rows found for this phase.</td>
                  </tr>
                ) : (
                  summary.dailyProjectCostRows.map((row) => (
                    <tr key={row.id} className="border-t align-top">
                      <td className="px-3 py-2 text-slate-600">{formatDate(row.date)}</td>
                      <td className="px-3 py-2"><StatusBadge label={sourceTypeLabel(row.sourceType)} /></td>
                      <td className="px-3 py-2 font-mono text-xs text-slate-600">{row.sourceNo}</td>
                      <td className="px-3 py-2 text-slate-700">{row.partyName}</td>
                      <td className="px-3 py-2">
                        <div className="font-medium text-slate-900">{row.description}</div>
                        <div className="text-xs text-slate-500">{expenseCategoryLabel(row.category)}</div>
                      </td>
                      <td className="px-3 py-2 text-right text-slate-600">{row.quantity != null ? `${row.quantity} ${row.unit ?? ''}` : '-'}</td>
                      <td className="px-3 py-2 text-right text-slate-600">{row.rate != null ? formatBDT(row.rate) : '-'}</td>
                      <td className="px-3 py-2 text-right font-semibold tabular-nums text-slate-950">{formatBDT(row.amount)}</td>
                      <td className="px-3 py-2"><StatusBadge label={row.voucherStatus} /></td>
                      <td className="px-3 py-2"><StatusBadge label={row.approvalStatus} /></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4 text-slate-700" />
            Audit and Voucher Notes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3">
            <MetricCard label="Missing Vouchers" value={String(summary.missingVoucherCount)} tone={summary.missingVoucherCount ? 'warning' : 'default'} />
            <MetricCard label="Pending Approvals" value={String(summary.pendingApprovalCount)} tone={summary.pendingApprovalCount ? 'warning' : 'default'} />
            <MetricCard label="Reversed Rows Included" value={String(summary.reversedCount)} tone={summary.reversedCount ? 'warning' : 'default'} />
          </div>
          <div className="mt-4 rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm leading-6 text-sky-800">
            Supplier bill items are intentionally included inside Daily Project Cost Details. Supplier Ledger remains the separate payable/payment report for party-wise accounting.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

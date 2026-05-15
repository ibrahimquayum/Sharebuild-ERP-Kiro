import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/shared/stat-card';
import { formatBDT, formatBDTCompact, formatDate, phaseStatusMeta, phaseTypeLabel, expenseCategoryLabel, balanceColor, cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Users, ShoppingCart, CalendarDays, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function PhaseDetailPage({ params }: { params: { id: string } }) {
  const phase = await prisma.phase.findUnique({
    where: { id: params.id },
    include: {
      project: { select: { id: true, name: true } },
      collections: {
        include: { buyer: { select: { id: true, name: true, nameBn: true } } },
        orderBy: { receivedDate: 'desc' },
      },
      expenses: {
        include: { createdBy: { select: { name: true } } },
        orderBy: { expenseDate: 'desc' },
      },
    },
  });

  if (!phase) notFound();

  const totalIncome = phase.collections.reduce((s, c) => s + Number(c.amount), 0);
  const totalExpense = phase.expenses.reduce((s, e) => s + Number(e.amount), 0);
  const balance = totalIncome - totalExpense;
  const meta = phaseStatusMeta(phase.status);

  // Group expenses by category
  const expenseByCategory = phase.expenses.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] ?? 0) + Number(e.amount);
    return acc;
  }, {});

  const paymentMethodColors: Record<string, string> = {
    CASH: 'bg-green-100 text-green-700',
    CHEQUE: 'bg-blue-100 text-blue-700',
    BANK_TRANSFER: 'bg-violet-100 text-violet-700',
    MOBILE_BANKING: 'bg-pink-100 text-pink-700',
    OTHER: 'bg-gray-100 text-gray-600',
  };

  return (
    <div className="flex flex-col min-h-full">
      <Header title={phase.name} />

      <div className="p-6 space-y-6">
        {/* Back */}
        <Link href="/phases" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to Phases
        </Link>

        {/* Phase Header Card */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold">{phase.name}</h2>
                  {phase.nameBn && <span className="bn text-base text-muted-foreground">({phase.nameBn})</span>}
                  <span className={cn('text-xs px-2.5 py-1 rounded-full font-semibold', meta.color)}>{meta.label}</span>
                </div>
                <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
                  <span>Type: <strong>{phaseTypeLabel(phase.phaseType)}</strong></span>
                  {phase.floorNo != null && <span>Floor: <strong>{phase.floorNo}</strong></span>}
                  <Link href={`/projects/${phase.project.id}`} className="hover:text-primary hover:underline">
                    Project: <strong>{phase.project.name}</strong>
                  </Link>
                </div>
                {phase.workDesc && <p className="mt-2 text-sm text-muted-foreground">{phase.workDesc}</p>}
                {(phase.startDate || phase.endDate) && (
                  <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {phase.startDate && <span>{formatDate(phase.startDate)}</span>}
                    {phase.endDate && <span>→ {formatDate(phase.endDate)}</span>}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Financial KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Collection" value={formatBDTCompact(totalIncome)} subtitle={formatBDT(totalIncome)} icon={TrendingUp} iconColor="text-green-600" iconBg="bg-green-50" />
          <StatCard title="Total Expense" value={formatBDTCompact(totalExpense)} subtitle={formatBDT(totalExpense)} icon={TrendingDown} iconColor="text-red-500" iconBg="bg-red-50" />
          <StatCard
            title="Phase Balance"
            value={formatBDTCompact(balance)}
            subtitle={balance >= 0 ? 'Surplus' : 'Deficit'}
            icon={balance >= 0 ? TrendingUp : TrendingDown}
            iconColor={balance >= 0 ? 'text-emerald-600' : 'text-red-600'}
            iconBg={balance >= 0 ? 'bg-emerald-50' : 'bg-red-50'}
          />
          <StatCard title="Payments Received" value={String(phase.collections.length)} subtitle={`from ${new Set(phase.collections.map(c => c.buyerId)).size} buyers`} icon={Users} iconColor="text-blue-600" iconBg="bg-blue-50" />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* LEFT: Income Side */}
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                Income (Collections)
              </CardTitle>
              <span className="text-sm font-bold text-green-600">{formatBDT(totalIncome)}</span>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">#</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Buyer</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Amount</th>
                      <th className="px-4 py-2 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">Method</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {phase.collections.length === 0 ? (
                      <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground text-xs">No collections yet</td></tr>
                    ) : (
                      phase.collections.map((c, i) => (
                        <tr key={c.id} className="border-b last:border-0 hover:bg-muted/30">
                          <td className="px-4 py-2.5 text-xs text-muted-foreground">{i + 1}</td>
                          <td className="px-4 py-2.5">
                            <Link href={`/buyers/${c.buyer.id}`} className="font-medium text-sm hover:text-primary hover:underline">{c.buyer.name}</Link>
                            {c.buyer.nameBn && <div className="bn text-xs text-muted-foreground">{c.buyer.nameBn}</div>}
                          </td>
                          <td className="px-4 py-2.5 text-right font-bold text-green-600">{formatBDT(Number(c.amount))}</td>
                          <td className="px-4 py-2.5 text-center">
                            <span className={cn('text-xs px-1.5 py-0.5 rounded-full', paymentMethodColors[c.paymentMethod] ?? 'bg-gray-100 text-gray-600')}>
                              {c.paymentMethod.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right text-xs text-muted-foreground">{formatDate(c.receivedDate)}</td>
                        </tr>
                      ))
                    )}
                    <tr className="border-t-2 bg-green-50/50 font-bold">
                      <td className="px-4 py-2.5" colSpan={2}>Total Income</td>
                      <td className="px-4 py-2.5 text-right text-green-600">{formatBDT(totalIncome)}</td>
                      <td colSpan={2} />
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* RIGHT: Expense Side */}
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-red-500" />
                Expenses
              </CardTitle>
              <span className="text-sm font-bold text-red-500">{formatBDT(totalExpense)}</span>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">#</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Description</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Qty</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Amount</th>
                      <th className="px-4 py-2 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {phase.expenses.length === 0 ? (
                      <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground text-xs">No expenses recorded</td></tr>
                    ) : (
                      phase.expenses.map((e, i) => (
                        <tr key={e.id} className="border-b last:border-0 hover:bg-muted/30">
                          <td className="px-4 py-2.5 text-xs text-muted-foreground">{i + 1}</td>
                          <td className="px-4 py-2.5">
                            <div className="font-medium text-sm">{e.description}</div>
                            {e.descriptionBn && <div className="bn text-xs text-muted-foreground">{e.descriptionBn}</div>}
                            <div className="text-xs text-muted-foreground">{expenseCategoryLabel(e.category)}</div>
                          </td>
                          <td className="px-4 py-2.5 text-right text-xs text-muted-foreground">
                            {e.quantity != null ? `${e.quantity} ${e.unit ?? ''}` : '—'}
                          </td>
                          <td className="px-4 py-2.5 text-right font-bold text-red-500">{formatBDT(Number(e.amount))}</td>
                          <td className="px-4 py-2.5 text-center">
                            <span className={cn(
                              'text-xs px-1.5 py-0.5 rounded-full font-medium',
                              e.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                              e.status === 'PENDING_APPROVAL' ? 'bg-yellow-100 text-yellow-700' :
                              e.status === 'PAID' ? 'bg-blue-100 text-blue-700' :
                              'bg-gray-100 text-gray-600'
                            )}>
                              {e.status.replace('_', ' ')}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                    <tr className="border-t-2 bg-red-50/50 font-bold">
                      <td className="px-4 py-2.5" colSpan={3}>Total Expense</td>
                      <td className="px-4 py-2.5 text-right text-red-500">{formatBDT(totalExpense)}</td>
                      <td />
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Phase Balance Summary */}
        <Card>
          <CardContent className="p-5">
            <div className="grid grid-cols-3 gap-6 text-center">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Income</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{formatBDT(totalIncome)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Expense</p>
                <p className="text-2xl font-bold text-red-500 mt-1">{formatBDT(totalExpense)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Phase Balance</p>
                <p className={cn('text-2xl font-bold mt-1', balanceColor(balance))}>{formatBDT(balance)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{balance >= 0 ? '✅ Surplus' : '⚠️ Deficit'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Expense Category Breakdown */}
        {Object.keys(expenseByCategory).length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Expense Breakdown by Category</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {Object.entries(expenseByCategory)
                  .sort(([, a], [, b]) => b - a)
                  .map(([cat, amount]) => (
                    <div key={cat} className="flex items-center justify-between px-4 py-2.5">
                      <span className="text-sm">{expenseCategoryLabel(cat)}</span>
                      <div className="flex items-center gap-4">
                        <div className="w-32 bg-muted rounded-full h-1.5">
                          <div
                            className="bg-red-400 h-1.5 rounded-full"
                            style={{ width: `${Math.min(100, (amount / totalExpense) * 100)}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-right w-28">{formatBDT(amount)}</span>
                        <span className="text-xs text-muted-foreground w-10 text-right">
                          {totalExpense > 0 ? Math.round((amount / totalExpense) * 100) : 0}%
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

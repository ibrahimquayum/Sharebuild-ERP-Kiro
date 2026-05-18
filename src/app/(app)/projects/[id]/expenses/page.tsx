import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { formatBDT, formatBDTCompact, formatDate, expenseCategoryLabel, cn } from '@/lib/utils';
import { ShoppingCart, TrendingDown, Clock, CheckCircle2, Plus, Rows3 } from 'lucide-react';
import Link from 'next/link';
import { StatCard } from '@/components/shared/stat-card';
import { Card, CardContent } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

const STATUS_META: Record<string, { label: string; color: string }> = {
  PENDING_APPROVAL: { label: 'Pending',   color: 'bg-yellow-100 text-yellow-700' },
  APPROVED:         { label: 'Approved',  color: 'bg-green-100 text-green-700'  },
  PAID:             { label: 'Paid',      color: 'bg-blue-100 text-blue-700'    },
  PARTIALLY_PAID:   { label: 'Part Paid', color: 'bg-orange-100 text-orange-700' },
  DISPUTED:         { label: 'Disputed',  color: 'bg-red-100 text-red-600'      },
  CANCELLED:        { label: 'Cancelled', color: 'bg-gray-100 text-gray-500'    },
};

export default async function ProjectExpensesPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as any)?.companyId ?? '';

  const project = await prisma.project.findFirst({
    where: { id: params.id, companyId },
    select: { id: true, name: true },
  });
  if (!project) notFound();

  const [expenses, agg, pending] = await Promise.all([
    prisma.expense.findMany({
      where: { phase: { projectId: project.id } },
      include: {
        phase:     { select: { id: true, name: true } },
        supplier:  { select: { id: true, name: true } },
        createdBy: { select: { name: true } },
        _count: { select: { documents: true } },
      },
      orderBy: { expenseDate: 'desc' },
      take: 200,
    }),
    prisma.expense.aggregate({
      where: { phase: { projectId: project.id } },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.expense.count({
      where: { phase: { projectId: project.id }, status: 'PENDING_APPROVAL' },
    }),
  ]);

  const total = Number(agg._sum.amount ?? 0);

  return (
    <div className="p-5 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">Expenses — Money Spent</h2>
          <p className="text-xs text-muted-foreground">{project.name} · all site costs</p>
        </div>
        <div className="flex items-center gap-2">
          {pending > 0 && (
            <Link
              href="/expenses/approvals"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-100 text-amber-700 border border-amber-300 text-xs font-medium hover:bg-amber-200 transition-colors"
            >
              <Clock className="h-3.5 w-3.5" /> {pending} pending
            </Link>
          )}
          <Link
            href={`/projects/${project.id}/expenses/bulk`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-medium hover:bg-muted transition-colors"
          >
            <Rows3 className="h-3.5 w-3.5" /> Bulk Entry
          </Link>
          <Link
            href={`/projects/${project.id}/expenses/new`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-red-600 text-white text-xs font-medium hover:bg-red-700 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" /> Add Expense
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard title="Total Expense"   value={formatBDTCompact(total)}     subtitle={formatBDT(total)}        icon={TrendingDown}  iconColor="text-red-500"    iconBg="bg-red-50" />
        <StatCard title="Entries"         value={String(agg._count)}           subtitle="Expense records"         icon={ShoppingCart}  iconColor="text-blue-600"  iconBg="bg-blue-50" />
        <StatCard title="Pending"         value={String(pending)}              subtitle="Awaiting approval"       icon={Clock}         iconColor="text-amber-500" iconBg="bg-amber-50" />
        <StatCard title="Approved"        value={String(agg._count - pending)} subtitle="Verified"                icon={CheckCircle2}  iconColor="text-green-600" iconBg="bg-green-50" />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">#</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Date</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Description</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Phase</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Category</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Amount</th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">Docs</th>
                </tr>
              </thead>
              <tbody>
                {expenses.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                      No expenses yet.{' '}
                      <Link href={`/projects/${project.id}/expenses/new`} className="text-primary hover:underline">Add an expense</Link>
                    </td>
                  </tr>
                ) : (
                  expenses.map((e, i) => {
                    const sm = STATUS_META[e.status] ?? { label: e.status, color: 'bg-gray-100 text-gray-600' };
                    return (
                      <tr key={e.id} className={cn('border-b last:border-0 hover:bg-muted/30 transition-colors', e.status === 'PENDING_APPROVAL' && 'bg-yellow-50/30')}>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{i + 1}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{formatDate(e.expenseDate)}</td>
                        <td className="px-4 py-3">
                          <div className="font-medium">{e.description}</div>
                          {e.billNo && <div className="text-xs font-mono text-muted-foreground">Bill# {e.billNo}</div>}
                          {e.supplier && <div className="text-xs text-muted-foreground">{e.supplier.name}</div>}
                          {e.localShopName && <div className="text-xs text-muted-foreground">Local shop: {e.localShopName}{e.localShopPhone ? ` · ${e.localShopPhone}` : ''}</div>}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          <Link href={`/phases/${e.phase.id}`} className="hover:text-primary hover:underline text-muted-foreground">{e.phase.name}</Link>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{expenseCategoryLabel(e.category)}</td>
                        <td className="px-4 py-3 text-right font-bold text-red-500">{formatBDT(Number(e.amount))}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', sm.color)}>{sm.label}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Link href={`/expenses/${e.id}/upload`} className={cn('text-xs hover:text-primary', e._count.documents === 0 ? 'text-amber-600 font-medium' : 'text-muted-foreground')} title="Upload voucher">
                            {e._count.documents === 0 ? 'Missing' : `${e._count.documents} file${e._count.documents === 1 ? '' : 's'}`}
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              {expenses.length > 0 && (
                <tfoot>
                  <tr className="bg-muted/60 font-bold border-t-2">
                    <td colSpan={5} className="px-4 py-3">Total</td>
                    <td className="px-4 py-3 text-right text-red-500">{formatBDT(total)}</td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

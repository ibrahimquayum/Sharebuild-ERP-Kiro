import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Header } from '@/components/layout/header';
import { PageHeader } from '@/components/shared/page-header';
import { StatCard } from '@/components/shared/stat-card';
import { Card, CardContent } from '@/components/ui/card';
import { formatBDT, formatBDTCompact, formatDate, cn } from '@/lib/utils';
import { Receipt, TrendingDown, AlertCircle, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function SupplierPayablesPage() {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as any)?.companyId ?? '';

  const payables = await prisma.supplierPayable.findMany({
    where: { supplier: { companyId } },
    include: {
      supplier: { select: { id: true, name: true, supplierType: true } },
      payments: { select: { amount: true, paidAt: true, paymentMethod: true } },
    },
    orderBy: { billDate: 'desc' },
  });

  const totalBilled = payables.reduce((s, p) => s + Number(p.totalAmount), 0);
  const totalPaid = payables.reduce((s, p) => s + Number(p.paidAmount), 0);
  const totalDue = totalBilled - totalPaid;
  const overdueCount = payables.filter(p => p.status === 'UNPAID' && p.dueDate && new Date(p.dueDate) < new Date()).length;

  const statusMeta: Record<string, { label: string; color: string }> = {
    UNPAID: { label: 'Unpaid', color: 'bg-red-100 text-red-600' },
    PARTIALLY_PAID: { label: 'Part Paid', color: 'bg-orange-100 text-orange-600' },
    PAID: { label: 'Paid', color: 'bg-green-100 text-green-700' },
    DISPUTED: { label: 'Disputed', color: 'bg-yellow-100 text-yellow-700' },
    WRITTEN_OFF: { label: 'Written Off', color: 'bg-gray-100 text-gray-600' },
  };

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Supplier Payables" />
      <PageHeader
        title="Supplier Payables"
        subtitle="Outstanding bills and payment tracker"
        action={{ label: 'Record Bill', href: '/suppliers/payables/new' }}
      />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Billed" value={formatBDTCompact(totalBilled)} subtitle={formatBDT(totalBilled)} icon={Receipt} iconColor="text-blue-600" iconBg="bg-blue-50" />
          <StatCard title="Total Paid" value={formatBDTCompact(totalPaid)} subtitle={formatBDT(totalPaid)} icon={CheckCircle2} iconColor="text-green-600" iconBg="bg-green-50" />
          <StatCard title="Total Due" value={formatBDTCompact(totalDue)} subtitle={formatBDT(totalDue)} icon={TrendingDown} iconColor="text-red-500" iconBg="bg-red-50" />
          <StatCard title="Overdue Bills" value={String(overdueCount)} subtitle="Past due date" icon={AlertCircle} iconColor="text-orange-500" iconBg="bg-orange-50" />
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">#</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Supplier</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Bill No</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Bill Date</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Due Date</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Total</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Paid</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Due</th>
                    <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                    <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {payables.length === 0 ? (
                    <tr><td colSpan={10} className="px-4 py-12 text-center text-muted-foreground">No payables recorded.</td></tr>
                  ) : (
                    payables.map((p, i) => {
                      const due = Number(p.dueAmount);
                      const isOverdue = p.status === 'UNPAID' && p.dueDate && new Date(p.dueDate) < new Date();
                      const sm = statusMeta[p.status] ?? { label: p.status, color: 'bg-gray-100 text-gray-600' };
                      return (
                        <tr key={p.id} className={cn('border-b last:border-0 hover:bg-muted/30 transition-colors', isOverdue && 'bg-red-50/40')}>
                          <td className="px-4 py-3 text-xs text-muted-foreground">{i + 1}</td>
                          <td className="px-4 py-3">
                            <Link href={`/suppliers/${p.supplier.id}`} className="font-medium hover:text-primary hover:underline">{p.supplier.name}</Link>
                            <div className="text-xs text-muted-foreground">{p.supplier.supplierType.replace('_', ' ')}</div>
                          </td>
                          <td className="px-4 py-3 text-xs font-mono text-muted-foreground">{p.billNo ?? '—'}</td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(p.billDate)}</td>
                          <td className={cn('px-4 py-3 text-xs', isOverdue ? 'text-red-600 font-semibold' : 'text-muted-foreground')}>
                            {p.dueDate ? formatDate(p.dueDate) : '—'}
                            {isOverdue && ' ⚠️'}
                          </td>
                          <td className="px-4 py-3 text-right font-medium">{formatBDT(Number(p.totalAmount))}</td>
                          <td className="px-4 py-3 text-right text-green-600 font-medium">{formatBDT(Number(p.paidAmount))}</td>
                          <td className={cn('px-4 py-3 text-right font-bold', due > 0 ? 'text-red-600' : 'text-green-600')}>
                            {due > 0 ? formatBDT(due) : '✅'}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', sm.color)}>{sm.label}</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {p.status !== 'PAID' && (
                              <Link
                                href={`/suppliers/payables/${p.id}/pay`}
                                className="text-xs bg-primary text-primary-foreground px-3 py-1 rounded-md hover:bg-primary/90 transition-colors"
                              >
                                Pay Now
                              </Link>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                {payables.length > 0 && (
                  <tfoot>
                    <tr className="bg-muted/60 font-bold border-t-2">
                      <td colSpan={5} className="px-4 py-3">Total</td>
                      <td className="px-4 py-3 text-right">{formatBDT(totalBilled)}</td>
                      <td className="px-4 py-3 text-right text-green-600">{formatBDT(totalPaid)}</td>
                      <td className="px-4 py-3 text-right text-red-600">{formatBDT(totalDue)}</td>
                      <td colSpan={2} />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

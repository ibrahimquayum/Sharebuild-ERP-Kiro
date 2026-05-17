import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { formatBDT, formatBDTCompact, formatDate, cn } from '@/lib/utils';
import { Receipt, TrendingDown, AlertCircle, CheckCircle2, Plus } from 'lucide-react';
import Link from 'next/link';
import { StatCard } from '@/components/shared/stat-card';
import { Card, CardContent } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

const STATUS_META: Record<string, { label: string; color: string }> = {
  UNPAID:         { label: 'Unpaid',      color: 'bg-red-100 text-red-600' },
  PARTIALLY_PAID: { label: 'Part Paid',   color: 'bg-orange-100 text-orange-600' },
  PAID:           { label: 'Paid',        color: 'bg-green-100 text-green-700' },
  DISPUTED:       { label: 'Disputed',    color: 'bg-yellow-100 text-yellow-700' },
  WRITTEN_OFF:    { label: 'Written Off', color: 'bg-gray-100 text-gray-600' },
};

export default async function ProjectPayablesPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as any)?.companyId ?? '';

  const project = await prisma.project.findFirst({
    where: { id: params.id, companyId },
    select: { id: true, name: true },
  });
  if (!project) notFound();

  const payables = await prisma.supplierPayable.findMany({
    where: { projectId: project.id },
    include: {
      supplier: { select: { id: true, name: true, supplierType: true } },
      phase:    { select: { id: true, name: true } },
    },
    orderBy: { billDate: 'desc' },
  });

  const totalBilled = payables.reduce((s, p) => s + Number(p.totalAmount), 0);
  const totalPaid   = payables.reduce((s, p) => s + Number(p.paidAmount), 0);
  const totalDue    = totalBilled - totalPaid;
  const overdueCount = payables.filter(p => p.status === 'UNPAID' && p.dueDate && new Date(p.dueDate) < new Date()).length;

  return (
    <div className="p-5 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">Supplier Payables</h2>
          <p className="text-xs text-muted-foreground">{project.name} · outstanding bills</p>
        </div>
        <Link
          href={`/projects/${project.id}/payables/new`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-orange-600 text-white text-xs font-medium hover:bg-orange-700 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" /> Record Bill
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard title="Total Billed"  value={formatBDTCompact(totalBilled)} subtitle={formatBDT(totalBilled)} icon={Receipt}      iconColor="text-blue-600"   iconBg="bg-blue-50" />
        <StatCard title="Total Paid"    value={formatBDTCompact(totalPaid)}   subtitle={formatBDT(totalPaid)}   icon={CheckCircle2} iconColor="text-green-600"  iconBg="bg-green-50" />
        <StatCard title="Outstanding"   value={formatBDTCompact(totalDue)}    subtitle={formatBDT(totalDue)}    icon={TrendingDown} iconColor="text-red-500"    iconBg="bg-red-50" />
        <StatCard title="Overdue"       value={String(overdueCount)}          subtitle="Past due date"          icon={AlertCircle}  iconColor="text-orange-500" iconBg="bg-orange-50" />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">#</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Supplier</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Phase</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Bill No</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Bill Date</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Total</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Paid</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Due</th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">Action</th>
                </tr>
              </thead>
              <tbody>
                {payables.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-12 text-center text-muted-foreground">
                      No supplier bills for this project.{' '}
                      <Link href={`/projects/${project.id}/payables/new`} className="text-primary hover:underline">Add a bill</Link>
                    </td>
                  </tr>
                ) : (
                  payables.map((p, i) => {
                    const due = Number(p.dueAmount);
                    const isOverdue = p.status === 'UNPAID' && p.dueDate && new Date(p.dueDate) < new Date();
                    const sm = STATUS_META[p.status] ?? { label: p.status, color: 'bg-gray-100 text-gray-600' };
                    return (
                      <tr key={p.id} className={cn('border-b last:border-0 hover:bg-muted/30 transition-colors', isOverdue && 'bg-red-50/40')}>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{i + 1}</td>
                        <td className="px-4 py-3">
                          <Link href={`/suppliers/${p.supplier.id}`} className="font-medium hover:text-primary hover:underline">{p.supplier.name}</Link>
                          <div className="text-xs text-muted-foreground">{p.supplier.supplierType.replace('_', ' ')}</div>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {p.phase ? (
                            <Link href={`/phases/${p.phase.id}`} className="hover:text-primary hover:underline">{p.phase.name}</Link>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-3 text-xs font-mono text-muted-foreground">{p.billNo ?? '—'}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(p.billDate)}</td>
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
                            <Link href={`/suppliers/payables/${p.id}/pay`}
                              className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded hover:bg-primary/90 transition-colors">
                              Pay
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
  );
}

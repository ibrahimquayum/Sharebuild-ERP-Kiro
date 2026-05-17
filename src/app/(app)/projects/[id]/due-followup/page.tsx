import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { formatBDT, formatBDTCompact, cn } from '@/lib/utils';
import { AlertCircle, Users, TrendingDown, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { StatCard } from '@/components/shared/stat-card';
import { Card, CardContent } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

export default async function ProjectDueFollowupPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as any)?.companyId ?? '';

  const project = await prisma.project.findFirst({
    where: { id: params.id, companyId },
    select: { id: true, name: true },
  });
  if (!project) notFound();

  // All buyers in this project with their payment history FOR THIS PROJECT ONLY
  const projectBuyers = await prisma.projectBuyer.findMany({
    where: { projectId: project.id },
    include: {
      buyer: {
        include: {
          demands: {
            where: { phase: { projectId: project.id } },
            select: { id: true, amount: true, status: true, dueDate: true, title: true },
          },
          collections: {
            where: { phase: { projectId: project.id } },
            select: { amount: true },
          },
        },
      },
    },
  });

  const rows = projectBuyers.map(({ buyer }) => {
    const totalDemanded = buyer.demands.reduce((s, d) => s + Number(d.amount), 0);
    const totalPaid     = buyer.collections.reduce((s, c) => s + Number(c.amount), 0);
    const due           = Math.max(0, totalDemanded - totalPaid);
    const overdueDemands = buyer.demands.filter(
      d => d.status !== 'FULLY_PAID' && d.status !== 'CANCELLED' && d.dueDate && new Date(d.dueDate) < new Date()
    );
    return { buyer, totalDemanded, totalPaid, due, overdueDemands };
  });

  // Sort: biggest due first
  rows.sort((a, b) => b.due - a.due);

  const totalDue    = rows.reduce((s, r) => s + r.due, 0);
  const withDue     = rows.filter(r => r.due > 0).length;
  const overdueCount = rows.filter(r => r.overdueDemands.length > 0).length;
  const cleared      = rows.filter(r => r.due === 0 && r.totalDemanded > 0).length;

  return (
    <div className="p-5 space-y-5">
      <div>
        <h2 className="text-base font-semibold">Due Follow-up</h2>
        <p className="text-xs text-muted-foreground">{project.name} · buyer-wise outstanding balances</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard title="Total Outstanding" value={formatBDTCompact(totalDue)}  subtitle={formatBDT(totalDue)}   icon={TrendingDown}  iconColor="text-red-600"    iconBg="bg-red-50" />
        <StatCard title="Buyers with Due"   value={String(withDue)}             subtitle="Have pending balance"  icon={AlertCircle}   iconColor="text-orange-500" iconBg="bg-orange-50" />
        <StatCard title="Overdue"           value={String(overdueCount)}        subtitle="Past demand due date"  icon={AlertCircle}   iconColor="text-red-500"    iconBg="bg-red-50" />
        <StatCard title="Fully Cleared"     value={String(cleared)}             subtitle="All demands paid"      icon={CheckCircle2}  iconColor="text-green-600"  iconBg="bg-green-50" />
      </div>

      <Card>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-muted-foreground">
              <AlertCircle className="h-10 w-10 mb-3 opacity-30" />
              <p className="font-medium">No buyers in this project yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">#</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Buyer</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Demanded</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Paid</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Due Balance</th>
                    <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">Overdue Demands</th>
                    <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ buyer, totalDemanded, totalPaid, due, overdueDemands }, i) => (
                    <tr key={buyer.id} className={cn('border-b last:border-0 hover:bg-muted/30 transition-colors', due > 0 && overdueDemands.length > 0 && 'bg-red-50/30')}>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{i + 1}</td>
                      <td className="px-4 py-3">
                        <Link href={`/buyers/${buyer.id}`} className="font-semibold hover:text-primary hover:underline">{buyer.name}</Link>
                        {buyer.nameBn && <div className="bn text-xs text-muted-foreground">{buyer.nameBn}</div>}
                        {buyer.phone && <div className="text-xs text-muted-foreground">{buyer.phone}</div>}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">{formatBDT(totalDemanded)}</td>
                      <td className="px-4 py-3 text-right text-green-600 font-medium">{formatBDT(totalPaid)}</td>
                      <td className={cn('px-4 py-3 text-right font-bold text-lg', due > 0 ? 'text-red-600' : 'text-green-600')}>
                        {due > 0 ? formatBDT(due) : <span className="text-sm font-medium">✅ Cleared</span>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {overdueDemands.length > 0 ? (
                          <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
                            ⚠️ {overdueDemands.length} overdue
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Link
                          href={`/projects/${project.id}/collections/new?buyerId=${buyer.id}`}
                          className="text-xs text-primary hover:underline"
                        >
                          Record Payment
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-muted/60 font-bold border-t-2">
                    <td colSpan={2} className="px-4 py-3">Total</td>
                    <td className="px-4 py-3 text-right">{formatBDT(rows.reduce((s, r) => s + r.totalDemanded, 0))}</td>
                    <td className="px-4 py-3 text-right text-green-600">{formatBDT(rows.reduce((s, r) => s + r.totalPaid, 0))}</td>
                    <td className="px-4 py-3 text-right text-red-600">{formatBDT(totalDue)}</td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground bg-blue-50 border border-blue-200 rounded-md px-3 py-2">
        💡 <strong>These balances are project-specific.</strong> The same buyer may have different dues in other projects.
        Demands are linked to phases; if no demands are issued yet, all "Demanded" values will show ৳ 0.
      </p>
    </div>
  );
}

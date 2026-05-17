import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { formatBDT, cn } from '@/lib/utils';
import { Users, AlertCircle, CheckCircle2, TrendingUp, Plus } from 'lucide-react';
import Link from 'next/link';
import { StatCard } from '@/components/shared/stat-card';
import { Card, CardContent } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

export default async function ProjectBuyersPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as any)?.companyId ?? '';

  const project = await prisma.project.findFirst({
    where: { id: params.id, companyId },
    select: { id: true, name: true },
  });
  if (!project) notFound();

  // All buyers in this project via ProjectBuyer join
  const projectBuyers = await prisma.projectBuyer.findMany({
    where: { projectId: project.id },
    include: {
      buyer: {
        include: {
          collections: {
            where: { phase: { projectId: project.id } },
            select: { amount: true },
          },
          unitAllocations: {
            include: { unit: { select: { unitNo: true, floor: true, unitType: true } } },
            where: { unit: { projectId: project.id } },
          },
        },
      },
    },
    orderBy: { joinedAt: 'asc' },
  });

  const rows = projectBuyers.map(({ buyer, joinedAt }) => {
    const totalPaid = buyer.collections.reduce((s, c) => s + Number(c.amount), 0);
    return { buyer, joinedAt, totalPaid };
  });

  const totalPaid     = rows.reduce((s, r) => s + r.totalPaid, 0);
  const withUnits     = rows.filter(r => r.buyer.unitAllocations.length > 0).length;

  const statusColors: Record<string, string> = {
    ACTIVE:    'bg-green-100 text-green-700',
    DEFAULTER: 'bg-red-100 text-red-600',
    COMPLETED: 'bg-blue-100 text-blue-700',
    CANCELLED: 'bg-gray-100 text-gray-500',
    PROSPECT:  'bg-yellow-100 text-yellow-700',
  };

  return (
    <div className="p-5 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">Project Buyers</h2>
          <p className="text-xs text-muted-foreground">{project.name} · {rows.length} buyers registered</p>
        </div>
        <Link
          href="/buyers/new"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" /> Add Buyer
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard title="Total Buyers"      value={String(rows.length)}       subtitle="In this project"        icon={Users}         iconColor="text-violet-600" iconBg="bg-violet-50" />
        <StatCard title="Total Collected"   value={formatBDT(totalPaid)}      subtitle="All payments received"  icon={TrendingUp}    iconColor="text-green-600" iconBg="bg-green-50" />
        <StatCard title="With Units"        value={String(withUnits)}         subtitle="Allocated unit/flat"    icon={CheckCircle2}  iconColor="text-blue-600"  iconBg="bg-blue-50" />
        <StatCard title="Active"            value={String(rows.filter(r => r.buyer.status === 'ACTIVE').length)} subtitle="Active membership" icon={CheckCircle2} iconColor="text-teal-600" iconBg="bg-teal-50" />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">#</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Buyer</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Contact</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Units in Project</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Total Paid (This Project)</th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                      No buyers in this project yet.{' '}
                      <Link href="/buyers/new" className="text-primary hover:underline">Add a buyer</Link>
                    </td>
                  </tr>
                ) : (
                  rows.map(({ buyer, totalPaid }, i) => (
                    <tr key={buyer.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 text-xs text-muted-foreground">{i + 1}</td>
                      <td className="px-4 py-3">
                        <Link href={`/buyers/${buyer.id}`} className="font-semibold hover:text-primary hover:underline">
                          {buyer.name}
                        </Link>
                        {buyer.nameBn && <div className="bn text-xs text-muted-foreground">{buyer.nameBn}</div>}
                        {buyer.fatherName && <div className="text-xs text-muted-foreground">S/O {buyer.fatherName}</div>}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {buyer.phone && <div>{buyer.phone}</div>}
                        {buyer.nidNo && <div>NID: {buyer.nidNo}</div>}
                      </td>
                      <td className="px-4 py-3">
                        {buyer.unitAllocations.length === 0 ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : (
                          <div className="space-y-0.5">
                            {buyer.unitAllocations.map(ua => (
                              <div key={ua.id} className="text-xs">
                                Unit {ua.unit.unitNo}
                                {ua.unit.floor != null && <span className="text-muted-foreground"> · Floor {ua.unit.floor}</span>}
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-green-600">{formatBDT(totalPaid)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', statusColors[buyer.status] ?? 'bg-gray-100 text-gray-600')}>
                          {buyer.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground bg-blue-50 border border-blue-200 rounded-md px-3 py-2">
        💡 <strong>Balances shown are project-specific.</strong> The same buyer may have a different balance in other projects.
        To see all projects for a buyer, go to{' '}
        <Link href="/buyers" className="text-primary hover:underline">Buyer List</Link>.
      </p>
    </div>
  );
}

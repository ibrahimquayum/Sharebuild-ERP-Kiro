import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Header } from '@/components/layout/header';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { StatCard } from '@/components/shared/stat-card';
import { formatBDT, formatBDTCompact, cn } from '@/lib/utils';
import { Users, UserCheck, AlertCircle, TrendingUp, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function BuyersPage() {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as any)?.companyId ?? '';

  const buyers = await prisma.buyer.findMany({
    where: { companyId },
    include: {
      collections: { select: { amount: true } },
      demands: { select: { amount: true, status: true } },
      projectLinks: { include: { project: { select: { id: true, name: true } } } },
    },
    orderBy: { name: 'asc' },
  });

  const buyerRows = buyers.map((b) => {
    const totalPaid = b.collections.reduce((s, c) => s + Number(c.amount), 0);
    const totalDemanded = b.demands.reduce((s, d) => s + Number(d.amount), 0);
    const due = Math.max(0, totalDemanded - totalPaid);
    return { buyer: b, totalPaid, totalDemanded, due };
  });

  const totalCollected = buyerRows.reduce((s, r) => s + r.totalPaid, 0);
  const activeCount = buyers.filter((b) => b.status === 'ACTIVE').length;
  const defaulterCount = buyers.filter((b) => b.status === 'DEFAULTER' || buyerRows.find(r => r.buyer.id === b.id)!.due > 0).length;

  const statusColors: Record<string, string> = {
    ACTIVE: 'bg-green-100 text-green-700',
    DEFAULTER: 'bg-red-100 text-red-600',
    COMPLETED: 'bg-blue-100 text-blue-700',
    CANCELLED: 'bg-gray-100 text-gray-500',
    PROSPECT: 'bg-yellow-100 text-yellow-700',
  };

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Buyers" />
      <PageHeader
        title="All Buyers / Contacts"
        subtitle="Company-wide registry — for project-specific balances open the project workspace"
        action={{ label: 'Add Buyer', href: '/buyers/new' }}
      />
      <div className="p-6 space-y-6">

        {/* Legacy notice */}
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 flex items-start gap-3">
          <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800">
            <strong>Tip:</strong> For project-specific buyer balances, dues, and payment history, use the{' '}
            <strong>Project Workspace</strong>. Navigate to{' '}
            <Link href="/projects" className="underline font-medium">Projects</Link>{' '}
            → select a project → <strong>Buyers</strong> or <strong>Due Follow-up</strong>.
            This page shows company-wide identity records only.
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Buyers" value={String(buyers.length)} subtitle="Registered contacts" icon={Users} iconColor="text-blue-600" iconBg="bg-blue-50" />
          <StatCard title="Active Buyers" value={String(activeCount)} subtitle="Currently active" icon={UserCheck} iconColor="text-green-600" iconBg="bg-green-50" />
          <StatCard title="With Due Balance" value={String(defaulterCount)} subtitle="Have pending payment" icon={AlertCircle} iconColor="text-orange-500" iconBg="bg-orange-50" />
          <StatCard title="Total Collected" value={formatBDTCompact(totalCollected)} subtitle={formatBDT(totalCollected)} icon={TrendingUp} iconColor="text-violet-600" iconBg="bg-violet-50" />
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
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Project(s)</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Total Paid (All Projects)</th>
                    <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {buyerRows.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">No buyers registered yet.</td></tr>
                  ) : (
                    buyerRows.map(({ buyer, totalPaid }, i) => (
                      <tr key={buyer.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 text-xs text-muted-foreground">{i + 1}</td>
                        <td className="px-4 py-3">
                          <Link href={`/buyers/${buyer.id}`} className="font-semibold hover:text-primary hover:underline">{buyer.name}</Link>
                          {buyer.nameBn && <div className="bn text-xs text-muted-foreground">{buyer.nameBn}</div>}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {buyer.phone && <div>{buyer.phone}</div>}
                          {buyer.email && <div>{buyer.email}</div>}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {buyer.projectLinks.map(pl => (
                            <div key={pl.projectId}>
                              <Link href={`/projects/${pl.projectId}/buyers`} className="hover:text-primary hover:underline">
                                {pl.project.name}
                              </Link>
                            </div>
                          ))}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-green-600">{formatBDT(totalPaid)}</td>
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
      </div>
    </div>
  );
}

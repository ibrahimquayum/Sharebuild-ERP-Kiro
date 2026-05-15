import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/shared/stat-card';
import { formatBDT, formatBDTCompact, formatDate, balanceColor, cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Receipt, ArrowLeft, Phone, Mail, MapPin, User } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function BuyerDetailPage({ params }: { params: { id: string } }) {
  const buyer = await prisma.buyer.findUnique({
    where: { id: params.id },
    include: {
      collections: {
        include: { phase: { select: { id: true, name: true } } },
        orderBy: { receivedDate: 'desc' },
      },
      demands: {
        include: {
          phase: { select: { id: true, name: true } },
          collections: { select: { amount: true } },
        },
        orderBy: { createdAt: 'desc' },
      },
      projectLinks: { include: { project: { select: { id: true, name: true } } } },
      unitAllocations: { include: { unit: { select: { unitNo: true, floor: true, unitType: true } } } },
    },
  });

  if (!buyer) notFound();

  const totalPaid = buyer.collections.reduce((s, c) => s + Number(c.amount), 0);
  const totalDemanded = buyer.demands.reduce((s, d) => s + Number(d.amount), 0);
  const due = Math.max(0, totalDemanded - totalPaid);

  // Phase-wise payment breakdown
  const phasePayments = buyer.collections.reduce<Record<string, { phaseName: string; phaseId: string; amount: number }>>((acc, c) => {
    if (!acc[c.phaseId]) acc[c.phaseId] = { phaseName: c.phase.name, phaseId: c.phaseId, amount: 0 };
    acc[c.phaseId].amount += Number(c.amount);
    return acc;
  }, {});

  const paymentMethodColors: Record<string, string> = {
    CASH: 'bg-green-100 text-green-700',
    CHEQUE: 'bg-blue-100 text-blue-700',
    BANK_TRANSFER: 'bg-violet-100 text-violet-700',
    MOBILE_BANKING: 'bg-pink-100 text-pink-700',
    OTHER: 'bg-gray-100 text-gray-600',
  };

  const statusColors: Record<string, string> = {
    ACTIVE: 'bg-green-100 text-green-700',
    DEFAULTER: 'bg-red-100 text-red-600',
    COMPLETED: 'bg-blue-100 text-blue-700',
    CANCELLED: 'bg-gray-100 text-gray-500',
    PROSPECT: 'bg-yellow-100 text-yellow-700',
  };

  return (
    <div className="flex flex-col min-h-full">
      <Header title={buyer.name} />
      <div className="p-6 space-y-6">
        <Link href="/buyers" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to Buyers
        </Link>

        {/* Buyer Profile Card */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start gap-4 flex-wrap">
              <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold text-xl shrink-0">
                {buyer.name[0]?.toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className="text-xl font-bold">{buyer.name}</h2>
                  {buyer.nameBn && <span className="bn text-base text-muted-foreground">({buyer.nameBn})</span>}
                  <span className={cn('text-xs px-2.5 py-1 rounded-full font-semibold', statusColors[buyer.status] ?? 'bg-gray-100 text-gray-600')}>{buyer.status}</span>
                </div>
                {buyer.fatherName && <p className="text-sm text-muted-foreground mt-0.5">Father: {buyer.fatherName}</p>}
                <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
                  {buyer.phone && <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{buyer.phone}</span>}
                  {buyer.phone2 && <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{buyer.phone2}</span>}
                  {buyer.email && <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{buyer.email}</span>}
                  {buyer.nidNo && <span className="flex items-center gap-1"><User className="h-3.5 w-3.5" />NID: {buyer.nidNo}</span>}
                </div>
                {buyer.address && (
                  <p className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />{buyer.address}
                  </p>
                )}
                {buyer.projectLinks.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {buyer.projectLinks.map(pl => (
                      <Link key={pl.projectId} href={`/projects/${pl.projectId}`} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full hover:bg-primary/20">
                        {pl.project.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Financial KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard title="Total Paid" value={formatBDTCompact(totalPaid)} subtitle={formatBDT(totalPaid)} icon={TrendingUp} iconColor="text-green-600" iconBg="bg-green-50" />
          <StatCard title="Total Demanded" value={formatBDTCompact(totalDemanded)} subtitle={formatBDT(totalDemanded)} icon={Receipt} iconColor="text-blue-600" iconBg="bg-blue-50" />
          <StatCard
            title="Due Balance"
            value={due > 0 ? formatBDTCompact(due) : 'Cleared'}
            subtitle={due > 0 ? formatBDT(due) : 'All payments received'}
            icon={TrendingDown}
            iconColor={due > 0 ? 'text-red-600' : 'text-green-600'}
            iconBg={due > 0 ? 'bg-red-50' : 'bg-green-50'}
          />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Payment History */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center justify-between">
                <span>Payment History</span>
                <span className="text-sm font-bold text-green-600">{formatBDT(totalPaid)}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">#</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Phase</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Amount</th>
                      <th className="px-4 py-2 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">Method</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {buyer.collections.length === 0 ? (
                      <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground text-xs">No payments recorded</td></tr>
                    ) : (
                      buyer.collections.map((c, i) => (
                        <tr key={c.id} className="border-b last:border-0 hover:bg-muted/30">
                          <td className="px-4 py-2.5 text-xs text-muted-foreground">{i + 1}</td>
                          <td className="px-4 py-2.5">
                            <Link href={`/phases/${c.phase.id}`} className="text-sm hover:text-primary hover:underline">{c.phase.name}</Link>
                            {c.receiptNo && <div className="text-xs text-muted-foreground font-mono">#{c.receiptNo}</div>}
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
                      <td colSpan={2} className="px-4 py-2.5">Total</td>
                      <td className="px-4 py-2.5 text-right text-green-600">{formatBDT(totalPaid)}</td>
                      <td colSpan={2} />
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Phase-wise Payment Matrix */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Phase-wise Payment Summary</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {Object.keys(phasePayments).length === 0 ? (
                <div className="px-4 py-8 text-center text-muted-foreground text-sm">No phase payments yet</div>
              ) : (
                <div className="divide-y">
                  {Object.values(phasePayments)
                    .sort((a, b) => b.amount - a.amount)
                    .map((pp) => (
                      <div key={pp.phaseId} className="flex items-center justify-between px-4 py-3">
                        <Link href={`/phases/${pp.phaseId}`} className="text-sm font-medium hover:text-primary hover:underline">{pp.phaseName}</Link>
                        <div className="flex items-center gap-4">
                          <div className="w-24 bg-muted rounded-full h-1.5">
                            <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${totalPaid > 0 ? Math.min(100, (pp.amount / totalPaid) * 100) : 0}%` }} />
                          </div>
                          <span className="text-sm font-bold text-green-600 w-28 text-right">{formatBDT(pp.amount)}</span>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Demand Notices */}
        {buyer.demands.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Demand Notices</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Demand</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Phase</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Demanded</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Paid</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Balance</th>
                      <th className="px-4 py-2 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">Due Date</th>
                      <th className="px-4 py-2 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {buyer.demands.map((d) => {
                      const paid = d.collections.reduce((s, c) => s + Number(c.amount), 0);
                      const bal = Number(d.amount) - paid;
                      return (
                        <tr key={d.id} className="border-b last:border-0 hover:bg-muted/30">
                          <td className="px-4 py-2.5">
                            <div className="font-medium">{d.title}</div>
                            {d.demandNo && <div className="text-xs text-muted-foreground font-mono">{d.demandNo}</div>}
                          </td>
                          <td className="px-4 py-2.5 text-xs text-muted-foreground">{d.phase?.name ?? '—'}</td>
                          <td className="px-4 py-2.5 text-right font-medium">{formatBDT(Number(d.amount))}</td>
                          <td className="px-4 py-2.5 text-right text-green-600">{formatBDT(paid)}</td>
                          <td className={cn('px-4 py-2.5 text-right font-bold', bal > 0 ? 'text-red-600' : 'text-green-600')}>
                            {bal > 0 ? formatBDT(bal) : '✅'}
                          </td>
                          <td className="px-4 py-2.5 text-center text-xs text-muted-foreground">{d.dueDate ? formatDate(d.dueDate) : '—'}</td>
                          <td className="px-4 py-2.5 text-center">
                            <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium',
                              d.status === 'FULLY_PAID' ? 'bg-green-100 text-green-700' :
                              d.status === 'OVERDUE' ? 'bg-red-100 text-red-600' :
                              d.status === 'ISSUED' ? 'bg-blue-100 text-blue-700' :
                              'bg-gray-100 text-gray-600'
                            )}>
                              {d.status.replace('_', ' ')}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Allocated Units */}
        {buyer.unitAllocations.length > 0 && (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Allocated Units / Flats</CardTitle></CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {buyer.unitAllocations.map((ua) => (
                  <div key={ua.id} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <span className="font-medium">Unit {ua.unit.unitNo}</span>
                      {ua.unit.floor != null && <span className="text-sm text-muted-foreground ml-2">Floor {ua.unit.floor}</span>}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{ua.unit.unitType}</span>
                      <span>{Number(ua.sharePercent)}% share</span>
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

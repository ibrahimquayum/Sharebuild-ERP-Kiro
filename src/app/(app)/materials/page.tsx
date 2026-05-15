import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Header } from '@/components/layout/header';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { StatCard } from '@/components/shared/stat-card';
import { formatBDT, formatDate, expenseCategoryLabel, cn } from '@/lib/utils';
import { Package, ShoppingCart } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function MaterialsPage() {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as any)?.companyId ?? '';

  const [items, totalAgg] = await Promise.all([
    prisma.materialItem.findMany({
      where: { phase: { project: { companyId } } },
      include: {
        phase: { select: { id: true, name: true } },
        supplier: { select: { id: true, name: true } },
      },
      orderBy: { purchaseDate: 'desc' },
      take: 200,
    }),
    prisma.materialItem.aggregate({
      where: { phase: { project: { companyId } } },
      _sum: { totalAmount: true },
      _count: true,
    }),
  ]);

  const total = Number(totalAgg._sum.totalAmount ?? 0);

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Material Purchases" />
      <PageHeader title="Material Purchase Log" subtitle="Itemised material purchase records" action={{ label: 'Add Purchase', href: '/materials/new' }} />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <StatCard title="Total Purchases" value={formatBDT(total)} subtitle={`${totalAgg._count} line items`} icon={ShoppingCart} iconColor="text-blue-600" iconBg="bg-blue-50" />
          <StatCard title="Purchase Records" value={String(totalAgg._count)} subtitle="Material line items" icon={Package} iconColor="text-violet-600" iconBg="bg-violet-50" />
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase">#</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase">Date</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase">Material</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase">Phase</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase">Qty</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase">Unit Price</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-red-600 uppercase">Total</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase">Supplier</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr><td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">No material purchases recorded yet.</td></tr>
                  ) : (
                    items.map((item, i) => (
                      <tr key={item.id} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="px-4 py-3 text-xs text-muted-foreground">{i + 1}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(item.purchaseDate)}</td>
                        <td className="px-4 py-3">
                          <div className="font-medium">{item.description}</div>
                          {item.descriptionBn && <div className="bn text-xs text-muted-foreground">{item.descriptionBn}</div>}
                          <div className="text-xs text-muted-foreground">{expenseCategoryLabel(item.category)}</div>
                        </td>
                        <td className="px-4 py-3">
                          <Link href={`/phases/${item.phase.id}`} className="text-xs hover:text-primary hover:underline">{item.phase.name}</Link>
                        </td>
                        <td className="px-4 py-3 text-right text-xs">{Number(item.quantity)} {item.unit}</td>
                        <td className="px-4 py-3 text-right text-xs text-muted-foreground">{formatBDT(Number(item.unitPrice))}</td>
                        <td className="px-4 py-3 text-right font-bold text-red-500">{formatBDT(Number(item.totalAmount))}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {item.supplier ? (
                            <Link href={`/suppliers/${item.supplier.id}`} className="hover:text-primary hover:underline">{item.supplier.name}</Link>
                          ) : '—'}
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

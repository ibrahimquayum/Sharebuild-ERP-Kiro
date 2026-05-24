import { prisma } from '@/lib/prisma';
import { Header } from '@/components/layout/header';
import { PageHeader } from '@/components/shared/page-header';
import { StatCard } from '@/components/shared/stat-card';
import { Card, CardContent } from '@/components/ui/card';
import { formatBDT, cn } from '@/lib/utils';
import { Truck, Package, Users, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { requireCompanyWidePageAccess } from '@/lib/access-control';

export const dynamic = 'force-dynamic';

export default async function SuppliersPage() {
  const context = await requireCompanyWidePageAccess('suppliers', 'view');
  const companyId = context.companyId;

  const suppliers = await prisma.supplier.findMany({
    where: { companyId },
    include: {
      expenses: { select: { amount: true } },
      payables: { select: { totalAmount: true, paidAmount: true, status: true } },
      _count: { select: { expenses: true, payables: true } },
    },
    orderBy: { name: 'asc' },
  });

  const supplierRows = suppliers.map((s) => {
    const totalBilled = s.payables.reduce((acc, p) => acc + Number(p.totalAmount), 0);
    const totalPaid = s.payables.reduce((acc, p) => acc + Number(p.paidAmount), 0);
    const due = totalBilled - totalPaid;
    return { supplier: s, totalBilled, totalPaid, due };
  });

  const totalDue = supplierRows.reduce((s, r) => s + r.due, 0);
  const suppliersWithDue = supplierRows.filter((r) => r.due > 0).length;

  const typeColors: Record<string, string> = {
    MATERIAL_SUPPLIER: 'bg-blue-100 text-blue-700',
    LABOUR_CONTRACTOR: 'bg-green-100 text-green-700',
    EQUIPMENT_SUPPLIER: 'bg-purple-100 text-purple-700',
    SERVICE_PROVIDER: 'bg-orange-100 text-orange-700',
    CONSULTANT: 'bg-cyan-100 text-cyan-700',
  };

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Suppliers" />
      <PageHeader
        title="Supplier Management"
        subtitle="Vendors, contractors, and service providers"
        action={{ label: 'Add Supplier', href: '/suppliers/new' }}
      />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Suppliers" value={String(suppliers.length)} subtitle="Registered vendors" icon={Truck} iconColor="text-blue-600" iconBg="bg-blue-50" />
          <StatCard title="With Payables" value={String(suppliersWithDue)} subtitle="Have outstanding dues" icon={AlertCircle} iconColor="text-orange-500" iconBg="bg-orange-50" />
          <StatCard title="Total Due to Suppliers" value={formatBDT(totalDue)} subtitle="Accounts payable" icon={Package} iconColor="text-red-500" iconBg="bg-red-50" />
          <StatCard title="Active" value={String(suppliers.filter(s => s.isActive).length)} subtitle="Active suppliers" icon={Users} iconColor="text-green-600" iconBg="bg-green-50" />
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">#</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Supplier</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Type</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Contact</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Total Billed</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Total Paid</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Due</th>
                    <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">Expenses</th>
                  </tr>
                </thead>
                <tbody>
                  {supplierRows.length === 0 ? (
                    <tr><td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">No suppliers registered yet.</td></tr>
                  ) : (
                    supplierRows.map(({ supplier: s, totalBilled, totalPaid, due }, i) => (
                      <tr key={s.id} className={cn('border-b last:border-0 hover:bg-muted/30 transition-colors', due > 0 && 'bg-orange-50/30')}>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{i + 1}</td>
                        <td className="px-4 py-3">
                          <Link href={`/suppliers/${s.id}`} className="font-semibold hover:text-primary hover:underline">{s.name}</Link>
                          {s.nameBn && <div className="bn text-xs text-muted-foreground">{s.nameBn}</div>}
                          {s.contactPerson && <div className="text-xs text-muted-foreground">{s.contactPerson}</div>}
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', typeColors[s.supplierType] ?? 'bg-gray-100 text-gray-600')}>
                            {s.supplierType.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {s.phone && <div>{s.phone}</div>}
                          {s.email && <div>{s.email}</div>}
                        </td>
                        <td className="px-4 py-3 text-right font-medium">{formatBDT(totalBilled)}</td>
                        <td className="px-4 py-3 text-right text-green-600 font-medium">{formatBDT(totalPaid)}</td>
                        <td className={cn('px-4 py-3 text-right font-bold', due > 0 ? 'text-red-600' : 'text-green-600')}>
                          {due > 0 ? formatBDT(due) : '✅'}
                        </td>
                        <td className="px-4 py-3 text-center text-xs text-muted-foreground">{s._count.expenses}</td>
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

import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { formatBDT, cn } from '@/lib/utils';
import { Plus, Truck, Building2 } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

export default async function ProjectVendorsPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as any)?.companyId ?? '';

  const project = await prisma.project.findFirst({
    where: { id: params.id, companyId },
    select: { id: true, name: true },
  });
  if (!project) notFound();

  const base = `/projects/${project.id}`;

  // Suppliers: MATERIAL_SUPPLIER or EQUIPMENT_SUPPLIER
  const supplierPayables = await prisma.supplierPayable.findMany({
    where: {
      projectId: project.id,
      supplier: { supplierType: { in: ['MATERIAL_SUPPLIER', 'EQUIPMENT_SUPPLIER'] } },
    },
    include: {
      supplier: { select: { id: true, name: true, supplierType: true, phone: true } },
    },
    orderBy: { billDate: 'desc' },
  });

  // Subcontractors: LABOUR_CONTRACTOR or SERVICE_PROVIDER
  const subcontractorPayables = await prisma.supplierPayable.findMany({
    where: {
      projectId: project.id,
      supplier: { supplierType: { in: ['LABOUR_CONTRACTOR', 'SERVICE_PROVIDER'] } },
    },
    include: {
      supplier: { select: { id: true, name: true, supplierType: true, phone: true } },
    },
    orderBy: { billDate: 'desc' },
  });

  // Aggregate by supplier
  function aggregateBySupplier(payables: typeof supplierPayables) {
    const map = new Map<string, {
      supplier: { id: string; name: string; supplierType: string; phone: string | null };
      totalBilled: number;
      totalPaid: number;
      totalDue: number;
    }>();
    for (const p of payables) {
      const existing = map.get(p.supplierId);
      if (existing) {
        existing.totalBilled += Number(p.totalAmount);
        existing.totalPaid   += Number(p.paidAmount);
        existing.totalDue    += Number(p.dueAmount);
      } else {
        map.set(p.supplierId, {
          supplier: p.supplier,
          totalBilled: Number(p.totalAmount),
          totalPaid:   Number(p.paidAmount),
          totalDue:    Number(p.dueAmount),
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.totalDue - a.totalDue);
  }

  const suppliers      = aggregateBySupplier(supplierPayables);
  const subcontractors = aggregateBySupplier(subcontractorPayables);

  const supplierTypeLabel: Record<string, string> = {
    MATERIAL_SUPPLIER:  'Material Supplier',
    EQUIPMENT_SUPPLIER: 'Equipment Supplier',
    LABOUR_CONTRACTOR:  'Labour Contractor',
    SERVICE_PROVIDER:   'Service Provider',
  };

  function VendorTable({
    rows,
    emptyLabel,
    newBillHref,
    newVendorHref,
    ledgerHref,
    billParamName = 'supplierId',
  }: {
    rows: ReturnType<typeof aggregateBySupplier>;
    emptyLabel: string;
    newBillHref: string;
    newVendorHref: string;
    ledgerHref: string;
    billParamName?: string;
  }) {
    if (rows.length === 0) {
      return (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground mb-3">{emptyLabel}</p>
          <div className="flex justify-center gap-2">
            <Link
              href={newVendorHref}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-medium hover:bg-muted transition-colors"
            >
              <Plus className="h-3.5 w-3.5" /> Add Vendor
            </Link>
            <Link
              href={newBillHref}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" /> Record First Bill
            </Link>
          </div>
        </div>
      );
    }
    return (
      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">#</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Name</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Type</th>
              <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">Total Billed</th>
              <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">Paid</th>
              <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">Outstanding Due</th>
              <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((row, i) => (
              <tr key={row.supplier.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 text-xs text-muted-foreground">{i + 1}</td>
                <td className="px-4 py-3">
                  <p className="font-medium">{row.supplier.name}</p>
                  {row.supplier.phone && (
                    <p className="text-xs text-muted-foreground">{row.supplier.phone}</p>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {supplierTypeLabel[row.supplier.supplierType] ?? row.supplier.supplierType}
                </td>
                <td className="px-4 py-3 text-right text-xs font-medium tabular-nums">
                  {formatBDT(row.totalBilled)}
                </td>
                <td className="px-4 py-3 text-right text-xs font-medium text-green-600 tabular-nums">
                  {formatBDT(row.totalPaid)}
                </td>
                <td className={cn(
                  'px-4 py-3 text-right text-xs font-bold tabular-nums',
                  row.totalDue > 0 ? 'text-red-600' : 'text-emerald-600'
                )}>
                  {formatBDT(row.totalDue)}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2 text-xs">
                    <Link href={ledgerHref} className="text-primary hover:underline">Ledger</Link>
                    <Link href={`${newBillHref}?${billParamName}=${row.supplier.id}`} className="text-primary hover:underline">Bill</Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="p-5 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold">Vendors</h1>
          <p className="text-xs text-muted-foreground">{project.name}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`${base}/suppliers/new`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-medium hover:bg-muted transition-colors"
          >
            <Plus className="h-3.5 w-3.5" /> Add Supplier
          </Link>
          <Link
            href={`${base}/subcontractors/new`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-medium hover:bg-muted transition-colors"
          >
            <Plus className="h-3.5 w-3.5" /> Add Subcontractor
          </Link>
          <Link
            href={`${base}/payables/new`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-orange-600 text-white text-xs font-medium hover:bg-orange-700 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" /> Supplier Bill
          </Link>
          <Link
            href={`${base}/subcontractors/bills/new`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-purple-600 text-white text-xs font-medium hover:bg-purple-700 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" /> Subcontractor Bill
          </Link>
        </div>
      </div>

      {/* Sub-navigation */}
      <div className="flex gap-3 text-xs border-b pb-3">
        <Link href={`${base}/vendors`}       className="font-semibold text-foreground border-b-2 border-primary pb-3 -mb-3">Vendors Overview</Link>
        <Link href={`${base}/payables`}      className="text-muted-foreground hover:text-foreground transition-colors">Supplier Bills</Link>
        <Link href={`${base}/payables/payments`} className="text-muted-foreground hover:text-foreground transition-colors">Supplier Payments</Link>
        <Link href={`${base}/subcontractors`} className="text-muted-foreground hover:text-foreground transition-colors">Subcontractors</Link>
        <Link href={`${base}/subcontractors/bills`} className="text-muted-foreground hover:text-foreground transition-colors">Subcontractor Bills</Link>
      </div>

      {/* Suppliers section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Truck className="h-4 w-4 text-orange-500" />
          <h2 className="text-sm font-semibold">Suppliers</h2>
          <span className="text-xs text-muted-foreground">(Material &amp; Equipment vendors)</span>
        </div>
        <VendorTable
          rows={suppliers}
          emptyLabel="No material or equipment suppliers linked to this project yet."
          newBillHref={`${base}/payables/new`}
          newVendorHref={`${base}/suppliers/new`}
          ledgerHref={`${base}/reports/supplier-ledger`}
        />
      </div>

      {/* Subcontractors section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-purple-500" />
          <h2 className="text-sm font-semibold">Subcontractors</h2>
          <span className="text-xs text-muted-foreground">(Labour &amp; Service providers)</span>
        </div>
        <VendorTable
          rows={subcontractors}
          emptyLabel="No subcontractors linked to this project yet."
          newBillHref={`${base}/subcontractors/bills/new`}
          newVendorHref={`${base}/subcontractors/new`}
          ledgerHref={`${base}/reports/subcontractor-ledger`}
          billParamName="subcontractorId"
        />
      </div>
    </div>
  );
}

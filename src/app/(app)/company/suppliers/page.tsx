import Link from 'next/link';
import { requireCompanyPageAccess } from '@/lib/access-control';
import { prisma } from '@/lib/prisma';
import { Header } from '@/components/layout/header';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { formatBDT } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function CompanySuppliersPage() {
  const context = await requireCompanyPageAccess('suppliers', 'view');
  const companyId = context.companyId;
  const suppliers = await prisma.supplier.findMany({
    where: { companyId, supplierType: { in: ['MATERIAL_SUPPLIER', 'EQUIPMENT_SUPPLIER'] } },
    include: { payables: true, _count: { select: { payables: true } } },
    orderBy: { name: 'asc' },
  });

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Suppliers" />
      <PageHeader title="Suppliers" subtitle="Company-level material and equipment providers." action={context.isCompanyWide ? { label: 'New Supplier', href: '/company/suppliers/new' } : undefined} />
      <div className="p-6">
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/40">{['Supplier', 'Phone', 'Material Types', 'Status', 'Bill Count', 'Payable', 'Actions'].map(h => <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase">{h}</th>)}</tr></thead>
              <tbody>
                {suppliers.map((s) => {
                  const due = s.payables.reduce((sum, p) => sum + Number(p.dueAmount), 0);
                  return (
                    <tr key={s.id} className="border-b last:border-0">
                      <td className="px-4 py-3 font-medium">{s.name}{s.nameBn && <div className="bn text-xs text-muted-foreground">{s.nameBn}</div>}</td>
                      <td className="px-4 py-3">{s.phone ?? '-'}</td>
                      <td className="px-4 py-3">{s.supplierType.replaceAll('_', ' ')}</td>
                      <td className="px-4 py-3">{s.isActive ? 'Active' : 'Inactive'}</td>
                      <td className="px-4 py-3">{s._count.payables}</td>
                      <td className="px-4 py-3">{formatBDT(due)}</td>
                      <td className="px-4 py-3 space-x-3"><Link className="text-primary hover:underline" href={`/company/suppliers/${s.id}`}>View</Link><Link className="text-primary hover:underline" href={`/company/suppliers/${s.id}/edit`}>Edit</Link></td>
                    </tr>
                  );
                })}
                {suppliers.length === 0 && <tr><td className="px-4 py-8 text-center text-muted-foreground" colSpan={7}>No suppliers yet.</td></tr>}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatBDT } from '@/lib/utils';
import { requireCompanyWidePageAccess } from '@/lib/access-control';

export const dynamic = 'force-dynamic';

export default async function SupplierDetailPage({ params }: { params: { id: string } }) {
  const context = await requireCompanyWidePageAccess('suppliers', 'view');
  const supplier = await prisma.supplier.findFirst({
    where: { id: params.id, companyId: context.companyId },
    include: { payables: { include: { project: true } } },
  });
  if (!supplier) notFound();
  const due = supplier.payables.reduce((sum, p) => sum + Number(p.dueAmount), 0);

  return (
    <div className="flex flex-col min-h-full">
      <Header title={supplier.name} />
      <div className="p-6 max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <Link href="/company/suppliers" className="text-sm text-muted-foreground hover:text-foreground">Back to Suppliers</Link>
          <Link href={`/company/suppliers/${supplier.id}/edit`} className="text-sm text-primary hover:underline">Edit</Link>
        </div>
        <Card>
          <CardHeader><CardTitle>Supplier Profile</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div><p className="text-xs text-muted-foreground uppercase">Name</p><p className="font-medium">{supplier.name}</p></div>
            <div><p className="text-xs text-muted-foreground uppercase">Type</p><p>{supplier.supplierType.replaceAll('_', ' ')}</p></div>
            <div><p className="text-xs text-muted-foreground uppercase">Contact Person</p><p>{supplier.contactPerson ?? '-'}</p></div>
            <div><p className="text-xs text-muted-foreground uppercase">Phone</p><p>{supplier.phone ?? '-'}</p></div>
            <div><p className="text-xs text-muted-foreground uppercase">Bank</p><p>{supplier.bankName ?? '-'}</p></div>
            <div><p className="text-xs text-muted-foreground uppercase">Account</p><p>{supplier.bankAccount ?? '-'}</p></div>
            <div className="md:col-span-2"><p className="text-xs text-muted-foreground uppercase">Address</p><p>{supplier.address ?? '-'}</p></div>
            <div className="md:col-span-2"><p className="text-xs text-muted-foreground uppercase">Notes</p><p>{supplier.notes ?? '-'}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Project Bills</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm font-medium">Outstanding: {formatBDT(due)}</p>
            {supplier.payables.map((bill) => (
              <div key={bill.id} className="flex items-center justify-between border rounded-md px-3 py-2 text-sm">
                <span>{bill.project.name} · {bill.billNo ?? 'Bill'} · {formatBDT(Number(bill.dueAmount))}</span>
                <Link className="text-primary hover:underline" href={`/projects/${bill.projectId}/payables`}>Open in project</Link>
              </div>
            ))}
            {supplier.payables.length === 0 && <p className="text-sm text-muted-foreground">No project bills yet.</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

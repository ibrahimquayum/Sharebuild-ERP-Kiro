import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SupplierEditForm } from '@/components/company/supplier-edit-form';

export const dynamic = 'force-dynamic';

export default async function SupplierEditPage({ params }: { params: { id: string } }) {
  const supplier = await prisma.supplier.findUnique({ where: { id: params.id } });
  if (!supplier) notFound();

  return (
    <div className="flex flex-col min-h-full">
      <Header title={`Edit ${supplier.name}`} />
      <div className="p-6 max-w-3xl space-y-4">
        <Link href={`/company/suppliers/${supplier.id}`} className="text-sm text-muted-foreground hover:text-foreground">Back to Supplier</Link>
        <Card>
          <CardHeader><CardTitle>Edit Supplier</CardTitle></CardHeader>
          <CardContent><SupplierEditForm supplier={{
            id: supplier.id,
            name: supplier.name,
            nameBn: supplier.nameBn,
            supplierType: supplier.supplierType,
            phone: supplier.phone,
            email: supplier.email,
            address: supplier.address,
            contactPerson: supplier.contactPerson,
            bankName: supplier.bankName,
            bankAccount: supplier.bankAccount,
            notes: supplier.notes,
            isActive: supplier.isActive,
          }} /></CardContent>
        </Card>
      </div>
    </div>
  );
}

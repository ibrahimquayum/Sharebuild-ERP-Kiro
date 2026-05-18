import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { ArrowLeft } from 'lucide-react';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ProjectVendorCreateForm } from '@/components/projects/project-vendor-create-form';

export const dynamic = 'force-dynamic';

export default async function ProjectSupplierNewPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as any)?.companyId ?? '';
  const project = await prisma.project.findFirst({ where: { id: params.id, companyId }, select: { id: true, name: true } });
  if (!project) notFound();

  const existingVendors = await prisma.supplier.findMany({
    where: {
      companyId,
      isActive: true,
      supplierType: { in: ['MATERIAL_SUPPLIER', 'EQUIPMENT_SUPPLIER'] },
    },
    select: { id: true, name: true, phone: true, supplierType: true },
    orderBy: { name: 'asc' },
  });

  return (
    <div className="p-5 max-w-4xl mx-auto space-y-4">
      <Link href={`/projects/${project.id}/vendors`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to Project Vendors
      </Link>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Add Supplier To Project</CardTitle>
          <CardDescription>
            Create a company supplier or pick an existing supplier, then continue directly to a project supplier bill for {project.name}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProjectVendorCreateForm projectId={project.id} mode="supplier" existingVendors={existingVendors} />
        </CardContent>
      </Card>
    </div>
  );
}

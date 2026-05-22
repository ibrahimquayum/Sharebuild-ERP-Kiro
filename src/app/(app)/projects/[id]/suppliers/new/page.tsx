import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { ArrowLeft } from 'lucide-react';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ProjectSupplierAssignmentForm } from '@/components/projects/project-supplier-assignment-form';

export const dynamic = 'force-dynamic';

export default async function ProjectSupplierNewPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as any)?.companyId ?? '';

  const [project, existingSuppliers] = await Promise.all([
    prisma.project.findFirst({ where: { id: params.id, companyId }, select: { id: true, name: true } }),
    prisma.supplier.findMany({
      where: { companyId, isActive: true, supplierType: { in: ['MATERIAL_SUPPLIER', 'EQUIPMENT_SUPPLIER', 'CONSULTANT'] } },
      select: { id: true, name: true, phone: true, supplierType: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  if (!project) notFound();

  return (
    <div className="p-5 max-w-5xl mx-auto space-y-4">
      <Link href={`/projects/${project.id}/suppliers`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to Project Suppliers
      </Link>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Assign Supplier To Project</CardTitle>
          <CardDescription>Create or select a company supplier, set project-specific terms, and attach contract or rate-sheet documents for {project.name}.</CardDescription>
        </CardHeader>
        <CardContent>
          <ProjectSupplierAssignmentForm projectId={project.id} existingSuppliers={existingSuppliers} />
        </CardContent>
      </Card>
    </div>
  );
}

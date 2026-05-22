import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { ArrowLeft } from 'lucide-react';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ProjectSupplierAssignmentForm } from '@/components/projects/project-supplier-assignment-form';

export const dynamic = 'force-dynamic';

export default async function EditProjectSupplierAssignmentPage({
  params,
}: {
  params: { id: string; projectSupplierId: string };
}) {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as any)?.companyId ?? '';

  const [project, assignment, existingSuppliers] = await Promise.all([
    prisma.project.findFirst({ where: { id: params.id, companyId }, select: { id: true, name: true } }),
    prisma.projectSupplier.findFirst({
      where: { id: params.projectSupplierId, projectId: params.id, companyId },
      include: { supplier: true },
    }),
    prisma.supplier.findMany({
      where: { companyId, isActive: true, supplierType: { in: ['MATERIAL_SUPPLIER', 'EQUIPMENT_SUPPLIER', 'CONSULTANT'] } },
      select: { id: true, name: true, phone: true, supplierType: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  if (!project || !assignment) notFound();

  return (
    <div className="p-5 max-w-5xl mx-auto space-y-4">
      <Link href={`/projects/${project.id}/suppliers/${assignment.id}`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to Supplier Assignment
      </Link>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Edit Project Supplier Assignment</CardTitle>
          <CardDescription>Update supplier master info, project-specific terms, and contract metadata for {project.name}.</CardDescription>
        </CardHeader>
        <CardContent>
          <ProjectSupplierAssignmentForm
            projectId={project.id}
            existingSuppliers={existingSuppliers}
            initialAssignment={{
              id: assignment.id,
              supplier: {
                id: assignment.supplier.id,
                name: assignment.supplier.name,
                nameBn: assignment.supplier.nameBn,
                supplierType: assignment.supplier.supplierType,
                contactPerson: assignment.supplier.contactPerson,
                phone: assignment.supplier.phone,
                address: assignment.supplier.address,
                notes: assignment.supplier.notes,
                isActive: assignment.supplier.isActive,
              },
              materialCategory: assignment.materialCategory,
              phaseNotes: assignment.phaseNotes,
              paymentTerms: assignment.paymentTerms,
              creditDays: assignment.creditDays,
              openingBalance: Number(assignment.openingBalance),
              contractNo: assignment.contractNo,
              contractDate: assignment.contractDate?.toISOString() ?? null,
              startDate: assignment.startDate?.toISOString() ?? null,
              endDate: assignment.endDate?.toISOString() ?? null,
              status: assignment.status,
              notes: assignment.notes,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}

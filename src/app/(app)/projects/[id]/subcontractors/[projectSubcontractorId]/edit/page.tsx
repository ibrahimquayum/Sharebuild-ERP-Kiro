import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { ArrowLeft } from 'lucide-react';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ProjectSubcontractorAssignmentForm } from '@/components/projects/project-subcontractor-assignment-form';

export const dynamic = 'force-dynamic';

export default async function EditProjectSubcontractorAssignmentPage({
  params,
}: {
  params: { id: string; projectSubcontractorId: string };
}) {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as any)?.companyId ?? '';

  const [project, assignment, existingSubcontractors, phases] = await Promise.all([
    prisma.project.findFirst({ where: { id: params.id, companyId }, select: { id: true, name: true } }),
    prisma.projectSubcontractor.findFirst({
      where: { id: params.projectSubcontractorId, projectId: params.id, companyId },
      include: { supplier: true },
    }),
    prisma.supplier.findMany({
      where: { companyId, isActive: true, supplierType: { in: ['LABOUR_CONTRACTOR', 'SERVICE_PROVIDER'] } },
      select: { id: true, name: true, phone: true, supplierType: true },
      orderBy: { name: 'asc' },
    }),
    prisma.phase.findMany({
      where: { projectId: params.id },
      select: { id: true, name: true },
      orderBy: [{ sequence: 'asc' }, { createdAt: 'asc' }],
    }),
  ]);

  if (!project || !assignment) notFound();

  return (
    <div className="p-5 max-w-5xl mx-auto space-y-4">
      <Link href={`/projects/${project.id}/subcontractors/${assignment.id}`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to Subcontractor Assignment
      </Link>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Edit Project Subcontractor Assignment</CardTitle>
          <CardDescription>Update subcontractor master info, project contract terms, and agreement metadata for {project.name}.</CardDescription>
        </CardHeader>
        <CardContent>
          <ProjectSubcontractorAssignmentForm
            projectId={project.id}
            existingSubcontractors={existingSubcontractors}
            phases={phases}
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
              workType: assignment.workType,
              assignedPhaseId: assignment.assignedPhaseId,
              contractAmount: assignment.contractAmount ? Number(assignment.contractAmount) : null,
              extraWorkAmount: Number(assignment.extraWorkAmount ?? 0),
              paymentTerms: assignment.paymentTerms,
              contractNo: assignment.contractNo,
              contractDate: assignment.contractDate?.toISOString() ?? null,
              startDate: assignment.startDate?.toISOString() ?? null,
              deadline: assignment.deadline?.toISOString() ?? null,
              status: assignment.status,
              notes: assignment.notes,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}

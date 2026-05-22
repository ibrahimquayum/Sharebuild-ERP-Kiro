import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { ArrowLeft } from 'lucide-react';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ProjectSubcontractorAssignmentForm } from '@/components/projects/project-subcontractor-assignment-form';

export const dynamic = 'force-dynamic';

export default async function ProjectSubcontractorNewPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as any)?.companyId ?? '';

  const [project, existingSubcontractors, phases] = await Promise.all([
    prisma.project.findFirst({ where: { id: params.id, companyId }, select: { id: true, name: true } }),
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

  if (!project) notFound();

  return (
    <div className="p-5 max-w-5xl mx-auto space-y-4">
      <Link href={`/projects/${project.id}/subcontractors`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to Project Subcontractors
      </Link>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Assign Subcontractor To Project</CardTitle>
          <CardDescription>Create or select a company subcontractor, set project contract terms, and attach agreement or measurement documents for {project.name}.</CardDescription>
        </CardHeader>
        <CardContent>
          <ProjectSubcontractorAssignmentForm projectId={project.id} existingSubcontractors={existingSubcontractors} phases={phases} />
        </CardContent>
      </Card>
    </div>
  );
}

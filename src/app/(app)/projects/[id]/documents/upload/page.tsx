import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { ArrowLeft } from 'lucide-react';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DocumentUploadForm } from '@/components/projects/document-upload-form';

export const dynamic = 'force-dynamic';

export default async function ProjectDocumentUploadPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: {
    buyerId?: string;
    unitId?: string;
    phaseId?: string;
    expenseId?: string;
    payableId?: string;
    projectSupplierId?: string;
    projectSubcontractorId?: string;
    scope?: string;
    category?: string;
    returnTo?: string;
  };
}) {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as any)?.companyId ?? '';
  const project = await prisma.project.findFirst({
    where: { id: params.id, companyId },
    select: { id: true, name: true },
  });
  if (!project) notFound();

  const [buyers, units, phases] = await Promise.all([
    prisma.projectBuyer.findMany({
      where: { projectId: project.id },
      include: { buyer: { select: { id: true, name: true, phone: true } } },
      orderBy: { joinedAt: 'asc' },
    }),
    prisma.unit.findMany({
      where: { projectId: project.id },
      select: { id: true, unitNo: true, floor: true },
      orderBy: [{ floor: 'asc' }, { unitNo: 'asc' }],
    }),
    prisma.phase.findMany({
      where: { projectId: project.id },
      select: { id: true, name: true, sequence: true },
      orderBy: { sequence: 'asc' },
    }),
  ]);

  return (
    <div className="p-5 max-w-5xl mx-auto space-y-4">
      <Link href={`/projects/${project.id}/documents`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to Documents
      </Link>
      <Card>
        <CardHeader>
          <CardTitle>Upload Document</CardTitle>
          <CardDescription>Attach PDF/images to project, buyer, unit, phase, expense, supplier bill, subcontractor bill, or audit scope.</CardDescription>
        </CardHeader>
        <CardContent>
          <DocumentUploadForm
            projectId={project.id}
            initialBuyerId={searchParams?.buyerId}
            initialUnitId={searchParams?.unitId}
            initialPhaseId={searchParams?.phaseId}
            initialExpenseId={searchParams?.expenseId}
            initialPayableId={searchParams?.payableId}
            initialProjectSupplierId={searchParams?.projectSupplierId}
            initialProjectSubcontractorId={searchParams?.projectSubcontractorId}
            initialScope={searchParams?.scope}
            initialCategory={searchParams?.category}
            returnTo={searchParams?.returnTo}
            buyers={buyers.map(({ buyer }) => ({ id: buyer.id, label: `${buyer.name}${buyer.phone ? ` - ${buyer.phone}` : ''}` }))}
            units={units.map((unit) => ({ id: unit.id, label: `Unit ${unit.unitNo}${unit.floor != null ? ` - Floor ${unit.floor}` : ''}` }))}
            phases={phases.map((phase) => ({ id: phase.id, label: phase.name }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { ArrowLeft } from 'lucide-react';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DemandForm } from '@/components/projects/demand-form';

export const dynamic = 'force-dynamic';

export default async function NewProjectDemandPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as any)?.companyId ?? '';
  const project = await prisma.project.findFirst({ where: { id: params.id, companyId }, select: { id: true, name: true } });
  if (!project) notFound();

  const [phases, allocations] = await Promise.all([
    prisma.phase.findMany({ where: { projectId: project.id }, select: { id: true, name: true, sequence: true }, orderBy: { sequence: 'asc' } }),
    prisma.unitBuyer.findMany({
      where: { unit: { projectId: project.id }, relationship: { not: 'PAYER_ONLY' } },
      include: { buyer: { select: { name: true } }, unit: { select: { unitNo: true, floor: true } } },
      orderBy: { assignedAt: 'asc' },
    }),
  ]);

  return (
    <div className="p-5 max-w-5xl mx-auto space-y-4">
      <Link href={`/projects/${project.id}/demands`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to Demands
      </Link>
      <Card>
        <CardHeader>
          <CardTitle>Create Demand</CardTitle>
          <CardDescription>Issue equal project-scoped demand records to selected buyer/unit ownership rows.</CardDescription>
        </CardHeader>
        <CardContent>
          <DemandForm
            projectId={project.id}
            phases={phases.map((phase) => ({ id: phase.id, label: phase.name }))}
            allocations={allocations.map((allocation) => ({
              id: allocation.id,
              label: `${allocation.buyer.name} · Unit ${allocation.unit.unitNo}${allocation.unit.floor != null ? ` · Floor ${allocation.unit.floor}` : ''} · ${Number(allocation.sharePercent)}%`,
            }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}

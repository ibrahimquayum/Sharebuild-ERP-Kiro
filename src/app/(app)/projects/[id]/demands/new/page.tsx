import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getScopedProject } from '@/lib/access-control';
import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DemandForm } from '@/components/projects/demand-form';

export const dynamic = 'force-dynamic';

export default async function NewProjectDemandPage({ params }: { params: { id: string } }) {
  const { project } = await getScopedProject(params.id, 'demands', 'create');

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
      <div className="flex items-center justify-between">
        <Link href={`/projects/${project.id}/demands`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to Demands
        </Link>
        <Link href={`/projects/${project.id}/demands/batches`} className="text-xs text-primary hover:underline">
          Use demand batch for phase billing
        </Link>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Create Demand</CardTitle>
          <CardDescription>Issue equal project-scoped demand records to selected buyer/unit ownership rows. For phase billing with service charge, use Demand Batch.</CardDescription>
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

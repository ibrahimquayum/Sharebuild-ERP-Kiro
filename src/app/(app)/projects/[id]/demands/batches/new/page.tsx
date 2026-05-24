import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getScopedProject } from '@/lib/access-control';
import { prisma } from '@/lib/prisma';
import { DemandBatchForm } from '@/components/projects/demand-batch-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

export default async function DemandBatchNewPage({ params }: { params: { id: string } }) {
  const { project } = await getScopedProject(params.id, 'demands', 'create');

  const [phases, serviceChargeEntries] = await Promise.all([
    prisma.phase.findMany({
      where: { projectId: project.id, status: { notIn: ['CANCELLED', 'DUPLICATE'] } },
      orderBy: { sequence: 'asc' },
      select: { id: true, name: true, serviceChargePct: true },
    }),
    prisma.serviceChargeEntry.findMany({
      where: { projectId: project.id, status: 'APPROVED', reversedAt: null },
      include: { phase: { select: { name: true } } },
      orderBy: [{ phaseId: 'asc' }, { updatedAt: 'desc' }],
    }),
  ]);

  return (
    <div className="p-5 max-w-5xl mx-auto space-y-4">
      <Link href={`/projects/${project.id}/demands/batches`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to Demand Batches
      </Link>
      <Card>
        <CardHeader>
          <CardTitle>Issue Demand Batch</CardTitle>
          <CardDescription>Distribute base construction cost, service charge, adjustment, and carry-forward into project-scoped buyer demands.</CardDescription>
        </CardHeader>
        <CardContent>
          <DemandBatchForm
            projectId={project.id}
            phases={phases.map((phase) => ({ id: phase.id, name: phase.name, serviceChargePct: Number(phase.serviceChargePct ?? 0) }))}
            serviceChargeEntries={serviceChargeEntries.map((entry) => ({
              id: entry.id,
              phaseId: entry.phaseId,
              label: `${entry.phase?.name ?? 'Project-wide'} - ${Number(entry.serviceChargeAmount).toFixed(2)}`,
              amount: Number(entry.serviceChargeAmount),
              settlementStatus: entry.settlementStatus,
            }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}

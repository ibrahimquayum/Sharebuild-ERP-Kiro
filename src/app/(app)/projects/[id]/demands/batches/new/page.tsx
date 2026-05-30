import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getScopedProject } from '@/lib/access-control';
import { prisma } from '@/lib/prisma';
import { DemandBatchForm } from '@/components/projects/demand-batch-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getEffectiveServiceChargePercent, parseServiceChargePercentSetting } from '@/lib/service-charge';

export const dynamic = 'force-dynamic';

export default async function DemandBatchNewPage({ params }: { params: { id: string } }) {
  const { context, project } = await getScopedProject(params.id, 'demands', 'create');

  const [phases, companySetting] = await Promise.all([
    prisma.phase.findMany({
      where: { projectId: project.id, status: { notIn: ['CANCELLED', 'DUPLICATE'] } },
      orderBy: { sequence: 'asc' },
      select: { id: true, name: true, serviceChargePct: true },
    }),
    prisma.companySetting.findUnique({
      where: {
        companyId_key: {
          companyId: context.companyId,
          key: 'defaultServiceChargePct',
        },
      },
      select: { value: true },
    }),
  ]);
  const companyDefaultPct = parseServiceChargePercentSetting(companySetting?.value);

  return (
    <div className="p-5 max-w-5xl mx-auto space-y-4">
      <Link href={`/projects/${project.id}/demands/batches`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to Demand Batches
      </Link>
      <Card>
        <CardHeader>
          <CardTitle>Issue Demand Batch</CardTitle>
          <CardDescription>Distribute base construction cost, adjustment, and carry-forward into project-scoped buyer demands. Service charge is added automatically at the effective rate.</CardDescription>
        </CardHeader>
        <CardContent>
          <DemandBatchForm
            projectId={project.id}
            phases={phases.map((phase) => ({
              id: phase.id,
              name: phase.name,
              serviceChargePct: getEffectiveServiceChargePercent({
                companyDefaultPct: companyDefaultPct ?? undefined,
                projectDefaultPct: project.defaultServiceChargePct,
                phaseOverridePct: phase.serviceChargePct,
              }),
            }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}

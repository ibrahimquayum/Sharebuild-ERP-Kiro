import Link from 'next/link';
import { getScopedProject } from '@/lib/access-control';
import { prisma } from '@/lib/prisma';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatBDT, formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function DemandBatchesPage({ params }: { params: { id: string } }) {
  const { project } = await getScopedProject(params.id, 'demands', 'view');

  const batches = await prisma.demandBatch.findMany({
    where: { projectId: project.id },
    include: {
      phase: { select: { name: true } },
      serviceChargeEntry: { select: { id: true } },
      demands: { select: { id: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="p-5 space-y-5">
      <PageHeader
        title="Demand Batches"
        subtitle={`${project.name} - phase billing batches with service charge alignment`}
        action={{ label: 'New Demand Batch', href: `/projects/${project.id}/demands/batches/new` }}
      />

      <div className="flex gap-3">
        <Button asChild variant="outline">
          <Link href={`/projects/${project.id}/demands`}>Demand Notices</Link>
        </Button>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                {['Batch', 'Phase', 'Basis', 'Base', 'Service Charge', 'Total Billable', 'Due Date', 'Status', 'Actions'].map((heading) => (
                  <th key={heading} className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {batches.map((batch) => (
                <tr key={batch.id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-medium">
                    <div>{batch.title}</div>
                    <div className="text-xs text-muted-foreground">{batch.batchNo ?? batch.id}</div>
                  </td>
                  <td className="px-4 py-3">{batch.phase.name}</td>
                  <td className="px-4 py-3">{batch.basisType.replaceAll('_', ' ')}</td>
                  <td className="px-4 py-3">{formatBDT(Number(batch.baseAmount))}</td>
                  <td className="px-4 py-3">{formatBDT(Number(batch.serviceChargeAmount))}</td>
                  <td className="px-4 py-3 font-medium">{formatBDT(Number(batch.totalBillableAmount))}</td>
                  <td className="px-4 py-3">{formatDate(batch.dueDate)}</td>
                  <td className="px-4 py-3">{batch.status}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/projects/${project.id}/demands/batches/${batch.id}`}>View</Link>
                      </Button>
                      <Button asChild size="sm">
                        <Link href={`/projects/${project.id}/demands/batches/${batch.id}/print`}>Print</Link>
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {batches.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-muted-foreground">
                    No demand batches yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

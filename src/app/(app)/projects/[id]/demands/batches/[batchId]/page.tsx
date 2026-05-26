import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getScopedProject } from '@/lib/access-control';
import { prisma } from '@/lib/prisma';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatBDT, formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function DemandBatchDetailPage({
  params,
}: {
  params: { id: string; batchId: string };
}) {
  const { project } = await getScopedProject(params.id, 'demands', 'view');

  const batch = await prisma.demandBatch.findFirst({
    where: { id: params.batchId, projectId: project.id },
    include: {
      phase: { select: { name: true } },
      serviceChargeEntry: { select: { id: true, status: true, percentage: true } },
      demands: {
        include: {
          buyer: { select: { name: true } },
          unit: { select: { unitNo: true } },
        },
        orderBy: [{ buyer: { name: 'asc' } }, { unit: { unitNo: 'asc' } }],
      },
    },
  });
  if (!batch) notFound();
  const serviceChargePercent =
    Number(batch.serviceChargeEntry?.percentage ?? 0) > 0
      ? Number(batch.serviceChargeEntry?.percentage ?? 0)
      : Number(batch.baseAmount) > 0
        ? Number(((Number(batch.serviceChargeAmount) / Number(batch.baseAmount)) * 100).toFixed(2))
        : 0;

  return (
    <div className="p-5 space-y-5">
      <PageHeader
        title={batch.title}
        subtitle={`${project.name} - demand batch ${batch.batchNo ?? batch.id}`}
        action={{ label: 'Print Notice', href: `/projects/${project.id}/demands/batches/${batch.id}/print` }}
      />

      <div className="flex gap-3">
        <Button asChild variant="outline">
          <Link href={`/projects/${project.id}/demands/batches`}>All Batches</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={`/projects/${project.id}/demands`}>Demand List</Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Base Amount</div><div className="mt-1 text-lg font-bold">{formatBDT(Number(batch.baseAmount))}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Service Charge</div><div className="mt-1 text-lg font-bold">{formatBDT(Number(batch.serviceChargeAmount))}</div><div className="mt-1 text-xs text-muted-foreground">{serviceChargePercent.toFixed(2)}%</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Total Billable</div><div className="mt-1 text-lg font-bold">{formatBDT(Number(batch.totalBillableAmount))}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Demand Rows</div><div className="mt-1 text-lg font-bold">{batch.demands.length}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Batch Details</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div><span className="font-medium">Phase:</span> {batch.phase.name}</div>
          <div><span className="font-medium">Basis:</span> {batch.basisType.replaceAll('_', ' ')}</div>
          <div><span className="font-medium">Adjustment:</span> {formatBDT(Number(batch.adjustmentAmount))}</div>
          <div><span className="font-medium">Carry Forward:</span> {formatBDT(Number(batch.carryForwardAmount))}</div>
          <div><span className="font-medium">Service Charge %:</span> {serviceChargePercent.toFixed(2)}%</div>
          <div><span className="font-medium">Due Date:</span> {formatDate(batch.dueDate)}</div>
          <div><span className="font-medium">Status:</span> {batch.status}</div>
          <div><span className="font-medium">Service Charge Source:</span> {batch.serviceChargeEntry ? `Linked (${batch.serviceChargeEntry.status})` : 'Manual / none'}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Issued Demand Rows</CardTitle></CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                {['Buyer', 'Unit', 'Base', 'Service Charge', 'Adjustment', 'Carry Forward', 'Total'].map((heading) => (
                  <th key={heading} className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {batch.demands.map((demand) => (
                <tr key={demand.id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-medium">{demand.buyer.name}</td>
                  <td className="px-4 py-3">{demand.unit.unitNo}</td>
                  <td className="px-4 py-3">{formatBDT(Number(demand.baseAmount))}</td>
                  <td className="px-4 py-3">{formatBDT(Number(demand.serviceChargeAmount))}</td>
                  <td className="px-4 py-3">{formatBDT(Number(demand.adjustmentAmount))}</td>
                  <td className="px-4 py-3">{formatBDT(Number(demand.carryForwardAmount))}</td>
                  <td className="px-4 py-3 font-medium">{formatBDT(Number(demand.amount))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

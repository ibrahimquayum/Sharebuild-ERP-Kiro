import { notFound } from 'next/navigation';
import { getProjectReportContext } from '@/lib/project-report-page';
import { prisma } from '@/lib/prisma';
import { ReportActions } from '@/components/shared/report-actions';
import { ReportHeader } from '@/components/shared/report-header';
import { ReportFooter } from '@/components/shared/report-footer';
import { formatBDT, formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function DemandBatchPrintPage({
  params,
}: {
  params: { id: string; batchId: string };
}) {
  const { project, branding } = await getProjectReportContext(params.id);

  const batch = await prisma.demandBatch.findFirst({
    where: { id: params.batchId, projectId: project.id },
    include: {
      phase: { select: { name: true } },
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

  return (
    <div className="p-5 space-y-6 print:p-0">
      <div className="flex justify-end">
        <ReportActions pdfReady />
      </div>
      <ReportHeader
        branding={branding}
        project={project}
        title="Demand Notice Batch"
        subtitle={`${batch.title} · ${batch.phase.name} · ${batch.batchNo ?? batch.id}`}
      />

      <section className="rounded-md border p-4 text-sm space-y-2 print:break-inside-avoid">
        <div className="flex justify-between"><span className="text-muted-foreground">Due Date</span><span>{formatDate(batch.dueDate)}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Base Construction Cost</span><span>{formatBDT(Number(batch.baseAmount))}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Service Charge</span><span>{formatBDT(Number(batch.serviceChargeAmount))}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Adjustment</span><span>{formatBDT(Number(batch.adjustmentAmount))}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Carry Forward</span><span>{formatBDT(Number(batch.carryForwardAmount))}</span></div>
        <div className="flex justify-between border-t pt-2 font-semibold"><span>Total Billable</span><span>{formatBDT(Number(batch.totalBillableAmount))}</span></div>
      </section>

      <section className="rounded-md border overflow-hidden print:break-inside-avoid">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              {['Buyer', 'Unit', 'Base Cost', 'Service Charge', 'Adjustment', 'Carry Forward', 'Amount Payable'].map((heading) => (
                <th key={heading} className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">{heading}</th>
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
                <td className="px-4 py-3 font-semibold">{formatBDT(Number(demand.amount))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="space-y-4">
        {batch.demands.map((demand) => (
          <article key={demand.id} className="rounded-md border p-5 text-sm print:break-before-page print:rounded-none print:border-black">
            <div className="mb-4 flex items-start justify-between gap-4 border-b pb-3">
              <div>
                <h2 className="text-lg font-bold">Demand Notice / Bill</h2>
                <p className="text-muted-foreground">{batch.batchNo ?? batch.id} · {batch.phase.name}</p>
              </div>
              <div className="text-right text-xs">
                <div className="font-semibold">{branding.name}</div>
                {branding.address ? <div>{branding.address}</div> : null}
                {branding.phone ? <div>{branding.phone}</div> : null}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><span className="text-muted-foreground">Project</span><div className="font-medium">{project.name}</div></div>
              <div><span className="text-muted-foreground">Buyer</span><div className="font-medium">{demand.buyer.name}</div></div>
              <div><span className="text-muted-foreground">Unit</span><div className="font-medium">{demand.unit.unitNo}</div></div>
              <div><span className="text-muted-foreground">Due Date</span><div className="font-medium">{formatDate(demand.dueDate)}</div></div>
            </div>
            <table className="mt-5 w-full text-sm">
              <tbody>
                <tr className="border-b"><td className="py-2">Base phase cost portion</td><td className="py-2 text-right">{formatBDT(Number(demand.baseAmount))}</td></tr>
                <tr className="border-b"><td className="py-2">Service charge portion</td><td className="py-2 text-right">{formatBDT(Number(demand.serviceChargeAmount))}</td></tr>
                <tr className="border-b"><td className="py-2">Adjustment</td><td className="py-2 text-right">{formatBDT(Number(demand.adjustmentAmount))}</td></tr>
                <tr className="border-b"><td className="py-2">Carry-forward / previous balance included</td><td className="py-2 text-right">{formatBDT(Number(demand.carryForwardAmount))}</td></tr>
                <tr className="font-bold"><td className="py-3">Amount payable</td><td className="py-3 text-right">{formatBDT(Number(demand.amount))}</td></tr>
              </tbody>
            </table>
            <div className="mt-5 rounded border bg-muted/30 p-3 text-xs print:bg-white">
              Please pay by the due date using the approved company cash/bank channel and mention the buyer name, unit, and demand reference.
            </div>
            <div className="mt-12 grid grid-cols-2 gap-8 text-center">
              <div className="border-t pt-2">Received by</div>
              <div className="border-t pt-2">Authorized signature</div>
            </div>
          </article>
        ))}
      </section>

      <section className="grid grid-cols-2 gap-6 pt-8 text-center text-sm">
        <div className="border-t pt-2">Prepared by</div>
        <div className="border-t pt-2">Authorized signature</div>
      </section>

      <ReportFooter note={branding.reportFooterNote} />
    </div>
  );
}

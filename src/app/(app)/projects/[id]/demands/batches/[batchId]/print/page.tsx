import { notFound } from 'next/navigation';

import {
  ReportDocumentLayout,
  ReportKpiCard,
  ReportPageBreak,
  ReportSection,
  ReportSignatureBlock,
  ReportSummaryGrid,
  ReportTable,
} from '@/components/reports/report-document';
import { getProjectReportContext } from '@/lib/project-report-page';
import { prisma } from '@/lib/prisma';
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
          buyer: { select: { id: true, name: true, phone: true } },
          unit: { select: { id: true, unitNo: true } },
        },
        orderBy: [{ buyer: { name: 'asc' } }, { unit: { unitNo: 'asc' } }],
      },
    },
  });
  if (!batch) notFound();

  const ownershipRows = await prisma.unitBuyer.findMany({
    where: {
      unitId: { in: batch.demands.map((demand) => demand.unitId) },
      buyerId: { in: batch.demands.map((demand) => demand.buyerId) },
    },
    select: {
      unitId: true,
      buyerId: true,
      sharePercent: true,
      isPayer: true,
    },
  });

  const ownershipMap = new Map(
    ownershipRows.map((row) => [`${row.unitId}:${row.buyerId}`, { sharePercent: Number(row.sharePercent), isPayer: row.isPayer }] as const),
  );

  return (
    <ReportDocumentLayout
      branding={branding}
      project={project}
      title="Demand Notice / Bill Batch"
      subtitle={`${batch.title} | ${batch.phase.name} | ${batch.batchNo ?? batch.id}`}
      generatedAt={new Date()}
      backHref={`/projects/${project.id}/demands/batches`}
      backLabel="Back to Demand Batches"
    >
      <ReportSummaryGrid>
        <ReportKpiCard label="Due Date" value={formatDate(batch.dueDate)} />
        <ReportKpiCard label="Base Phase Cost" value={formatBDT(Number(batch.baseAmount))} tone="negative" />
        <ReportKpiCard label="Service Charge" value={formatBDT(Number(batch.serviceChargeAmount))} tone="info" />
        <ReportKpiCard label="Total Billable" value={formatBDT(Number(batch.totalBillableAmount))} tone="warning" />
      </ReportSummaryGrid>

      <ReportSection title="Batch Summary" description="Phase billing summary for the issued demand batch.">
        <ReportTable dense>
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <th className="px-3 py-3">Buyer</th>
              <th className="px-3 py-3">Unit</th>
              <th className="px-3 py-3 text-right">Base Cost</th>
              <th className="px-3 py-3 text-right">Service Charge</th>
              <th className="px-3 py-3 text-right">Adjustment</th>
              <th className="px-3 py-3 text-right">Carry Forward</th>
              <th className="px-3 py-3 text-right">Amount Payable</th>
            </tr>
          </thead>
          <tbody>
            {batch.demands.map((demand) => (
              <tr key={demand.id} className="border-b border-slate-200">
                <td className="px-3 py-3 font-medium text-slate-900">{demand.buyer.name}</td>
                <td className="px-3 py-3 text-slate-700">{demand.unit.unitNo}</td>
                <td className="px-3 py-3 text-right text-rose-700">{formatBDT(Number(demand.baseAmount))}</td>
                <td className="px-3 py-3 text-right text-sky-700">{formatBDT(Number(demand.serviceChargeAmount))}</td>
                <td className="px-3 py-3 text-right text-slate-700">{formatBDT(Number(demand.adjustmentAmount))}</td>
                <td className="px-3 py-3 text-right text-amber-700">{formatBDT(Number(demand.carryForwardAmount))}</td>
                <td className="px-3 py-3 text-right font-semibold text-slate-900">{formatBDT(Number(demand.amount))}</td>
              </tr>
            ))}
          </tbody>
        </ReportTable>
      </ReportSection>

      {batch.demands.map((demand, index) => {
        const ownership = ownershipMap.get(`${demand.unitId}:${demand.buyerId}`);
        return (
          <section key={demand.id} className="report-avoid-break rounded-2xl border border-slate-200 p-6 shadow-sm print:rounded-none print:border print:shadow-none">
            {index > 0 ? <ReportPageBreak /> : null}
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Demand Notice / Bill</div>
                <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">{batch.title}</h2>
                <div className="mt-2 text-sm text-slate-600">
                  Demand no: {demand.demandNo ?? batch.batchNo ?? demand.id} | Phase: {batch.phase.name}
                </div>
              </div>
              <div className="text-right text-sm text-slate-600">
                <div className="font-semibold text-slate-900">{branding.name}</div>
                {branding.address ? <div>{branding.address}</div> : null}
                {branding.phone ? <div>{branding.phone}</div> : null}
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Buyer Information</div>
                <div className="mt-3 space-y-2 text-sm text-slate-700">
                  <div><span className="font-medium text-slate-900">Buyer:</span> {demand.buyer.name}</div>
                  <div><span className="font-medium text-slate-900">Phone:</span> {demand.buyer.phone || '-'}</div>
                  <div><span className="font-medium text-slate-900">Unit:</span> {demand.unit.unitNo}</div>
                  <div><span className="font-medium text-slate-900">Ownership share:</span> {ownership ? `${ownership.sharePercent.toFixed(2)}%` : 'Not recorded'}</div>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Billing Information</div>
                <div className="mt-3 space-y-2 text-sm text-slate-700">
                  <div><span className="font-medium text-slate-900">Project:</span> {project.name}</div>
                  <div><span className="font-medium text-slate-900">Phase:</span> {batch.phase.name}</div>
                  <div><span className="font-medium text-slate-900">Due date:</span> {formatDate(demand.dueDate)}</div>
                  <div><span className="font-medium text-slate-900">Notes:</span> {batch.notes || 'Please mention demand reference while paying.'}</div>
                </div>
              </div>
            </div>

            <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3">Component</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-200">
                    <td className="px-4 py-3 text-slate-700">Base phase cost portion</td>
                    <td className="px-4 py-3 text-right text-rose-700">{formatBDT(Number(demand.baseAmount))}</td>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <td className="px-4 py-3 text-slate-700">Service charge portion</td>
                    <td className="px-4 py-3 text-right text-sky-700">{formatBDT(Number(demand.serviceChargeAmount))}</td>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <td className="px-4 py-3 text-slate-700">Adjustment</td>
                    <td className="px-4 py-3 text-right">{formatBDT(Number(demand.adjustmentAmount))}</td>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <td className="px-4 py-3 text-slate-700">Previous due / carry-forward</td>
                    <td className="px-4 py-3 text-right text-amber-700">{formatBDT(Number(demand.carryForwardAmount))}</td>
                  </tr>
                  <tr className="bg-slate-50">
                    <td className="px-4 py-4 font-semibold text-slate-900">Total payable</td>
                    <td className="px-4 py-4 text-right text-lg font-semibold text-slate-950">{formatBDT(Number(demand.amount))}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-700">
              <div className="font-medium text-slate-900">Payment instruction</div>
              Please pay within the due date through the approved company cash or bank channel and mention the buyer name, unit number, and demand reference.
            </div>

            <div className="mt-8">
              <ReportSignatureBlock labels={['Received by', 'Accounts officer', 'Authorized signature']} />
            </div>
          </section>
        );
      })}
    </ReportDocumentLayout>
  );
}

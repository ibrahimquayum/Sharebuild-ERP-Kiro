import { notFound } from 'next/navigation';

import {
  ReportDocumentLayout,
  ReportKpiCard,
  ReportNoteBox,
  ReportSection,
  ReportStatusBadge,
  ReportSummaryGrid,
  ReportTable,
} from '@/components/reports/report-document';
import { getScopedProject } from '@/lib/access-control';
import { getCompleteProjectReportData } from '@/lib/complete-project-report';
import { formatBDT, formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function CollectionReportPage({ params }: { params: { id: string } }) {
  const { context } = await getScopedProject(params.id, 'reports', 'view');
  const data = await getCompleteProjectReportData(context.companyId, params.id);
  if (!data) notFound();

  return (
    <ReportDocumentLayout
      branding={data.branding}
      project={data.project}
      title="Collection Report"
      subtitle="Buyer receipt register with allocation visibility, payment method, and demand linkage."
      generatedAt={data.generatedAt}
      backHref={`/projects/${data.project.id}/reports`}
    >
      <ReportSummaryGrid>
        <ReportKpiCard label="Collections" value={String(data.collections.length)} />
        <ReportKpiCard label="Historical Collection" value={formatBDT(data.summary.totalCollected)} tone="positive" />
        <ReportKpiCard label="Allocated" value={formatBDT(data.summary.allocatedCollection)} tone="positive" />
        <ReportKpiCard label="Unallocated" value={formatBDT(data.summary.unallocatedCollection)} tone={data.summary.unallocatedCollection > 0 ? 'warning' : 'default'} />
      </ReportSummaryGrid>

      {data.summary.historicalCollectionsWithoutDemand ? (
        <ReportNoteBox title="Historical import note" tone="info">
          Collection rows exist, but no demand rows were issued in the system for the historical seed. Receipts therefore remain unallocated until demand history or reconciliation demand exists.
        </ReportNoteBox>
      ) : null}

      <ReportSection title="Collection Register" description="Approved collection records with buyer, phase, receipt channel, and allocation state.">
        <ReportTable dense>
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <th className="px-3 py-3">Date</th>
              <th className="px-3 py-3">Receipt</th>
              <th className="px-3 py-3">Buyer</th>
              <th className="px-3 py-3">Phase</th>
              <th className="px-3 py-3">Method</th>
              <th className="px-3 py-3">Account</th>
              <th className="px-3 py-3 text-right">Amount</th>
              <th className="px-3 py-3 text-right">Allocated</th>
              <th className="px-3 py-3 text-right">Unallocated</th>
              <th className="px-3 py-3">Demand Link</th>
            </tr>
          </thead>
          <tbody>
            {data.collections.map((row) => (
              <tr key={row.id} className="border-b border-slate-200">
                <td className="px-3 py-3 text-slate-700">{formatDate(row.receivedDate)}</td>
                <td className="px-3 py-3 font-medium text-slate-900">{row.receiptNo ?? row.reference ?? 'Collection'}</td>
                <td className="px-3 py-3 text-slate-700">{row.buyer.name}</td>
                <td className="px-3 py-3 text-slate-700">{row.phase.name}</td>
                <td className="px-3 py-3 text-slate-700">{row.paymentMethod.replaceAll('_', ' ')}</td>
                <td className="px-3 py-3 text-slate-700">{row.account?.name ?? '-'}</td>
                <td className="px-3 py-3 text-right text-emerald-700">{formatBDT(Number(row.amount))}</td>
                <td className="px-3 py-3 text-right text-emerald-700">{formatBDT(row.allocatedAmount)}</td>
                <td className="px-3 py-3 text-right text-amber-700">{formatBDT(row.unallocatedAmount)}</td>
                <td className="px-3 py-3">
                  {row.demand ? (
                    <ReportStatusBadge label={row.demand.demandType === 'FINAL_RECONCILIATION' ? 'Final reconciliation' : 'Demand linked'} tone="positive" />
                  ) : row.allocations.length > 0 ? (
                    <ReportStatusBadge label="Allocated" tone="positive" />
                  ) : (
                    <ReportStatusBadge label="No demand link" tone="warning" />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </ReportTable>
      </ReportSection>
    </ReportDocumentLayout>
  );
}

import { notFound } from 'next/navigation';

import {
  ReportDocumentLayout,
  ReportKpiCard,
  ReportNoteBox,
  ReportSection,
  ReportSummaryGrid,
  ReportTable,
} from '@/components/reports/report-document';
import { getScopedProject } from '@/lib/access-control';
import { getCompleteProjectReportData } from '@/lib/complete-project-report';
import { formatBDT } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function DueReportPage({ params }: { params: { id: string } }) {
  const { context } = await getScopedProject(params.id, 'reports', 'view');
  const data = await getCompleteProjectReportData(context.companyId, params.id);
  if (!data) notFound();

  return (
    <ReportDocumentLayout
      branding={data.branding}
      project={data.project}
      title="Due Report"
      subtitle="Buyer-level due, advance, and unallocated collection status for the project."
      generatedAt={data.generatedAt}
      backHref={`/projects/${data.project.id}/reports`}
    >
      <ReportSummaryGrid>
        <ReportKpiCard label="Buyer Due" value={formatBDT(data.summary.buyerReceivable)} tone={data.summary.buyerReceivable > 0 ? 'negative' : 'default'} />
        <ReportKpiCard label="Advance / Credit" value={formatBDT(data.summary.buyerAdvance)} tone={data.summary.buyerAdvance > 0 ? 'warning' : 'default'} />
        <ReportKpiCard label="Allocated Collection" value={formatBDT(data.summary.allocatedCollection)} tone="positive" />
        <ReportKpiCard label="Unallocated Collection" value={formatBDT(data.summary.unallocatedCollection)} tone={data.summary.unallocatedCollection > 0 ? 'warning' : 'default'} />
      </ReportSummaryGrid>

      {data.summary.historicalCollectionsWithoutDemand ? (
        <ReportNoteBox title="Why due may look unusual" tone="info">
          Relax Tower historical collections were imported without matching demand rows. This report therefore separates unallocated collection from true issued-demand due.
        </ReportNoteBox>
      ) : null}

      <ReportSection title="Buyer Due Summary" description="Issued demand, collection, allocation, due, and advance position by buyer.">
        <ReportTable dense>
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <th className="px-3 py-3">Buyer</th>
              <th className="px-3 py-3">Units</th>
              <th className="px-3 py-3 text-right">Issued Demand</th>
              <th className="px-3 py-3 text-right">Final Reconciliation</th>
              <th className="px-3 py-3 text-right">Collection</th>
              <th className="px-3 py-3 text-right">Allocated</th>
              <th className="px-3 py-3 text-right">Due</th>
              <th className="px-3 py-3 text-right">Advance</th>
            </tr>
          </thead>
          <tbody>
            {data.buyerBillingSummary.map((row) => (
              <tr key={row.buyerId} className="border-b border-slate-200">
                <td className="px-3 py-3 font-medium text-slate-900">{row.buyerName}</td>
                <td className="px-3 py-3 text-slate-700">{row.unitsText || '-'}</td>
                <td className="px-3 py-3 text-right text-slate-700">{formatBDT(row.regularDemanded)}</td>
                <td className="px-3 py-3 text-right text-slate-700">{formatBDT(row.finalReconciliationDemand)}</td>
                <td className="px-3 py-3 text-right text-emerald-700">{formatBDT(row.collected)}</td>
                <td className="px-3 py-3 text-right text-emerald-700">{formatBDT(row.allocated)}</td>
                <td className="px-3 py-3 text-right text-rose-700">{formatBDT(row.due)}</td>
                <td className="px-3 py-3 text-right text-amber-700">{formatBDT(row.advance)}</td>
              </tr>
            ))}
          </tbody>
        </ReportTable>
      </ReportSection>
    </ReportDocumentLayout>
  );
}

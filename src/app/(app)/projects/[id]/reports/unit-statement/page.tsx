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
import { formatBDT } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function UnitStatementPage({ params }: { params: { id: string } }) {
  const { context } = await getScopedProject(params.id, 'reports', 'view');
  const data = await getCompleteProjectReportData(context.companyId, params.id);
  if (!data) notFound();

  return (
    <ReportDocumentLayout
      branding={data.branding}
      project={data.project}
      title="Unit Statement"
      subtitle="Unit-wise ownership, demand, collection, due, and document visibility for the project."
      generatedAt={data.generatedAt}
      backHref={`/projects/${data.project.id}/reports`}
    >
      <ReportSummaryGrid>
        <ReportKpiCard label="Units" value={String(data.unitSummary.length)} />
        <ReportKpiCard label="Demanded by Unit" value={formatBDT(data.unitSummary.reduce((sum, row) => sum + row.issuedDemand + row.finalReconciliationDemand, 0))} tone="info" />
        <ReportKpiCard label="Collected by Unit Demand Link" value={formatBDT(data.unitSummary.reduce((sum, row) => sum + row.collected, 0))} tone="positive" />
        <ReportKpiCard label="Unit Due" value={formatBDT(data.unitSummary.reduce((sum, row) => sum + row.due, 0))} tone="negative" />
      </ReportSummaryGrid>

      {data.summary.historicalCollectionsWithoutDemand ? (
        <ReportNoteBox title="Interpretation note" tone="info">
          Many Relax Tower collections exist only at buyer/project level from historical import. Unit-level collection therefore reflects only demand-linked transactions where they exist.
        </ReportNoteBox>
      ) : null}

      <ReportSection title="Unit Statement Register" description="Ownership, agreed value, demand visibility, and due position per unit.">
        <ReportTable dense>
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <th className="px-3 py-3">Unit</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Owners</th>
              <th className="px-3 py-3 text-right">Agreed Price</th>
              <th className="px-3 py-3 text-right">Issued Demand</th>
              <th className="px-3 py-3 text-right">Final Reconciliation</th>
              <th className="px-3 py-3 text-right">Collected</th>
              <th className="px-3 py-3 text-right">Due</th>
              <th className="px-3 py-3 text-right">Docs</th>
            </tr>
          </thead>
          <tbody>
            {data.unitSummary.map((row) => (
              <tr key={row.id} className="border-b border-slate-200">
                <td className="px-3 py-3 font-medium text-slate-900">{row.unitNo}</td>
                <td className="px-3 py-3"><ReportStatusBadge label={row.status.replaceAll('_', ' ')} /></td>
                <td className="px-3 py-3 text-slate-700">{row.ownerText || 'No owner assigned'}</td>
                <td className="px-3 py-3 text-right text-slate-700">{formatBDT(row.agreedPrice)}</td>
                <td className="px-3 py-3 text-right text-slate-700">{formatBDT(row.issuedDemand)}</td>
                <td className="px-3 py-3 text-right text-slate-700">{formatBDT(row.finalReconciliationDemand)}</td>
                <td className="px-3 py-3 text-right text-emerald-700">{formatBDT(row.collected)}</td>
                <td className="px-3 py-3 text-right text-rose-700">{formatBDT(row.due)}</td>
                <td className="px-3 py-3 text-right text-slate-700">{row.documentCount}</td>
              </tr>
            ))}
          </tbody>
        </ReportTable>
      </ReportSection>
    </ReportDocumentLayout>
  );
}

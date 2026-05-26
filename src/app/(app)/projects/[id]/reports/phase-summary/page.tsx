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

export default async function PhaseSummaryPage({ params }: { params: { id: string } }) {
  const { context } = await getScopedProject(params.id, 'reports', 'view');
  const data = await getCompleteProjectReportData(context.companyId, params.id);
  if (!data) notFound();

  return (
    <ReportDocumentLayout
      branding={data.branding}
      project={data.project}
      title="Phase Summary"
      subtitle="Phase-wise collection, demand, cost, service charge, phase balance, and audit status."
      generatedAt={data.generatedAt}
      backHref={`/projects/${data.project.id}/reports`}
    >
      <ReportSummaryGrid>
        <ReportKpiCard label="Phases" value={String(data.phaseSummary.length)} />
        <ReportKpiCard label="Historical Collection" value={formatBDT(data.summary.totalCollected)} tone="positive" />
        <ReportKpiCard label="Issued Demand" value={formatBDT(data.summary.issuedDemand)} tone={data.summary.issuedDemand > 0 ? 'info' : 'warning'} />
        <ReportKpiCard label="Audit Locked" value={String(data.auditSummary.lockedPhases.length)} tone={data.auditSummary.lockedPhases.length > 0 ? 'info' : 'default'} />
      </ReportSummaryGrid>

      {data.summary.historicalCollectionsWithoutDemand ? (
        <ReportNoteBox title="Interpretation note" tone="info">
          Historical collection exists without issued demand rows in the current ledger. Phase collection totals are still preserved, but demand-based buyer due should be interpreted with that limitation in mind.
        </ReportNoteBox>
      ) : null}

      <ReportSection title="Phase Summary Table" description="Phase-level view for management, billing review, and audit lock planning.">
        <ReportTable dense>
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <th className="px-3 py-3">Phase</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3 text-right">Collection</th>
              <th className="px-3 py-3 text-right">Demand</th>
              <th className="px-3 py-3 text-right">Expense</th>
              <th className="px-3 py-3 text-right">Supplier</th>
              <th className="px-3 py-3 text-right">Subcontractor</th>
              <th className="px-3 py-3 text-right">Service Charge</th>
              <th className="px-3 py-3 text-right">Phase Balance</th>
              <th className="px-3 py-3">Audit</th>
            </tr>
          </thead>
          <tbody>
            {data.phaseSummary.map((row) => (
              <tr key={row.phaseId} className="border-b border-slate-200">
                <td className="px-3 py-3 font-medium text-slate-900">{row.phaseName}</td>
                <td className="px-3 py-3"><ReportStatusBadge label={row.status.replaceAll('_', ' ')} /></td>
                <td className="px-3 py-3 text-right text-emerald-700">{formatBDT(row.collection)}</td>
                <td className="px-3 py-3 text-right text-slate-700">{formatBDT(row.demand)}</td>
                <td className="px-3 py-3 text-right text-rose-700">{formatBDT(row.expense)}</td>
                <td className="px-3 py-3 text-right text-rose-700">{formatBDT(row.supplierBill)}</td>
                <td className="px-3 py-3 text-right text-rose-700">{formatBDT(row.subcontractorBill)}</td>
                <td className="px-3 py-3 text-right text-sky-700">{formatBDT(row.serviceCharge)}</td>
                <td className="px-3 py-3 text-right font-medium">{formatBDT(row.phaseBalance)}</td>
                <td className="px-3 py-3">{row.auditLocked ? <ReportStatusBadge label="Locked" tone="positive" /> : <ReportStatusBadge label="Open" tone="warning" />}</td>
              </tr>
            ))}
          </tbody>
        </ReportTable>
      </ReportSection>
    </ReportDocumentLayout>
  );
}

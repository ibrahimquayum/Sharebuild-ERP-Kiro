import {
  ReportDocumentLayout,
  ReportKpiCard,
  ReportNoteBox,
  ReportSection,
  ReportStatusBadge,
  ReportSummaryGrid,
  ReportTable,
} from '@/components/reports/report-document';
import { getProjectReportContext } from '@/lib/project-report-page';
import { getFinalReconciliationPreview } from '@/lib/project-finance';
import { formatBDT } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function FinalReconciliationReportPage({ params }: { params: { id: string } }) {
  const { project, branding } = await getProjectReportContext(params.id);
  const preview = await getFinalReconciliationPreview(project.id);
  if (!preview) return null;

  return (
    <ReportDocumentLayout
      branding={branding}
      project={project}
      title="Final Reconciliation Report"
      subtitle="Ownership-based preview or posted distribution of final surplus / deficit."
      generatedAt={new Date()}
      backHref={`/projects/${project.id}/reports`}
      csvHref={`/api/projects/${project.id}/reports/final-reconciliation/excel`}
    >
      <ReportSummaryGrid>
        <ReportKpiCard label="Project Balance" value={formatBDT(preview.summary.projectBalance)} tone={preview.summary.projectBalance >= 0 ? 'positive' : 'negative'} />
        <ReportKpiCard label="Service Charge" value={formatBDT(preview.summary.serviceChargeAccrued)} tone="info" />
        <ReportKpiCard label="Retention Held" value={formatBDT(preview.summary.retentionHeld)} tone="info" />
        <ReportKpiCard label="Final Result" value={formatBDT(preview.finalSurplusDeficit)} tone={preview.finalSurplusDeficit >= 0 ? 'positive' : 'negative'} />
      </ReportSummaryGrid>

      <ReportNoteBox title="Reconciliation status" tone={preview.posted ? 'info' : 'warning'}>
        {preview.posted
          ? `Posted reconciliation: ${preview.posted.type.replaceAll('_', ' ')} for ${formatBDT(Number(preview.posted.finalAmount))}. Generated demand rows: ${preview.posted.demands.length}.`
          : 'Preview only. Post final reconciliation from the finance page after management review.'}
      </ReportNoteBox>

      <ReportSection title="Buyer Distribution" description="Distribution basis by buyer and ownership share.">
        <ReportTable dense>
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <th className="px-3 py-3">Buyer</th>
              <th className="px-3 py-3">Units</th>
              <th className="px-3 py-3 text-right">Share %</th>
              <th className="px-3 py-3 text-right">{preview.direction === 'SURPLUS' ? 'Refund / Adjust' : 'Collect'}</th>
            </tr>
          </thead>
          <tbody>
            {preview.distribution.map((row) => (
              <tr key={row.buyerId} className="border-b border-slate-200">
                <td className="px-3 py-3 font-medium text-slate-900">{row.buyerName}</td>
                <td className="px-3 py-3 text-slate-700">{row.units}</td>
                <td className="px-3 py-3 text-right text-slate-700">{row.sharePercent.toFixed(2)}%</td>
                <td className="px-3 py-3 text-right text-slate-900">{formatBDT(row.amount)}</td>
              </tr>
            ))}
          </tbody>
        </ReportTable>
      </ReportSection>

      {preview.posted?.lines?.length ? (
        <ReportSection title="Posted Lines" description="Settlement visibility for each posted reconciliation line.">
          <ReportTable dense>
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-3 py-3">Buyer</th>
                <th className="px-3 py-3">Unit</th>
                <th className="px-3 py-3 text-right">Amount</th>
                <th className="px-3 py-3">Settlement</th>
              </tr>
            </thead>
            <tbody>
              {preview.posted.lines.map((line) => (
                <tr key={line.id} className="border-b border-slate-200">
                  <td className="px-3 py-3 font-medium text-slate-900">{line.buyer.name}</td>
                  <td className="px-3 py-3 text-slate-700">{line.unit?.unitNo ?? '-'}</td>
                  <td className="px-3 py-3 text-right text-slate-900">{formatBDT(Number(line.amount))}</td>
                  <td className="px-3 py-3">
                    <ReportStatusBadge label={line.settlementStatus.replaceAll('_', ' ')} />
                    {line.settlementReference ? <div className="mt-1 text-[11px] text-slate-500">{line.settlementReference}</div> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </ReportTable>
        </ReportSection>
      ) : null}
    </ReportDocumentLayout>
  );
}

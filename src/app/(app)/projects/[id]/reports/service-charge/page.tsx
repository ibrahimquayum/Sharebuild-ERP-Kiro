import {
  ReportDocumentLayout,
  ReportKpiCard,
  ReportSection,
  ReportStatusBadge,
  ReportSummaryGrid,
  ReportTable,
} from '@/components/reports/report-document';
import { getProjectReportContext } from '@/lib/project-report-page';
import { getProjectServiceChargeLedger } from '@/lib/project-finance';
import { formatBDT } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function ServiceChargeReportPage({ params }: { params: { id: string } }) {
  const { project, branding } = await getProjectReportContext(params.id);
  const ledger = await getProjectServiceChargeLedger(project.id);

  return (
    <ReportDocumentLayout
      branding={branding}
      project={project}
      title="Service Charge Report"
      subtitle="Service charge calculation, demand billing, collection progress, and any legacy separate settlement history."
      generatedAt={new Date()}
      backHref={`/projects/${project.id}/reports`}
      csvHref={`/api/projects/${project.id}/reports/service-charge/excel`}
    >
      <ReportSummaryGrid>
        <ReportKpiCard label="Calculated" value={formatBDT(ledger?.totals.effectiveTotal ?? 0)} tone="info" />
        <ReportKpiCard label="Billed in Demand" value={formatBDT(ledger?.totals.billedTotal ?? 0)} tone="warning" />
        <ReportKpiCard label="Collected" value={formatBDT(ledger?.totals.collectedTotal ?? 0)} tone="positive" />
        <ReportKpiCard label="Uncollected" value={formatBDT(ledger?.totals.uncollectedTotal ?? 0)} tone="warning" />
      </ReportSummaryGrid>

      <ReportSection title="Service Charge Income Summary" description="Phase-wise service charge basis, billing progress, collection progress, and any legacy separate settlement state.">
        <ReportTable dense>
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <th className="px-3 py-3">Phase</th>
              <th className="px-3 py-3 text-right">Construction Cost</th>
              <th className="px-3 py-3 text-right">Percent</th>
              <th className="px-3 py-3 text-right">Calculated</th>
              <th className="px-3 py-3 text-right">Billed</th>
              <th className="px-3 py-3 text-right">Collected</th>
              <th className="px-3 py-3 text-right">Uncollected</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Flow Note</th>
            </tr>
          </thead>
          <tbody>
            {ledger?.rows.map((row) => (
              <tr key={`${row.phaseId ?? 'project'}-${row.entryId ?? row.phaseName}`} className="border-b border-slate-200">
                <td className="px-3 py-3 font-medium text-slate-900">{row.phaseName}</td>
                <td className="px-3 py-3 text-right text-slate-700">{formatBDT(row.basisAmount)}</td>
                <td className="px-3 py-3 text-right text-slate-700">{Number(row.percentage ?? 0).toFixed(2)}%</td>
                <td className="px-3 py-3 text-right text-sky-700">{formatBDT(row.serviceChargeAmount)}</td>
                <td className="px-3 py-3 text-right text-slate-700">{formatBDT(row.billedAmount)}</td>
                <td className="px-3 py-3 text-right text-emerald-700">{formatBDT(row.collectedAmount)}</td>
                <td className="px-3 py-3 text-right text-amber-700">{formatBDT(row.uncollectedAmount)}</td>
                <td className="px-3 py-3"><ReportStatusBadge label={row.status.replaceAll('_', ' ')} /></td>
                <td className="px-3 py-3">
                  {row.includedInDemand ? (
                    <ReportStatusBadge label="Demand-linked" tone="positive" />
                  ) : row.settlementStatus === 'SETTLED' ? (
                    <ReportStatusBadge label="Legacy separate settlement" tone="warning" />
                  ) : (
                    <ReportStatusBadge label={row.settlementStatus.replaceAll('_', ' ')} />
                  )}
                  {row.settlementReference ? <div className="mt-1 text-[11px] text-slate-500">{row.settlementReference}</div> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </ReportTable>
      </ReportSection>
    </ReportDocumentLayout>
  );
}

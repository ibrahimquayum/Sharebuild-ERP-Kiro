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
      subtitle="Service charge basis, approval status, settlement state, and billing inclusion."
      generatedAt={new Date()}
      backHref={`/projects/${project.id}/reports`}
      csvHref={`/api/projects/${project.id}/reports/service-charge/excel`}
    >
      <ReportSummaryGrid>
        <ReportKpiCard label="Approved" value={formatBDT(ledger?.totals.approvedTotal ?? 0)} tone="positive" />
        <ReportKpiCard label="Calculated" value={formatBDT(ledger?.totals.calculatedTotal ?? 0)} tone="warning" />
        <ReportKpiCard label="Included in Demand" value={formatBDT(ledger?.totals.includedInDemandTotal ?? 0)} tone="info" />
        <ReportKpiCard label="Settled" value={formatBDT(ledger?.totals.settledTotal ?? 0)} tone="positive" />
      </ReportSummaryGrid>

      <ReportSection title="Service Charge Ledger" description="Phase-wise service charge basis, effective amount, and settlement status.">
        <ReportTable dense>
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <th className="px-3 py-3">Phase</th>
              <th className="px-3 py-3 text-right">Basis Amount</th>
              <th className="px-3 py-3 text-right">Percent</th>
              <th className="px-3 py-3 text-right">Charge</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Settlement</th>
            </tr>
          </thead>
          <tbody>
            {ledger?.rows.map((row) => (
              <tr key={`${row.phaseId ?? 'project'}-${row.entryId ?? row.phaseName}`} className="border-b border-slate-200">
                <td className="px-3 py-3 font-medium text-slate-900">{row.phaseName}</td>
                <td className="px-3 py-3 text-right text-slate-700">{formatBDT(row.basisAmount)}</td>
                <td className="px-3 py-3 text-right text-slate-700">{Number(row.percentage ?? 0).toFixed(2)}%</td>
                <td className="px-3 py-3 text-right text-sky-700">{formatBDT(row.serviceChargeAmount)}</td>
                <td className="px-3 py-3"><ReportStatusBadge label={row.status.replaceAll('_', ' ')} /></td>
                <td className="px-3 py-3">
                  <ReportStatusBadge label={row.settlementStatus.replaceAll('_', ' ')} />
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

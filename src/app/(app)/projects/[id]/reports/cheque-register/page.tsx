import {
  ReportDocumentLayout,
  ReportKpiCard,
  ReportSection,
  ReportStatusBadge,
  ReportSummaryGrid,
  ReportTable,
} from '@/components/reports/report-document';
import { getChequeSummary } from '@/lib/cash-bank';
import { getProjectReportContext } from '@/lib/project-report-page';
import { formatBDT, formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function ProjectChequeRegisterReportPage({ params }: { params: { id: string } }) {
  const { project, branding, context } = await getProjectReportContext(params.id);
  const summary = await getChequeSummary(context.companyId, project.id);

  return (
    <ReportDocumentLayout
      branding={branding}
      project={project}
      title="Cheque Register"
      subtitle="Issued and received cheque tracking for this project."
      generatedAt={new Date()}
      backHref={`/projects/${project.id}/reports`}
      csvHref={`/api/projects/${project.id}/reports/cheque-register/excel`}
    >
      <ReportSummaryGrid>
        <ReportKpiCard label="Pending" value={formatBDT(summary.totals.pending)} tone="warning" />
        <ReportKpiCard label="Cleared" value={formatBDT(summary.totals.cleared)} tone="positive" />
        <ReportKpiCard label="Bounced" value={formatBDT(summary.totals.bounced)} tone="negative" />
        <ReportKpiCard label="Cancelled" value={formatBDT(summary.totals.cancelled)} tone="warning" />
      </ReportSummaryGrid>

      <ReportSection title="Cheque Register" description="Project cheque log with party, bank, amount, and current status.">
        <ReportTable dense>
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <th className="px-3 py-3">Cheque</th>
              <th className="px-3 py-3">Type</th>
              <th className="px-3 py-3">Party</th>
              <th className="px-3 py-3">Date</th>
              <th className="px-3 py-3 text-right">Amount</th>
              <th className="px-3 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {summary.cheques.map((cheque) => (
              <tr key={cheque.id} className="border-b border-slate-200">
                <td className="px-3 py-3 font-medium text-slate-900">
                  {cheque.chequeNo}
                  <div className="text-[11px] text-slate-500">{cheque.bankName}</div>
                </td>
                <td className="px-3 py-3 text-slate-700">{cheque.chequeType.replaceAll('_', ' ')}</td>
                <td className="px-3 py-3 text-slate-700">{cheque.partyName ?? cheque.partyType}</td>
                <td className="px-3 py-3 text-slate-700">{formatDate(cheque.chequeDate)}</td>
                <td className="px-3 py-3 text-right text-slate-900">{formatBDT(Number(cheque.amount))}</td>
                <td className="px-3 py-3"><ReportStatusBadge label={cheque.status.replaceAll('_', ' ')} /></td>
              </tr>
            ))}
          </tbody>
        </ReportTable>
      </ReportSection>
    </ReportDocumentLayout>
  );
}

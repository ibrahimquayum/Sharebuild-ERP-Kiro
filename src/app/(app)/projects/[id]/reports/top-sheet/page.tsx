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

export default async function ProjectTopSheetPage({ params }: { params: { id: string } }) {
  const { context } = await getScopedProject(params.id, 'reports', 'view');
  const data = await getCompleteProjectReportData(context.companyId, params.id);
  if (!data) notFound();

  const slabRows = data.topSheet.filter((row) => row.phaseType !== 'GATHUNI');
  const gathuniRows = data.topSheet.filter((row) => row.phaseType === 'GATHUNI');
  const slabIncome = slabRows.reduce((sum, row) => sum + row.income, 0);
  const slabExpense = slabRows.reduce((sum, row) => sum + row.expense, 0);
  const gathuniIncome = gathuniRows.reduce((sum, row) => sum + row.income, 0);
  const gathuniExpense = gathuniRows.reduce((sum, row) => sum + row.expense, 0);

  return (
    <ReportDocumentLayout
      branding={data.branding}
      project={data.project}
      title="Top Sheet"
      subtitle="Original phase-wise income, expense, and balance summary preserved for Excel continuity."
      generatedAt={data.generatedAt}
      backHref={`/projects/${data.project.id}/reports`}
      csvHref={`/api/projects/${data.project.id}/reports/top-sheet/excel`}
    >
      <ReportSummaryGrid>
        <ReportKpiCard label="Total Income" value={formatBDT(data.summary.totalCollected)} tone="positive" />
        <ReportKpiCard label="Total Expense" value={formatBDT(data.summary.totalExpense)} tone="negative" />
        <ReportKpiCard label="Final Balance" value={formatBDT(data.summary.projectBalance)} tone={data.summary.projectBalance >= 0 ? 'positive' : 'negative'} />
        <ReportKpiCard label="Phases Included" value={String(data.topSheet.length)} />
      </ReportSummaryGrid>

      <ReportNoteBox title="Top Sheet preservation note" tone="info">
        This Top Sheet keeps the Relax Tower historical totals unchanged for business continuity. It is intentionally separate from newer demand-allocation reporting.
      </ReportNoteBox>

      <ReportSection title="Phase-wise Top Sheet" description="Income, expense, and phase balance grouped the same way the business historically reads the Top Sheet.">
        <ReportTable>
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3">Phase</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3 text-right">Income</th>
              <th className="px-4 py-3 text-right">Expense</th>
              <th className="px-4 py-3 text-right">Balance</th>
            </tr>
          </thead>
          <tbody>
            {slabRows.length > 0 ? (
              <tr className="border-b border-slate-200 bg-sky-50/70">
                <td className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-sky-700" colSpan={5}>Construction / Slab Phases</td>
              </tr>
            ) : null}
            {slabRows.map((row) => (
              <tr key={row.phaseId} className="border-b border-slate-200">
                <td className="px-4 py-3 font-medium text-slate-900">{row.phaseName}</td>
                <td className="px-4 py-3 text-slate-700">{row.phaseType}</td>
                <td className="px-4 py-3 text-right text-emerald-700">{formatBDT(row.income)}</td>
                <td className="px-4 py-3 text-right text-rose-700">{formatBDT(row.expense)}</td>
                <td className="px-4 py-3 text-right font-medium">{formatBDT(row.balance)}</td>
              </tr>
            ))}
            {slabRows.length > 0 ? (
              <tr className="border-b border-slate-200 bg-sky-50/70">
                <td className="px-4 py-3 font-semibold text-sky-800" colSpan={2}>Sub-total (Slab)</td>
                <td className="px-4 py-3 text-right font-semibold text-emerald-700">{formatBDT(slabIncome)}</td>
                <td className="px-4 py-3 text-right font-semibold text-rose-700">{formatBDT(slabExpense)}</td>
                <td className="px-4 py-3 text-right font-semibold text-slate-900">{formatBDT(slabIncome - slabExpense)}</td>
              </tr>
            ) : null}

            {gathuniRows.length > 0 ? (
              <tr className="border-b border-slate-200 bg-amber-50/80">
                <td className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-amber-700" colSpan={5}>Gathuni / Masonry Phases</td>
              </tr>
            ) : null}
            {gathuniRows.map((row) => (
              <tr key={row.phaseId} className="border-b border-slate-200">
                <td className="px-4 py-3 font-medium text-slate-900">{row.phaseName}</td>
                <td className="px-4 py-3 text-slate-700">{row.phaseType}</td>
                <td className="px-4 py-3 text-right text-emerald-700">{formatBDT(row.income)}</td>
                <td className="px-4 py-3 text-right text-rose-700">{formatBDT(row.expense)}</td>
                <td className="px-4 py-3 text-right font-medium">{formatBDT(row.balance)}</td>
              </tr>
            ))}
            {gathuniRows.length > 0 ? (
              <tr className="border-b border-slate-200 bg-amber-50/80">
                <td className="px-4 py-3 font-semibold text-amber-800" colSpan={2}>Sub-total (Gathuni)</td>
                <td className="px-4 py-3 text-right font-semibold text-emerald-700">{formatBDT(gathuniIncome)}</td>
                <td className="px-4 py-3 text-right font-semibold text-rose-700">{formatBDT(gathuniExpense)}</td>
                <td className="px-4 py-3 text-right font-semibold text-slate-900">{formatBDT(gathuniIncome - gathuniExpense)}</td>
              </tr>
            ) : null}
          </tbody>
          <tfoot>
            <tr className="bg-slate-100">
              <td className="px-4 py-4 text-base font-semibold text-slate-900" colSpan={2}>Grand Total</td>
              <td className="px-4 py-4 text-right text-base font-semibold text-emerald-700">{formatBDT(data.summary.totalCollected)}</td>
              <td className="px-4 py-4 text-right text-base font-semibold text-rose-700">{formatBDT(data.summary.totalExpense)}</td>
              <td className="px-4 py-4 text-right text-base font-semibold text-slate-900">{formatBDT(data.summary.projectBalance)}</td>
            </tr>
          </tfoot>
        </ReportTable>
      </ReportSection>
    </ReportDocumentLayout>
  );
}

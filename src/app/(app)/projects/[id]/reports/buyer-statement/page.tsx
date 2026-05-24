import { notFound } from 'next/navigation';

import {
  ReportDocumentLayout,
  ReportKpiCard,
  ReportSection,
  ReportSummaryGrid,
  ReportTable,
} from '@/components/reports/report-document';
import { getScopedProject } from '@/lib/access-control';
import { getCompleteProjectReportData } from '@/lib/complete-project-report';
import { formatBDT, formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function BuyerStatementPage({ params }: { params: { id: string } }) {
  const { context } = await getScopedProject(params.id, 'reports', 'view');
  const data = await getCompleteProjectReportData(context.companyId, params.id);
  if (!data) notFound();

  return (
    <ReportDocumentLayout
      branding={data.branding}
      project={data.project}
      title="Buyer Statement"
      subtitle="Project-scoped buyer billing and collection statement with due, advance, and oldest due visibility."
      generatedAt={data.generatedAt}
      backHref={`/projects/${data.project.id}/reports`}
    >
      <ReportSummaryGrid>
        <ReportKpiCard label="Buyers" value={String(data.buyerBillingSummary.length)} />
        <ReportKpiCard label="Issued Demand" value={formatBDT(data.summary.issuedDemand)} tone={data.summary.issuedDemand > 0 ? 'info' : 'warning'} />
        <ReportKpiCard label="Buyer Due" value={formatBDT(data.summary.buyerReceivable)} tone={data.summary.buyerReceivable > 0 ? 'negative' : 'default'} />
        <ReportKpiCard label="Buyer Advance" value={formatBDT(data.summary.buyerAdvance)} tone={data.summary.buyerAdvance > 0 ? 'warning' : 'default'} />
      </ReportSummaryGrid>

      <ReportSection title="Buyer Statement Register" description="Each buyer's demand, collection, allocation, due, advance, and oldest unpaid date.">
        <ReportTable dense>
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <th className="px-3 py-3">Buyer</th>
              <th className="px-3 py-3">Phone</th>
              <th className="px-3 py-3">Units</th>
              <th className="px-3 py-3 text-right">Demand</th>
              <th className="px-3 py-3 text-right">Collection</th>
              <th className="px-3 py-3 text-right">Allocated</th>
              <th className="px-3 py-3 text-right">Due</th>
              <th className="px-3 py-3 text-right">Advance</th>
              <th className="px-3 py-3">Oldest Due</th>
            </tr>
          </thead>
          <tbody>
            {data.buyerBillingSummary.map((row) => (
              <tr key={row.buyerId} className="border-b border-slate-200">
                <td className="px-3 py-3 font-medium text-slate-900">{row.buyerName}</td>
                <td className="px-3 py-3 text-slate-700">{row.phone || '-'}</td>
                <td className="px-3 py-3 text-slate-700">{row.unitsText || '-'}</td>
                <td className="px-3 py-3 text-right text-slate-700">{formatBDT(row.demanded)}</td>
                <td className="px-3 py-3 text-right text-emerald-700">{formatBDT(row.collected)}</td>
                <td className="px-3 py-3 text-right text-emerald-700">{formatBDT(row.allocated)}</td>
                <td className="px-3 py-3 text-right text-rose-700">{formatBDT(row.due)}</td>
                <td className="px-3 py-3 text-right text-amber-700">{formatBDT(row.advance)}</td>
                <td className="px-3 py-3 text-slate-700">{formatDate(row.oldestDue)}</td>
              </tr>
            ))}
          </tbody>
        </ReportTable>
      </ReportSection>
    </ReportDocumentLayout>
  );
}

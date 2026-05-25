import { notFound } from 'next/navigation';

import {
  ReportDocumentLayout,
  ReportKpiCard,
  ReportNoteBox,
  ReportSection,
  ReportSignatureBlock,
  ReportSummaryGrid,
  ReportTable,
} from '@/components/reports/report-document';
import { getProjectDocumentContext } from '@/lib/project-report-page';
import { prisma } from '@/lib/prisma';
import { formatBDT, formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function FinalReconciliationNoticePage({
  params,
}: {
  params: { id: string; reconciliationId: string };
}) {
  const { context, project, branding } = await getProjectDocumentContext(params.id, 'finalReconciliation', 'view');

  const reconciliation = await prisma.finalReconciliation.findFirst({
    where: { id: params.reconciliationId, projectId: project.id, companyId: context.companyId },
    include: {
      lines: {
        include: {
          buyer: { select: { name: true, phone: true } },
          unit: { select: { unitNo: true } },
        },
        orderBy: [{ buyerId: 'asc' }, { createdAt: 'asc' }],
      },
      demands: {
        where: { status: { not: 'CANCELLED' } },
        include: {
          buyer: { select: { name: true } },
          unit: { select: { unitNo: true } },
        },
      },
    },
  });
  if (!reconciliation) notFound();

  const isDeficit = reconciliation.type === 'DEFICIT_DEMAND';
  const noticeTitle = isDeficit ? 'Final Reconciliation Demand Notice' : 'Final Reconciliation Credit Notice';

  return (
    <ReportDocumentLayout
      branding={branding}
      project={project}
      title={noticeTitle}
      subtitle={`${reconciliation.type.replaceAll('_', ' ')} | ${formatDate(reconciliation.postedAt ?? reconciliation.createdAt)}`}
      generatedAt={new Date()}
      backHref={`/projects/${project.id}/finance/final-reconciliation`}
      backLabel="Back to Final Reconciliation"
    >
      <ReportSummaryGrid>
        <ReportKpiCard label="Final Amount" value={formatBDT(Number(reconciliation.finalAmount))} tone={isDeficit ? 'negative' : 'positive'} />
        <ReportKpiCard label="Type" value={reconciliation.type.replaceAll('_', ' ')} tone={isDeficit ? 'warning' : 'info'} />
        <ReportKpiCard label="Status" value={reconciliation.status.replaceAll('_', ' ')} tone={reconciliation.status === 'POSTED' ? 'positive' : 'warning'} />
        <ReportKpiCard label="Posted At" value={formatDate(reconciliation.postedAt ?? reconciliation.createdAt)} />
      </ReportSummaryGrid>

      <ReportNoteBox title="Notice interpretation" tone={isDeficit ? 'warning' : 'info'}>
        {isDeficit
          ? 'This notice distributes final project deficit across buyer ownership shares and may create final reconciliation demand rows.'
          : 'This notice records final project surplus credit lines across buyer ownership shares. Credit may be kept as advance, refunded, or adjusted later.'}
      </ReportNoteBox>

      <ReportSection title="Distribution Lines" description="Buyer-wise ownership-based distribution from the posted final reconciliation.">
        <ReportTable dense>
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <th className="px-3 py-3">Buyer</th>
              <th className="px-3 py-3">Phone</th>
              <th className="px-3 py-3">Unit</th>
              <th className="px-3 py-3 text-right">Ownership %</th>
              <th className="px-3 py-3 text-right">Amount</th>
              <th className="px-3 py-3">Settlement</th>
            </tr>
          </thead>
          <tbody>
            {reconciliation.lines.map((line) => (
              <tr key={line.id} className="border-b border-slate-200">
                <td className="px-3 py-3 font-medium text-slate-900">{line.buyer.name}</td>
                <td className="px-3 py-3 text-slate-700">{line.buyer.phone ?? '-'}</td>
                <td className="px-3 py-3 text-slate-700">{line.unit?.unitNo ?? '-'}</td>
                <td className="px-3 py-3 text-right text-slate-700">{Number(line.ownershipShare).toFixed(2)}%</td>
                <td className="px-3 py-3 text-right text-slate-900">{formatBDT(Number(line.amount))}</td>
                <td className="px-3 py-3 text-slate-700">{line.settlementStatus.replaceAll('_', ' ')}</td>
              </tr>
            ))}
          </tbody>
        </ReportTable>
      </ReportSection>

      {reconciliation.demands.length > 0 ? (
        <ReportSection title="Generated Demand Rows" description="Demand rows created from the posted final reconciliation notice.">
          <ReportTable dense>
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-3 py-3">Buyer</th>
                <th className="px-3 py-3">Unit</th>
                <th className="px-3 py-3">Demand</th>
                <th className="px-3 py-3 text-right">Amount</th>
                <th className="px-3 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {reconciliation.demands.map((demand) => (
                <tr key={demand.id} className="border-b border-slate-200">
                  <td className="px-3 py-3 font-medium text-slate-900">{demand.buyer.name}</td>
                  <td className="px-3 py-3 text-slate-700">{demand.unit.unitNo}</td>
                  <td className="px-3 py-3 text-slate-700">{demand.title}</td>
                  <td className="px-3 py-3 text-right text-slate-900">{formatBDT(Number(demand.amount))}</td>
                  <td className="px-3 py-3 text-slate-700">{demand.status.replaceAll('_', ' ')}</td>
                </tr>
              ))}
            </tbody>
          </ReportTable>
        </ReportSection>
      ) : null}

      <ReportSignatureBlock labels={['Prepared by', 'Checked by', 'Approved by']} />
    </ReportDocumentLayout>
  );
}

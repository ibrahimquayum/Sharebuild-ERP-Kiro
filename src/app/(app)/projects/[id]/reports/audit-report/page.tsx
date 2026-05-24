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
import { formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function AuditReportPage({ params }: { params: { id: string } }) {
  const { context } = await getScopedProject(params.id, 'reports', 'view');
  const data = await getCompleteProjectReportData(context.companyId, params.id);
  if (!data) notFound();

  return (
    <ReportDocumentLayout
      branding={data.branding}
      project={data.project}
      title="Audit Report"
      subtitle="Project audit trail, reversal visibility, voucher gaps, pending approvals, and report limitations."
      generatedAt={data.generatedAt}
      backHref={`/projects/${data.project.id}/reports`}
    >
      <ReportSummaryGrid>
        <ReportKpiCard label="Audit Events" value={String(data.auditLogs.length)} />
        <ReportKpiCard label="Reversed Records" value={String(data.auditSummary.reversedRecords.length)} tone={data.auditSummary.reversedRecords.length > 0 ? 'warning' : 'default'} />
        <ReportKpiCard label="Missing Vouchers" value={String(data.auditSummary.missingVoucher.length)} tone={data.auditSummary.missingVoucher.length > 0 ? 'warning' : 'default'} />
        <ReportKpiCard label="Pending Approvals" value={String(data.auditSummary.pendingApprovals.length)} tone={data.auditSummary.pendingApprovals.length > 0 ? 'warning' : 'default'} />
      </ReportSummaryGrid>

      <ReportNoteBox title="Audit limitations" tone="warning">
        <ul className="space-y-2">
          {data.reportNotes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      </ReportNoteBox>

      <ReportSection title="Audit Event Log" description="Most recent project activity, approvals, report-sensitive actions, and recorded entity changes.">
        <ReportTable dense>
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <th className="px-3 py-3">Date</th>
              <th className="px-3 py-3">User</th>
              <th className="px-3 py-3">Action</th>
              <th className="px-3 py-3">Entity Type</th>
              <th className="px-3 py-3">Entity Id</th>
            </tr>
          </thead>
          <tbody>
            {data.auditLogs.map((row) => (
              <tr key={row.id} className="border-b border-slate-200">
                <td className="px-3 py-3 text-slate-700">{formatDate(row.createdAt)}</td>
                <td className="px-3 py-3 text-slate-700">{row.user?.name ?? row.user?.email ?? 'Unknown user'}</td>
                <td className="px-3 py-3 text-slate-900">{row.action}</td>
                <td className="px-3 py-3 text-slate-700">{row.entityType}</td>
                <td className="px-3 py-3 text-slate-700">{row.entityId ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </ReportTable>
      </ReportSection>
    </ReportDocumentLayout>
  );
}

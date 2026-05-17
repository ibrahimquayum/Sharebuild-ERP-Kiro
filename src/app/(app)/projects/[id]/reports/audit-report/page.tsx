import { ReportFoundationPage } from '@/components/projects/report-foundation-page';
import { getProjectReportContext } from '@/lib/project-report-page';

export const dynamic = 'force-dynamic';

export default async function AuditReportPage({ params }: { params: { id: string } }) {
  const { project, branding } = await getProjectReportContext(params.id);
  return <ReportFoundationPage title="Audit Report" subtitle="Project activity, approvals, reversals, document uploads, and sensitive changes." branding={branding} project={project} rows={[
    { label: 'Filters', value: 'User, action, entity, date range' },
    { label: 'Data source', value: 'AuditLog' },
    { label: 'Export status', value: 'Print-ready foundation complete; PDF/Excel endpoint pending' },
  ]} />;
}

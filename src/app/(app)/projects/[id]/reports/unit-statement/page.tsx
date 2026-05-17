import { ReportFoundationPage } from '@/components/projects/report-foundation-page';
import { getProjectReportContext } from '@/lib/project-report-page';

export const dynamic = 'force-dynamic';

export default async function UnitStatementPage({ params }: { params: { id: string } }) {
  const { project, branding } = await getProjectReportContext(params.id);
  return <ReportFoundationPage title="Unit Statement" subtitle="Unit ownership, demand, collection, due, and documents." branding={branding} project={project} rows={[
    { label: 'Filters', value: 'Unit, buyer/contact, status, date range' },
    { label: 'Data source', value: 'Unit, UnitBuyer, Demand, Collection, Document' },
    { label: 'Export status', value: 'Print-ready foundation complete; PDF/Excel endpoint pending' },
  ]} />;
}

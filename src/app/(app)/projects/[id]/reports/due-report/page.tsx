import { ReportFoundationPage } from '@/components/projects/report-foundation-page';
import { getProjectReportContext } from '@/lib/project-report-page';

export const dynamic = 'force-dynamic';

export default async function DueReportPage({ params }: { params: { id: string } }) {
  const { project, branding } = await getProjectReportContext(params.id);
  return <ReportFoundationPage title="Due Report" subtitle="Demand minus collections by buyer, unit, phase, and due date." branding={branding} project={project} rows={[
    { label: 'Filters', value: 'Buyer, unit, phase, due date, overdue only' },
    { label: 'Data source', value: 'Demand, Collection, UnitBuyer' },
    { label: 'Export status', value: 'Print-ready foundation complete; PDF/Excel endpoint pending' },
  ]} />;
}

import { ReportFoundationPage } from '@/components/projects/report-foundation-page';
import { getProjectReportContext } from '@/lib/project-report-page';

export const dynamic = 'force-dynamic';

export default async function PhaseSummaryPage({ params }: { params: { id: string } }) {
  const { project, branding } = await getProjectReportContext(params.id);
  return <ReportFoundationPage title="Phase Summary" subtitle="Phase-wise work, income, expense, and balance." branding={branding} project={project} rows={[
    { label: 'Filters', value: 'Phase type, status, date range' },
    { label: 'Data source', value: 'Phase, Collection, Expense, Demand' },
    { label: 'Export status', value: 'Print-ready foundation complete; PDF/Excel endpoint pending' },
  ]} />;
}

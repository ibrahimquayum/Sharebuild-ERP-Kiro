import { ReportFoundationPage } from '@/components/projects/report-foundation-page';
import { getProjectReportContext } from '@/lib/project-report-page';

export const dynamic = 'force-dynamic';

export default async function CollectionReportPage({ params }: { params: { id: string } }) {
  const { project, branding } = await getProjectReportContext(params.id);
  return <ReportFoundationPage title="Collection Report" subtitle="Buyer payment records by date, phase, method, and receipt." branding={branding} project={project} rows={[
    { label: 'Filters', value: 'Date range, buyer, phase, payment method' },
    { label: 'Data source', value: 'Collection, Buyer, Phase, Demand' },
    { label: 'Export status', value: 'Print-ready foundation complete; PDF/Excel endpoint pending' },
  ]} />;
}

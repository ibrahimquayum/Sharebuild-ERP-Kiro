import { ReportFoundationPage } from '@/components/projects/report-foundation-page';
import { getProjectReportContext } from '@/lib/project-report-page';

export const dynamic = 'force-dynamic';

export default async function ExpenseReportPage({ params }: { params: { id: string } }) {
  const { project, branding } = await getProjectReportContext(params.id);
  return <ReportFoundationPage title="Expense Report" subtitle="Site costs by category, supplier, phase, status, and voucher." branding={branding} project={project} rows={[
    { label: 'Filters', value: 'Date range, category, supplier, phase, approval status' },
    { label: 'Data source', value: 'Expense, Supplier, Phase, Document' },
    { label: 'Export status', value: 'Print-ready foundation complete; PDF/Excel endpoint pending' },
  ]} />;
}

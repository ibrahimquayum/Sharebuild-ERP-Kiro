import { ReportFoundationPage } from '@/components/projects/report-foundation-page';
import { getProjectReportContext } from '@/lib/project-report-page';

export const dynamic = 'force-dynamic';

export default async function BuyerStatementPage({ params }: { params: { id: string } }) {
  const { project, branding } = await getProjectReportContext(params.id);
  return <ReportFoundationPage title="Buyer Statement" subtitle="Project-scoped buyer ledger with demand, collection, due, and document references." branding={branding} project={project} rows={[
    { label: 'Filters', value: 'Buyer/contact, unit, phase, date range' },
    { label: 'Data source', value: 'ProjectBuyer, UnitBuyer, Demand, Collection, Document' },
    { label: 'Export status', value: 'Print-ready foundation complete; PDF/Excel endpoint pending' },
  ]} />;
}

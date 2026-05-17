import { ReportFoundationPage } from '@/components/projects/report-foundation-page';
import { getProjectReportContext } from '@/lib/project-report-page';

export const dynamic = 'force-dynamic';

export default async function SubcontractorLedgerPage({ params }: { params: { id: string } }) {
  const { project, branding } = await getProjectReportContext(params.id);
  return <ReportFoundationPage title="Subcontractor Ledger" subtitle="Work/service provider bills, payments, and outstanding payable." branding={branding} project={project} rows={[
    { label: 'Filters', value: 'Subcontractor, work type, phase, bill status, date range' },
    { label: 'Data source', value: 'SupplierPayable filtered to LABOUR_CONTRACTOR' },
    { label: 'Export status', value: 'Print-ready foundation complete; PDF/Excel endpoint pending' },
  ]} />;
}

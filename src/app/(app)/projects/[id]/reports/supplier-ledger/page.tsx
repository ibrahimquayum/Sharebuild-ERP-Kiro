import { ReportFoundationPage } from '@/components/projects/report-foundation-page';
import { getProjectReportContext } from '@/lib/project-report-page';

export const dynamic = 'force-dynamic';

export default async function SupplierLedgerPage({ params }: { params: { id: string } }) {
  const { project, branding } = await getProjectReportContext(params.id);
  return <ReportFoundationPage title="Supplier Ledger" subtitle="Material vendor bills, payments, and outstanding payable." branding={branding} project={project} rows={[
    { label: 'Filters', value: 'Supplier, phase, bill status, date range' },
    { label: 'Data source', value: 'SupplierPayable, SupplierPayment, SupplierBillItem' },
    { label: 'Export status', value: 'Print-ready foundation complete; PDF/Excel endpoint pending' },
  ]} />;
}

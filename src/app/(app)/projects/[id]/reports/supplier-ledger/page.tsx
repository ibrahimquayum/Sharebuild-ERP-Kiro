import { getServerSession } from 'next-auth';
import { ReportHeader } from '@/components/shared/report-header';
import { ReportFooter } from '@/components/shared/report-footer';
import { ReportActions } from '@/components/shared/report-actions';
import { authOptions } from '@/lib/auth';
import { getProjectReportContext } from '@/lib/project-report-page';
import { getProjectSupplierAssignments } from '@/lib/project-vendor-ledger';
import { formatBDT, formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function SupplierLedgerPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { projectSupplierId?: string };
}) {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as any)?.companyId ?? '';
  const { project, branding } = await getProjectReportContext(params.id);
  const assignments = await getProjectSupplierAssignments(project.id, companyId);
  const filteredAssignments = searchParams?.projectSupplierId
    ? assignments.filter((assignment) => assignment.id === searchParams.projectSupplierId)
    : assignments;

  return (
    <div className="p-5 space-y-5 print:p-0">
      <div className="flex justify-end">
        <ReportActions pdfReady />
      </div>
      <ReportHeader
        branding={branding}
        project={project}
        title="Supplier Ledger"
        subtitle="Project-assigned supplier contracts, bills, payments, and outstanding payable"
      />

      {filteredAssignments.length === 0 ? (
        <div className="rounded-md border p-8 text-center text-sm text-muted-foreground">No supplier assignments found for this report.</div>
      ) : filteredAssignments.map((assignment) => (
        <section key={assignment.id} className="space-y-3 rounded-md border p-4 print:break-inside-avoid">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold">{assignment.supplier.name}</h3>
              <p className="text-xs text-muted-foreground">{assignment.materialCategory || 'General supplier'} · {assignment.paymentTerms || 'Terms not set'}</p>
            </div>
            <div className="text-right text-xs text-muted-foreground">
              <div>Opening balance {formatBDT(Number(assignment.openingBalance))}</div>
              <div>Documents {assignment.summary.documentCount}</div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-md border p-3 text-sm"><div className="text-xs text-muted-foreground">Billed</div><div className="mt-1 font-bold">{formatBDT(assignment.summary.totalBilled)}</div></div>
            <div className="rounded-md border p-3 text-sm"><div className="text-xs text-muted-foreground">Paid</div><div className="mt-1 font-bold text-green-600">{formatBDT(assignment.summary.totalPaid)}</div></div>
            <div className="rounded-md border p-3 text-sm"><div className="text-xs text-muted-foreground">Payable</div><div className="mt-1 font-bold text-red-600">{formatBDT(assignment.summary.totalDue)}</div></div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="border-b bg-muted/40"><th className="px-3 py-2 text-left">Bill</th><th className="text-left">Phase</th><th className="text-right">Amount</th><th className="text-right">Paid</th><th className="text-right">Due</th><th className="text-right">Docs</th></tr></thead>
              <tbody>
                {assignment.payables.length === 0 ? <tr><td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">No supplier bills yet.</td></tr> : assignment.payables.map((payable) => (
                  <tr key={payable.id} className="border-b">
                    <td className="px-3 py-2">{payable.billNo || 'Supplier bill'}<div className="text-[11px] text-muted-foreground">{formatDate(payable.billDate)}</div></td>
                    <td>{payable.phase?.name || 'Project general'}</td>
                    <td className="text-right">{formatBDT(Number(payable.totalAmount))}</td>
                    <td className="text-right text-green-600">{formatBDT(payable.payments.reduce((sum, payment) => sum + Number(payment.amount), 0))}</td>
                    <td className="text-right text-red-600">{formatBDT(Number(payable.dueAmount))}</td>
                    <td className="text-right">{payable.documents.length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}

      <ReportFooter note={branding.reportFooterNote} />
    </div>
  );
}

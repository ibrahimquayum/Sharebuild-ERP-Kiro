import { notFound, redirect } from 'next/navigation';

import {
  ReportDocumentLayout,
  ReportKpiCard,
  ReportSection,
  ReportSignatureBlock,
  ReportSummaryGrid,
  ReportTable,
} from '@/components/reports/report-document';
import { hasPermission } from '@/lib/access-control';
import { getProjectDocumentContext } from '@/lib/project-report-page';
import { isSubcontractorSupplierType } from '@/lib/project-vendor-ledger';
import { prisma } from '@/lib/prisma';
import { formatBDT, formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function PayablePaymentVoucherPage({
  params,
}: {
  params: { id: string; payableId: string; paymentId: string };
}) {
  const { context, project, branding } = await getProjectDocumentContext(params.id);

  const payable = await prisma.supplierPayable.findFirst({
    where: { id: params.payableId, projectId: project.id, supplier: { companyId: context.companyId } },
    include: {
      supplier: { select: { name: true, supplierType: true } },
      phase: { select: { name: true } },
      payments: {
        where: { id: params.paymentId },
        include: { account: { select: { name: true, type: true, bankName: true, accountNumber: true } } },
      },
    },
  });
  if (!payable || payable.payments.length === 0) notFound();

  const module = isSubcontractorSupplierType(payable.supplier.supplierType) ? 'subcontractors' : 'suppliers';
  if (!hasPermission(context, module, 'view')) {
    redirect(`/access-denied?module=${module}&action=view&projectId=${project.id}`);
  }

  const payment = payable.payments[0];
  const payableBefore = Number(payable.paidAmount) - Number(payment.amount) + Number(payable.dueAmount);
  const payableAfter = Number(payable.dueAmount);
  const title = isSubcontractorSupplierType(payable.supplier.supplierType) ? 'Subcontractor Payment Voucher' : 'Supplier Payment Voucher';

  return (
    <ReportDocumentLayout
      branding={branding}
      project={project}
      title={title}
      subtitle={`${payable.billNo ?? payable.id} | ${payable.supplier.name}`}
      generatedAt={new Date()}
      backHref={`/projects/${project.id}/payables/${payable.id}`}
      backLabel="Back to Bill Detail"
    >
      <ReportSummaryGrid>
        <ReportKpiCard label="Payment Amount" value={formatBDT(Number(payment.amount))} tone="positive" />
        <ReportKpiCard label="Payable Before" value={formatBDT(payableBefore)} tone="warning" />
        <ReportKpiCard label="Payable After" value={formatBDT(payableAfter)} tone={payableAfter > 0 ? 'negative' : 'default'} />
        <ReportKpiCard label="Payment Date" value={formatDate(payment.paidAt)} />
      </ReportSummaryGrid>

      <ReportSection title="Voucher Summary" description="Payment voucher with bill reference, method, and before/after payable position.">
        <ReportTable>
          <tbody>
            <tr className="border-b border-slate-200">
              <td className="px-4 py-3 w-[240px] font-medium text-slate-900">Party</td>
              <td className="px-4 py-3 text-sm text-slate-600">{payable.supplier.name}</td>
            </tr>
            <tr className="border-b border-slate-200">
              <td className="px-4 py-3 font-medium text-slate-900">Project / Phase</td>
              <td className="px-4 py-3 text-sm text-slate-600">{project.name} | {payable.phase?.name ?? 'Project general'}</td>
            </tr>
            <tr className="border-b border-slate-200">
              <td className="px-4 py-3 font-medium text-slate-900">Bill Reference</td>
              <td className="px-4 py-3 text-sm text-slate-600">{payable.billNo ?? payable.id}</td>
            </tr>
            <tr className="border-b border-slate-200">
              <td className="px-4 py-3 font-medium text-slate-900">Payment Method / Account</td>
              <td className="px-4 py-3 text-sm text-slate-600">
                {payment.paymentMethod.replaceAll('_', ' ')}
                {payment.account ? ` | ${payment.account.name}` : ''}
                {payment.reference ? ` | Ref: ${payment.reference}` : ''}
              </td>
            </tr>
            <tr className="border-b border-slate-200">
              <td className="px-4 py-3 font-medium text-slate-900">Cheque / Bank Reference</td>
              <td className="px-4 py-3 text-sm text-slate-600">
                {payment.chequeNo || payment.bankName || payment.chequeDate
                  ? `${payment.chequeNo ?? 'Cheque'} ${payment.bankName ? `| ${payment.bankName}` : ''} ${payment.chequeDate ? `| ${formatDate(payment.chequeDate)}` : ''}`.trim()
                  : 'Not applicable'}
              </td>
            </tr>
            <tr className="border-b border-slate-200">
              <td className="px-4 py-3 font-medium text-slate-900">Payment Amount</td>
              <td className="px-4 py-3 text-sm text-slate-600">{formatBDT(Number(payment.amount))}</td>
            </tr>
            <tr className="border-b border-slate-200">
              <td className="px-4 py-3 font-medium text-slate-900">Payable Before / After</td>
              <td className="px-4 py-3 text-sm text-slate-600">{formatBDT(payableBefore)} before | {formatBDT(payableAfter)} after</td>
            </tr>
            <tr>
              <td className="px-4 py-3 font-medium text-slate-900">Notes</td>
              <td className="px-4 py-3 text-sm text-slate-600">{payment.notes || 'Bill payment voucher.'}</td>
            </tr>
          </tbody>
        </ReportTable>
      </ReportSection>

      <ReportSignatureBlock labels={['Prepared by', 'Checked by', 'Approved by']} />
    </ReportDocumentLayout>
  );
}

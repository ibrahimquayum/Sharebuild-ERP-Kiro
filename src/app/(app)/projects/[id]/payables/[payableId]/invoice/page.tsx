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
import { expenseCategoryLabel, formatBDT, formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function PayableInvoicePage({
  params,
}: {
  params: { id: string; payableId: string };
}) {
  const { context, project, branding } = await getProjectDocumentContext(params.id);

  const payable = await prisma.supplierPayable.findFirst({
    where: { id: params.payableId, projectId: project.id, supplier: { companyId: context.companyId } },
    include: {
      supplier: { select: { name: true, phone: true, supplierType: true, address: true, contactPerson: true } },
      phase: { select: { name: true } },
      projectSubcontractor: { select: { workType: true, assignedPhase: { select: { name: true } } } },
      billItems: true,
      documents: { orderBy: { uploadedAt: 'desc' } },
    },
  });
  if (!payable) notFound();

  const module = isSubcontractorSupplierType(payable.supplier.supplierType) ? 'subcontractors' : 'suppliers';
  if (!hasPermission(context, module, 'view')) {
    redirect(`/access-denied?module=${module}&action=view&projectId=${project.id}`);
  }

  const deductions = Number(payable.vatAmount ?? 0) + Number(payable.aitTdsAmount ?? 0) + Number(payable.otherDeductionAmount ?? 0);
  const retentionBalance = Math.max(Number(payable.retentionAmount ?? 0) - Number(payable.retentionReleasedAmount ?? 0), 0);
  const title = isSubcontractorSupplierType(payable.supplier.supplierType) ? 'Subcontractor Progress Bill' : 'Supplier Bill View';

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
        <ReportKpiCard label="Gross Bill" value={formatBDT(Number(payable.totalAmount))} tone="negative" />
        <ReportKpiCard label="Deductions" value={formatBDT(deductions)} tone="info" />
        <ReportKpiCard label="Retention Held" value={formatBDT(Number(payable.retentionAmount ?? 0))} tone="warning" />
        <ReportKpiCard label="Current Payable" value={formatBDT(Number(payable.netPayableAmount ?? payable.totalAmount))} tone="positive" />
      </ReportSummaryGrid>

      <ReportSection title="Bill Summary" description="Professional invoice-style view for vendor or subcontractor billing.">
        <ReportTable>
          <tbody>
            <tr className="border-b border-slate-200">
              <td className="px-4 py-3 w-[240px] font-medium text-slate-900">{isSubcontractorSupplierType(payable.supplier.supplierType) ? 'Subcontractor' : 'Supplier'}</td>
              <td className="px-4 py-3 text-sm text-slate-600">{payable.supplier.name}</td>
            </tr>
            <tr className="border-b border-slate-200">
              <td className="px-4 py-3 font-medium text-slate-900">Project / Phase</td>
              <td className="px-4 py-3 text-sm text-slate-600">
                {project.name} | {payable.phase?.name ?? payable.projectSubcontractor?.assignedPhase?.name ?? 'Project general'}
              </td>
            </tr>
            <tr className="border-b border-slate-200">
              <td className="px-4 py-3 font-medium text-slate-900">Bill Number / Date</td>
              <td className="px-4 py-3 text-sm text-slate-600">{payable.billNo ?? payable.id} | {formatDate(payable.billDate)}</td>
            </tr>
            {payable.projectSubcontractor ? (
              <tr className="border-b border-slate-200">
                <td className="px-4 py-3 font-medium text-slate-900">Work Type</td>
                <td className="px-4 py-3 text-sm text-slate-600">{payable.projectSubcontractor.workType.replaceAll('_', ' ')}</td>
              </tr>
            ) : null}
            <tr className="border-b border-slate-200">
              <td className="px-4 py-3 font-medium text-slate-900">Gross Bill Amount</td>
              <td className="px-4 py-3 text-sm text-slate-600">{formatBDT(Number(payable.totalAmount))}</td>
            </tr>
            <tr className="border-b border-slate-200">
              <td className="px-4 py-3 font-medium text-slate-900">VAT / AIT / TDS</td>
              <td className="px-4 py-3 text-sm text-slate-600">{formatBDT(deductions)}</td>
            </tr>
            <tr className="border-b border-slate-200">
              <td className="px-4 py-3 font-medium text-slate-900">Retention</td>
              <td className="px-4 py-3 text-sm text-slate-600">{formatBDT(Number(payable.retentionAmount ?? 0))} (released {formatBDT(Number(payable.retentionReleasedAmount ?? 0))})</td>
            </tr>
            <tr className="border-b border-slate-200">
              <td className="px-4 py-3 font-medium text-slate-900">Paid / Due</td>
              <td className="px-4 py-3 text-sm text-slate-600">{formatBDT(Number(payable.paidAmount))} paid | {formatBDT(Number(payable.dueAmount))} due</td>
            </tr>
            <tr className="border-b border-slate-200">
              <td className="px-4 py-3 font-medium text-slate-900">Retention Outstanding</td>
              <td className="px-4 py-3 text-sm text-slate-600">{formatBDT(retentionBalance)}</td>
            </tr>
            <tr>
              <td className="px-4 py-3 font-medium text-slate-900">Notes</td>
              <td className="px-4 py-3 text-sm text-slate-600">{payable.notes || 'No additional note.'}</td>
            </tr>
          </tbody>
        </ReportTable>
      </ReportSection>

      <ReportSection title="Line Items" description="Material or progress-bill lines recorded against the bill.">
        <ReportTable dense>
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <th className="px-3 py-3">Description</th>
              <th className="px-3 py-3">Category</th>
              <th className="px-3 py-3 text-right">Quantity</th>
              <th className="px-3 py-3">Unit</th>
              <th className="px-3 py-3 text-right">Rate</th>
              <th className="px-3 py-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {payable.billItems.length === 0 ? (
              <tr>
                <td className="px-3 py-8 text-center text-sm text-slate-500" colSpan={6}>No line items recorded. This bill currently stands as a summary bill.</td>
              </tr>
            ) : (
              payable.billItems.map((item) => (
                <tr key={item.id} className="border-b border-slate-200">
                  <td className="px-3 py-3 font-medium text-slate-900">{item.description}</td>
                  <td className="px-3 py-3 text-slate-700">{expenseCategoryLabel(item.category)}</td>
                  <td className="px-3 py-3 text-right text-slate-700">{item.quantity ? Number(item.quantity).toLocaleString('en-IN', { maximumFractionDigits: 2 }) : '-'}</td>
                  <td className="px-3 py-3 text-slate-700">{item.unit ?? '-'}</td>
                  <td className="px-3 py-3 text-right text-slate-700">{item.unitPrice ? formatBDT(Number(item.unitPrice)) : '-'}</td>
                  <td className="px-3 py-3 text-right text-slate-900">{formatBDT(Number(item.amount))}</td>
                </tr>
              ))
            )}
          </tbody>
        </ReportTable>
      </ReportSection>

      <ReportSection title="Document Readiness" description="Linked invoice, supporting document, and tax-reference visibility.">
        <ReportTable dense>
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <th className="px-3 py-3">Document</th>
              <th className="px-3 py-3">Category</th>
              <th className="px-3 py-3">Uploaded</th>
            </tr>
          </thead>
          <tbody>
            {payable.documents.length === 0 ? (
              <tr>
                <td className="px-3 py-8 text-center text-sm text-slate-500" colSpan={3}>No linked invoice or supporting document uploaded yet.</td>
              </tr>
            ) : (
              payable.documents.map((document) => (
                <tr key={document.id} className="border-b border-slate-200">
                  <td className="px-3 py-3 font-medium text-slate-900">{document.title ?? document.fileName}</td>
                  <td className="px-3 py-3 text-slate-700">{document.category ?? 'Document'}</td>
                  <td className="px-3 py-3 text-slate-700">{formatDate(document.uploadedAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </ReportTable>
      </ReportSection>

      <ReportSignatureBlock labels={['Prepared by', 'Checked by', 'Approved by']} />
    </ReportDocumentLayout>
  );
}

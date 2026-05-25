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

export default async function RetentionReleaseVoucherPage({
  params,
}: {
  params: { id: string; payableId: string; releaseId: string };
}) {
  const { context, project, branding } = await getProjectDocumentContext(params.id);

  const payable = await prisma.supplierPayable.findFirst({
    where: { id: params.payableId, projectId: project.id, supplier: { companyId: context.companyId } },
    include: {
      supplier: { select: { name: true, supplierType: true } },
      phase: { select: { name: true } },
      payments: {
        where: { id: params.releaseId },
        include: { account: { select: { name: true } } },
      },
    },
  });
  if (!payable || payable.payments.length === 0) notFound();

  const module = isSubcontractorSupplierType(payable.supplier.supplierType) ? 'subcontractors' : 'suppliers';
  if (!hasPermission(context, module, 'view')) {
    redirect(`/access-denied?module=${module}&action=view&projectId=${project.id}`);
  }

  const release = payable.payments[0];
  const title = isSubcontractorSupplierType(payable.supplier.supplierType) ? 'Subcontractor Retention Release Voucher' : 'Retention Release Voucher';

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
        <ReportKpiCard label="Release Amount" value={formatBDT(Number(release.amount))} tone="positive" />
        <ReportKpiCard label="Held Retention" value={formatBDT(Number(payable.retentionAmount ?? 0))} tone="warning" />
        <ReportKpiCard label="Released To Date" value={formatBDT(Number(payable.retentionReleasedAmount ?? 0))} tone="info" />
        <ReportKpiCard label="Release Date" value={formatDate(release.paidAt)} />
      </ReportSummaryGrid>

      <ReportSection title="Retention Release Summary" description="Retention release voucher tied to the original vendor bill.">
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
              <td className="px-4 py-3 font-medium text-slate-900">Release Method / Account</td>
              <td className="px-4 py-3 text-sm text-slate-600">{release.paymentMethod.replaceAll('_', ' ')} {release.account ? `| ${release.account.name}` : ''}</td>
            </tr>
            <tr className="border-b border-slate-200">
              <td className="px-4 py-3 font-medium text-slate-900">Release Amount</td>
              <td className="px-4 py-3 text-sm text-slate-600">{formatBDT(Number(release.amount))}</td>
            </tr>
            <tr className="border-b border-slate-200">
              <td className="px-4 py-3 font-medium text-slate-900">Outstanding Retention</td>
              <td className="px-4 py-3 text-sm text-slate-600">{formatBDT(Math.max(Number(payable.retentionAmount ?? 0) - Number(payable.retentionReleasedAmount ?? 0), 0))}</td>
            </tr>
            <tr>
              <td className="px-4 py-3 font-medium text-slate-900">Notes</td>
              <td className="px-4 py-3 text-sm text-slate-600">{release.notes || 'Retention release voucher.'}</td>
            </tr>
          </tbody>
        </ReportTable>
      </ReportSection>

      <ReportSignatureBlock labels={['Prepared by', 'Checked by', 'Approved by']} />
    </ReportDocumentLayout>
  );
}

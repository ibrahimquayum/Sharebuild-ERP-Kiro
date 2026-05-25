import { notFound } from 'next/navigation';

import {
  ReportDocumentLayout,
  ReportKpiCard,
  ReportSection,
  ReportSignatureBlock,
  ReportSummaryGrid,
  ReportTable,
} from '@/components/reports/report-document';
import { getProjectDocumentContext } from '@/lib/project-report-page';
import { prisma } from '@/lib/prisma';
import { expenseCategoryLabel, formatBDT, formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function ExpenseVoucherPage({
  params,
}: {
  params: { id: string; expenseId: string };
}) {
  const { context, project, branding } = await getProjectDocumentContext(params.id, 'expenses', 'view');

  const expense = await prisma.expense.findFirst({
    where: { id: params.expenseId, phase: { projectId: project.id, project: { companyId: context.companyId } } },
    include: {
      phase: { select: { name: true } },
      supplier: { select: { name: true } },
      account: { select: { name: true } },
      createdBy: { select: { name: true } },
      approvedBy: { select: { name: true } },
      documents: { orderBy: { uploadedAt: 'desc' } },
    },
  });
  if (!expense) notFound();

  return (
    <ReportDocumentLayout
      branding={branding}
      project={project}
      title="Direct Expense Voucher"
      subtitle={`${expense.billNo ?? expense.referenceNo ?? expense.id} | ${expense.description}`}
      generatedAt={new Date()}
      backHref={`/projects/${project.id}/expenses/${expense.id}`}
      backLabel="Back to Expense Detail"
    >
      <ReportSummaryGrid>
        <ReportKpiCard label="Amount" value={formatBDT(Number(expense.amount))} tone="negative" />
        <ReportKpiCard label="Date" value={formatDate(expense.expenseDate)} />
        <ReportKpiCard label="Voucher Status" value={expense.documents.length > 0 ? 'Attached' : 'Missing'} tone={expense.documents.length > 0 ? 'positive' : 'warning'} />
        <ReportKpiCard label="Approval" value={expense.status.replaceAll('_', ' ')} tone={expense.status === 'APPROVED' ? 'positive' : 'warning'} />
      </ReportSummaryGrid>

      <ReportSection title="Expense Summary" description="Printable direct expense voucher with project, category, party, and approval context.">
        <ReportTable>
          <tbody>
            <tr className="border-b border-slate-200">
              <td className="px-4 py-3 w-[240px] font-medium text-slate-900">Phase</td>
              <td className="px-4 py-3 text-sm text-slate-600">{expense.phase.name}</td>
            </tr>
            <tr className="border-b border-slate-200">
              <td className="px-4 py-3 font-medium text-slate-900">Category</td>
              <td className="px-4 py-3 text-sm text-slate-600">{expenseCategoryLabel(expense.category)}</td>
            </tr>
            <tr className="border-b border-slate-200">
              <td className="px-4 py-3 font-medium text-slate-900">Description</td>
              <td className="px-4 py-3 text-sm text-slate-600">{expense.description}</td>
            </tr>
            <tr className="border-b border-slate-200">
              <td className="px-4 py-3 font-medium text-slate-900">Supplier / Shop</td>
              <td className="px-4 py-3 text-sm text-slate-600">{expense.supplier?.name ?? expense.localShopName ?? 'Direct local expense'}</td>
            </tr>
            <tr className="border-b border-slate-200">
              <td className="px-4 py-3 font-medium text-slate-900">Quantity / Rate</td>
              <td className="px-4 py-3 text-sm text-slate-600">
                {expense.quantity ? Number(expense.quantity).toLocaleString('en-IN', { maximumFractionDigits: 2 }) : '-'} {expense.unit ?? ''}
                {expense.unitPrice ? ` | ${formatBDT(Number(expense.unitPrice))}` : ''}
              </td>
            </tr>
            <tr className="border-b border-slate-200">
              <td className="px-4 py-3 font-medium text-slate-900">Payment Method / Account</td>
              <td className="px-4 py-3 text-sm text-slate-600">{expense.paymentMethod.replaceAll('_', ' ')} {expense.account ? `| ${expense.account.name}` : ''}</td>
            </tr>
            <tr className="border-b border-slate-200">
              <td className="px-4 py-3 font-medium text-slate-900">Bill / Reference</td>
              <td className="px-4 py-3 text-sm text-slate-600">{expense.billNo ?? expense.referenceNo ?? 'Not recorded'}</td>
            </tr>
            <tr className="border-b border-slate-200">
              <td className="px-4 py-3 font-medium text-slate-900">Entered / Approved By</td>
              <td className="px-4 py-3 text-sm text-slate-600">{expense.createdBy.name} | {expense.approvedBy?.name ?? 'Pending approval'}</td>
            </tr>
            <tr>
              <td className="px-4 py-3 font-medium text-slate-900">Notes</td>
              <td className="px-4 py-3 text-sm text-slate-600">{expense.notes || 'Direct expense voucher.'}</td>
            </tr>
          </tbody>
        </ReportTable>
      </ReportSection>

      <ReportSignatureBlock labels={['Prepared by', 'Checked by', 'Approved by']} />
    </ReportDocumentLayout>
  );
}

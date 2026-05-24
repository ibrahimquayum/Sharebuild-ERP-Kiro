import { notFound } from 'next/navigation';

import {
  ReportDocumentLayout,
  ReportKpiCard,
  ReportSection,
  ReportStatusBadge,
  ReportSummaryGrid,
  ReportTable,
} from '@/components/reports/report-document';
import { getScopedProject } from '@/lib/access-control';
import { getCompleteProjectReportData } from '@/lib/complete-project-report';
import { expenseCategoryLabel, formatBDT, formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function ExpenseReportPage({ params }: { params: { id: string } }) {
  const { context } = await getScopedProject(params.id, 'reports', 'view');
  const data = await getCompleteProjectReportData(context.companyId, params.id);
  if (!data) notFound();

  return (
    <ReportDocumentLayout
      branding={data.branding}
      project={data.project}
      title="Expense Report"
      subtitle="Detailed direct expense register with voucher visibility, category, supplier, and approval status."
      generatedAt={data.generatedAt}
      backHref={`/projects/${data.project.id}/reports`}
      csvHref={`/api/projects/${data.project.id}/reports/expenses/excel`}
    >
      <ReportSummaryGrid>
        <ReportKpiCard label="Approved / Final" value={formatBDT(data.officialExpenses.reduce((sum, expense) => sum + Number(expense.amount), 0))} tone="negative" />
        <ReportKpiCard label="Pending Approval" value={String(data.auditSummary.pendingApprovals.length)} tone={data.auditSummary.pendingApprovals.length > 0 ? 'warning' : 'default'} />
        <ReportKpiCard label="Missing Vouchers" value={String(data.auditSummary.missingVoucher.length)} tone={data.auditSummary.missingVoucher.length > 0 ? 'warning' : 'default'} />
        <ReportKpiCard label="Expense Rows" value={String(data.expenses.length)} />
      </ReportSummaryGrid>

      <ReportSection title="Expense Register" description="All project direct expenses, including pending approval and missing-voucher visibility.">
        <ReportTable dense>
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <th className="px-3 py-3">Date</th>
              <th className="px-3 py-3">Phase</th>
              <th className="px-3 py-3">Category</th>
              <th className="px-3 py-3">Description</th>
              <th className="px-3 py-3">Supplier / Shop</th>
              <th className="px-3 py-3">Voucher</th>
              <th className="px-3 py-3">Method</th>
              <th className="px-3 py-3 text-right">Amount</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Voucher Status</th>
            </tr>
          </thead>
          <tbody>
            {data.expenses.map((expense) => (
              <tr key={expense.id} className="border-b border-slate-200">
                <td className="px-3 py-3 text-slate-700">{formatDate(expense.expenseDate)}</td>
                <td className="px-3 py-3 text-slate-700">{expense.phase.name}</td>
                <td className="px-3 py-3 text-slate-700">{expenseCategoryLabel(expense.category)}</td>
                <td className="px-3 py-3 text-slate-900">{expense.description}</td>
                <td className="px-3 py-3 text-slate-700">{expense.supplier?.name ?? expense.localShopName ?? 'Cash / no supplier'}</td>
                <td className="px-3 py-3 text-slate-700">{expense.billNo ?? expense.referenceNo ?? '-'}</td>
                <td className="px-3 py-3 text-slate-700">{expense.paymentMethod.replaceAll('_', ' ')}</td>
                <td className="px-3 py-3 text-right text-rose-700">{formatBDT(Number(expense.amount))}</td>
                <td className="px-3 py-3"><ReportStatusBadge label={expense.status.replaceAll('_', ' ')} /></td>
                <td className="px-3 py-3">
                  {expense.documents.length > 0 ? (
                    <ReportStatusBadge label="Attached" tone="positive" />
                  ) : (
                    <ReportStatusBadge label="Missing" tone="warning" />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </ReportTable>
      </ReportSection>
    </ReportDocumentLayout>
  );
}

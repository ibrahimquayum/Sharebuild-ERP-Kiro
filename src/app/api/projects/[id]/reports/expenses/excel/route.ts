import { NextResponse } from 'next/server';
import { getCompleteProjectReportData } from '@/lib/complete-project-report';
import { csvResponse, csvRows } from '@/lib/csv';
import { formatDate } from '@/lib/utils';
import { safeAuditLog } from '@/lib/audit';
import { apiAccessError, assertApiProjectPermission } from '@/lib/access-control';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const access = await assertApiProjectPermission({ projectId: params.id, module: 'reports', action: 'export' });
  if (!access.ok) return apiAccessError(access);
  const data = await getCompleteProjectReportData(access.context.companyId, params.id);
  if (!data) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

  const rows = [
    ['Expense Report'],
    ['Company', data.branding.name],
    ['Project', data.project.name],
    ['Generated', data.generatedAt.toISOString()],
    [],
    ['Date', 'Phase', 'Category', 'Description', 'Supplier / Local Shop', 'Amount', 'Payment Method', 'Status', 'Voucher', 'Entered By', 'Approved By', 'Notes'],
    ...data.expenses.map((expense) => [formatDate(expense.expenseDate), expense.phase.name, expense.category, expense.description, expense.supplier?.name ?? expense.localShopName ?? 'Cash / no supplier', Number(expense.amount), expense.paymentMethod, expense.status, expense.documents.length > 0 ? 'Attached' : 'Missing', expense.createdBy.name, expense.approvedBy?.name ?? '', expense.notes ?? '']),
  ];
  await safeAuditLog({ userId: access.context.userId, projectId: data.project.id, action: 'CREATE', entityType: 'report_export', entityId: data.project.id, newValues: { report: 'expense_report', format: 'csv' }, context: 'expense report csv export' });
  return csvResponse(`expense-report-${data.project.code ?? data.project.id}.csv`, csvRows(rows));
}

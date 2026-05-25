import { NextResponse } from 'next/server';

import { apiAccessError, assertApiProjectPermission } from '@/lib/access-control';
import { safeAuditLog } from '@/lib/audit';
import { getCompleteProjectReportData } from '@/lib/complete-project-report';
import { csvResponse, csvRows } from '@/lib/csv';
import { parseProjectCostReportFilters } from '@/lib/report-controls';
import { expenseCategoryLabel, formatDate } from '@/lib/utils';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const access = await assertApiProjectPermission({ projectId: params.id, module: 'reports', action: 'export' });
  if (!access.ok) return apiAccessError(access);
  const filters = parseProjectCostReportFilters(new URL(req.url).searchParams);
  const data = await getCompleteProjectReportData(access.context.companyId, params.id, filters);
  if (!data) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

  const rows = [
    ['Expense / Project Cost Report'],
    ['Company', data.branding.name],
    ['Project', data.project.name],
    ['Generated', data.generatedAt.toISOString()],
    ['Report Mode', filters.detailMode],
    [],
    ['Date', 'Phase', 'Source Type', 'Bill / Voucher', 'Supplier / Party', 'Category', 'Description', 'Quantity', 'Unit', 'Rate', 'Amount', 'Voucher', 'Approval'],
    ...data.costReport.rows.map((row) => [
      formatDate(row.date),
      row.phaseName,
      row.sourceType,
      row.sourceNo,
      row.partyName,
      expenseCategoryLabel(row.category),
      row.description,
      row.quantity ?? '',
      row.unit ?? '',
      row.rate ?? '',
      row.amount,
      row.voucherStatus,
      row.approvalStatus,
    ]),
  ];
  await safeAuditLog({
    userId: access.context.userId,
    projectId: data.project.id,
    action: 'CREATE',
    entityType: 'report_export',
    entityId: data.project.id,
    newValues: { report: 'expense_report', format: 'csv' },
    context: 'expense report csv export',
  });
  return csvResponse(`expense-report-${data.project.code ?? data.project.id}.csv`, csvRows(rows));
}

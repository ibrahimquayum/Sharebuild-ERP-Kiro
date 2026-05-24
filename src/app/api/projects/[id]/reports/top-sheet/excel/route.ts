import { NextResponse } from 'next/server';
import { getCompleteProjectReportData } from '@/lib/complete-project-report';
import { csvResponse, csvRows } from '@/lib/csv';
import { safeAuditLog } from '@/lib/audit';
import { apiAccessError, assertApiProjectPermission } from '@/lib/access-control';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const access = await assertApiProjectPermission({ projectId: params.id, module: 'reports', action: 'export' });
  if (!access.ok) return apiAccessError(access);
  const data = await getCompleteProjectReportData(access.context.companyId, params.id);
  if (!data) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

  const rows = [
    ['Top Sheet'],
    ['Company', data.branding.name],
    ['Project', data.project.name],
    ['Generated', data.generatedAt.toISOString()],
    [],
    ['Phase', 'Type', 'Income', 'Expense', 'Balance'],
    ...data.topSheet.map((row) => [row.phaseName, row.phaseType, row.income, row.expense, row.balance]),
    [],
    ['Grand Total', '', data.summary.totalCollected, data.summary.totalExpense, data.summary.projectBalance],
  ];
  await safeAuditLog({ userId: access.context.userId, projectId: data.project.id, action: 'CREATE', entityType: 'report_export', entityId: data.project.id, newValues: { report: 'top_sheet', format: 'csv' }, context: 'top sheet csv export' });
  return csvResponse(`top-sheet-${data.project.code ?? data.project.id}.csv`, csvRows(rows));
}

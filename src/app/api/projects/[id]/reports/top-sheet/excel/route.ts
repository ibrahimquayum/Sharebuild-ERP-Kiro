import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getCompleteProjectReportData } from '@/lib/complete-project-report';
import { csvResponse, csvRows } from '@/lib/csv';
import { can } from '@/lib/permissions';
import { safeAuditLog } from '@/lib/audit';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const role = (session.user as any).role;
  if (!can(role, 'reports', 'export')) return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  const data = await getCompleteProjectReportData((session.user as any).companyId, params.id);
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
  await safeAuditLog({ userId: (session.user as any).id, projectId: data.project.id, action: 'CREATE', entityType: 'report_export', entityId: data.project.id, newValues: { report: 'top_sheet', format: 'csv' }, context: 'top sheet csv export' });
  return csvResponse(`top-sheet-${data.project.code ?? data.project.id}.csv`, csvRows(rows));
}

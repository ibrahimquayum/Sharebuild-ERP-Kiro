import { NextResponse } from 'next/server';
import { csvResponse, csvRows } from '@/lib/csv';
import { getChequeSummary } from '@/lib/cash-bank';
import { prisma } from '@/lib/prisma';
import { safeAuditLog } from '@/lib/audit';
import { apiAccessError, assertApiProjectPermission } from '@/lib/access-control';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const access = await assertApiProjectPermission({ projectId: params.id, module: 'reports', action: 'export' });
  if (!access.ok) return apiAccessError(access);

  const companyId = access.context.companyId;
  const project = await prisma.project.findFirst({ where: { id: params.id, companyId }, select: { id: true } });
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  const data = await getChequeSummary(companyId, project.id);

  const rows = [
    ['Cheque No', 'Type', 'Party', 'Bank', 'Cheque Date', 'Maturity Date', 'Amount', 'Status'],
    ...data.cheques.map((cheque) => [
      cheque.chequeNo,
      cheque.chequeType,
      cheque.partyName ?? cheque.partyType,
      cheque.bankName,
      cheque.chequeDate.toISOString().slice(0, 10),
      cheque.maturityDate?.toISOString().slice(0, 10) ?? '',
      Number(cheque.amount),
      cheque.status,
    ]),
  ];

  await safeAuditLog({ userId: access.context.userId, projectId: project.id, action: 'CREATE', entityType: 'report_export', entityId: project.id, newValues: { report: 'cheque_register', format: 'csv' }, context: 'cheque register csv export' });
  return csvResponse(`cheque-register-${project.id}.csv`, csvRows(rows));
}

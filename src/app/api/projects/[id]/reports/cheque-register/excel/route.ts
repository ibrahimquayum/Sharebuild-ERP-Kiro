import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { csvResponse, csvRows } from '@/lib/csv';
import { getChequeSummary } from '@/lib/cash-bank';
import { prisma } from '@/lib/prisma';
import { safeAuditLog } from '@/lib/audit';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const companyId = (session.user as any).companyId;
  const role = (session.user as any).role;
  if (!can(role, 'reports', 'export')) return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });

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

  await safeAuditLog({ userId: (session.user as any).id, projectId: project.id, action: 'CREATE', entityType: 'report_export', entityId: project.id, newValues: { report: 'cheque_register', format: 'csv' }, context: 'cheque register csv export' });
  return csvResponse(`cheque-register-${project.id}.csv`, csvRows(rows));
}

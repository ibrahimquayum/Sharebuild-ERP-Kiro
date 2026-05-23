import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { csvResponse, csvRows } from '@/lib/csv';
import { getProjectCashBankSummary } from '@/lib/cash-bank';
import { safeAuditLog } from '@/lib/audit';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const role = (session.user as any).role;
  if (!can(role, 'reports', 'export')) return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });

  const data = await getProjectCashBankSummary(params.id);
  if (!data) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

  const rows = [
    ['Date', 'Account', 'Source', 'Party', 'Method', 'Reference', 'Inflow', 'Outflow', 'Status'],
    ...data.transactions.map((transaction) => [
      transaction.transactionDate.toISOString().slice(0, 10),
      transaction.account.name,
      transaction.sourceType,
      transaction.partyName ?? '',
      transaction.paymentMethod,
      transaction.referenceNo ?? '',
      ['INFLOW', 'TRANSFER_IN'].includes(transaction.type) ? Number(transaction.amount) : '',
      ['OUTFLOW', 'TRANSFER_OUT'].includes(transaction.type) ? Number(transaction.amount) : '',
      transaction.status,
    ]),
  ];

  await safeAuditLog({ userId: (session.user as any).id, projectId: data.project.id, action: 'CREATE', entityType: 'report_export', entityId: data.project.id, newValues: { report: 'cash_bank_book', format: 'csv' }, context: 'cash bank book csv export' });
  return csvResponse(`cash-bank-book-${data.project.id}.csv`, csvRows(rows));
}

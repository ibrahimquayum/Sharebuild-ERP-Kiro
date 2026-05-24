import { NextResponse } from 'next/server';
import { csvResponse, csvRows } from '@/lib/csv';
import { getProjectCashBankSummary } from '@/lib/cash-bank';
import { safeAuditLog } from '@/lib/audit';
import { apiAccessError, assertApiProjectPermission } from '@/lib/access-control';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const access = await assertApiProjectPermission({ projectId: params.id, module: 'reports', action: 'export' });
  if (!access.ok) return apiAccessError(access);

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

  await safeAuditLog({ userId: access.context.userId, projectId: data.project.id, action: 'CREATE', entityType: 'report_export', entityId: data.project.id, newValues: { report: 'cash_bank_book', format: 'csv' }, context: 'cash bank book csv export' });
  return csvResponse(`cash-bank-book-${data.project.id}.csv`, csvRows(rows));
}

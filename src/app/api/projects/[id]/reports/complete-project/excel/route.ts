import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getCompleteProjectReportData } from '@/lib/complete-project-report';
import { csvResponse, csvSection } from '@/lib/csv';
import { formatDate } from '@/lib/utils';
import { safeAuditLog } from '@/lib/audit';
import { can } from '@/lib/permissions';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const companyId = (session.user as any).companyId;
  const role = (session.user as any).role;
  if (!can(role, 'reports', 'export')) return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });

  const data = await getCompleteProjectReportData(companyId, params.id);
  if (!data) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

  const content = [
    csvSection('Summary', [
      ['Company', data.branding.name],
      ['Project', data.project.name],
      ['Generated', data.generatedAt.toISOString()],
      ['Total Demand', data.summary.totalDemanded],
      ['Total Collection', data.summary.totalCollected],
      ['Buyer Receivable', data.summary.buyerReceivable],
      ['Buyer Advance', data.summary.buyerAdvance],
      ['Approved Expense', data.summary.totalExpense],
      ['Supplier Payable', data.summary.supplierPayable],
      ['Subcontractor Payable', data.summary.subcontractorPayable],
      ['Project Balance', data.summary.projectBalance],
    ]),
    csvSection('Top Sheet', [
      ['Phase', 'Type', 'Income', 'Expense', 'Balance'],
      ...data.topSheet.map((row) => [row.phaseName, row.phaseType, row.income, row.expense, row.balance]),
    ]),
    csvSection('Phase Summary', [
      ['Phase', 'Status', 'Demand', 'Collection', 'Approved Expense', 'Supplier Bill', 'Subcontractor Bill', 'Carry In', 'Carry Out', 'Audit Locked'],
      ...data.phaseSummary.map((row) => [row.phaseName, row.status, row.demand, row.collection, row.expense, row.supplierBill, row.subcontractorBill, row.carryIn, row.carryOut, row.auditLocked ? 'Yes' : 'No']),
    ]),
    csvSection('Daily Expenses', [
      ['Date', 'Phase', 'Category', 'Description', 'Supplier / Local Shop', 'Amount', 'Payment Method', 'Status', 'Voucher', 'Entered By', 'Approved By', 'Notes'],
      ...data.expenses.map((expense) => [formatDate(expense.expenseDate), expense.phase.name, expense.category, expense.description, expense.supplier?.name ?? expense.localShopName ?? 'Cash / no supplier', Number(expense.amount), expense.paymentMethod, expense.status, expense.documents.length > 0 ? 'Attached' : 'Missing', expense.createdBy.name, expense.approvedBy?.name ?? '', expense.notes ?? '']),
    ]),
    csvSection('Supplier Summary', [
      ['Supplier', 'Phase', 'Bill No', 'Bill Date', 'Bill Total', 'Paid', 'Payable', 'Status', 'Cheque Status'],
      ...data.supplierSummary.map((payable) => [payable.supplier.name, payable.phase?.name ?? 'Project general', payable.billNo ?? '', formatDate(payable.billDate), Number(payable.totalAmount), payable.validPaid, Number(payable.dueAmount), payable.status, payable.payments.find((payment) => payment.chequeStatus)?.chequeStatus ?? '']),
    ]),
    csvSection('Subcontractor Summary', [
      ['Subcontractor', 'Phase', 'Bill No', 'Bill Date', 'Bill Total', 'Paid', 'Due', 'Status', 'Documents'],
      ...data.subcontractorSummary.map((payable) => [payable.supplier.name, payable.phase?.name ?? 'Project general', payable.billNo ?? '', formatDate(payable.billDate), Number(payable.totalAmount), payable.validPaid, Number(payable.dueAmount), payable.status, payable.documents.length]),
    ]),
    csvSection('Buyer Due', [
      ['Buyer', 'Phone', 'Units', 'Demanded', 'Paid', 'Allocated', 'Due', 'Advance', 'Oldest Due'],
      ...data.buyerDue.map((row) => [row.buyerName, row.phone ?? '', row.units, row.demanded, row.paid, row.allocated, row.due, row.advance, formatDate(row.oldestDue)]),
    ]),
    csvSection('Audit Summary', [
      ['Type', 'Label', 'Amount', 'Reason'],
      ...data.auditSummary.reversedRecords.map((row) => [row.type, row.label, row.amount, row.reason]),
      [],
      ['Missing Voucher Count', data.auditSummary.missingVoucher.length],
      ['Pending Approval Count', data.auditSummary.pendingApprovals.length],
      ['Audit Locked Phase Count', data.auditSummary.lockedPhases.length],
    ]),
  ].join('\r\n');

  await safeAuditLog({
    userId: (session.user as any).id,
    projectId: data.project.id,
    action: 'CREATE',
    entityType: 'report_export',
    entityId: data.project.id,
    newValues: { report: 'complete_project', format: 'csv' },
    context: 'complete project report csv export',
  });

  return csvResponse(`complete-project-report-${data.project.code ?? data.project.id}.csv`, content);
}

import { NextResponse } from 'next/server';

import { apiAccessError, assertApiProjectPermission } from '@/lib/access-control';
import { safeAuditLog } from '@/lib/audit';
import { getCompleteProjectReportData } from '@/lib/complete-project-report';
import { csvResponse, csvSection } from '@/lib/csv';
import { parseProjectCostReportFilters } from '@/lib/report-controls';
import { expenseCategoryLabel, formatDate } from '@/lib/utils';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const access = await assertApiProjectPermission({ projectId: params.id, module: 'reports', action: 'export' });
  if (!access.ok) return apiAccessError(access);

  const filters = parseProjectCostReportFilters(new URL(req.url).searchParams);
  const data = await getCompleteProjectReportData(access.context.companyId, params.id, filters);
  if (!data) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

  const content = [
    csvSection('Project Overview', [
      ['Company', data.branding.name],
      ['Project', data.project.name],
      ['Generated', data.generatedAt.toISOString()],
      ['Reporting Period', data.reportingPeriod],
      ['Report Mode', filters.detailMode],
    ]),
    csvSection('Executive Summary', [
      ['Historical Collection', data.summary.totalCollected],
      ['Issued Demand', data.summary.issuedDemand],
      ['Final Reconciliation Demand', data.summary.finalReconciliationDemand],
      ['Allocated Collection', data.summary.allocatedCollection],
      ['Unallocated Collection', data.summary.unallocatedCollection],
      ['Buyer Receivable', data.summary.buyerReceivable],
      ['Buyer Advance', data.summary.buyerAdvance],
      ['Direct Expense', data.costReport.totals.DIRECT_EXPENSE],
      ['Supplier Bill Items', data.costReport.totals.SUPPLIER_BILL_ITEM],
      ['Subcontractor Bills', data.costReport.totals.SUBCONTRACTOR_BILL],
      ['Service Charge', data.costReport.totals.SERVICE_CHARGE],
      ['Unified Cost Total', data.costReport.totals.total],
      ['Project Balance', data.summary.projectBalance],
      ['Final Surplus / Deficit', data.summary.finalSurplusDeficit],
    ]),
    csvSection('Report Notes', data.reportNotes.map((note) => [note])),
    csvSection('Phase Summary', [
      ['Phase', 'Status', 'Collection', 'Direct Expense', 'Supplier Items', 'Subcontractor Bills', 'Service Charge', 'Total Billable Cost', 'Carry Out'],
      ...data.phaseSummary.map((row) => [
        row.phaseName,
        row.status,
        row.collection,
        row.directExpense,
        row.supplierBillItemTotal,
        row.subcontractorBillItemTotal,
        row.serviceChargeCostTotal,
        row.totalBillablePhaseCost,
        row.carryOut,
      ]),
    ]),
    csvSection('Phase Expense Breakdown', [
      ['Phase', 'Category', 'Rows', 'Amount'],
      ...data.costReport.phaseGroups.flatMap((group) =>
        group.categoryBreakdown.map((row) => [group.phaseName, expenseCategoryLabel(row.category), row.rowCount, row.amount]),
      ),
    ]),
    csvSection('Daily Project Cost Details', [
      ['Date', 'Phase', 'Source Type', 'Bill / Voucher', 'Party', 'Category', 'Description', 'Quantity', 'Unit', 'Rate', 'Amount', 'Voucher', 'Approval'],
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
    ]),
    csvSection('Buyer Billing & Due', [
      ['Buyer', 'Phone', 'Units', 'Issued Demand', 'Final Reconciliation', 'Collection', 'Allocated', 'Due', 'Advance'],
      ...data.buyerBillingSummary.map((row) => [
        row.buyerName,
        row.phone ?? '',
        row.unitsText || '',
        row.regularDemanded,
        row.finalReconciliationDemand,
        row.collected,
        row.allocated,
        row.due,
        row.advance,
      ]),
    ]),
    csvSection('Audit Summary', [
      ['Type', 'Record', 'Amount', 'Reason / Note'],
      ...data.auditSummary.reversedRecords.map((row) => [row.type, row.label, row.amount, row.reason]),
      ['Missing Voucher Count', '', data.auditSummary.missingVoucher.length, ''],
      ['Pending Approval Count', '', data.auditSummary.pendingApprovals.length, ''],
      ['Audit Locked Phase Count', '', data.auditSummary.lockedPhases.length, ''],
    ]),
  ].join('\r\n');

  await safeAuditLog({
    userId: access.context.userId,
    projectId: data.project.id,
    action: 'CREATE',
    entityType: 'report_export',
    entityId: data.project.id,
    newValues: { report: 'complete_project', format: 'csv' },
    context: 'complete project report csv export',
  });

  return csvResponse(`complete-project-report-${data.project.code ?? data.project.id}.csv`, content);
}

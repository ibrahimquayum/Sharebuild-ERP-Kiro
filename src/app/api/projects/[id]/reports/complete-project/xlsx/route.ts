import ExcelJS from 'exceljs';
import { NextResponse } from 'next/server';

import { apiAccessError, assertApiProjectPermission } from '@/lib/access-control';
import { safeAuditLog } from '@/lib/audit';
import { getCompleteProjectReportData } from '@/lib/complete-project-report';
import { parseProjectCostReportFilters } from '@/lib/report-controls';
import { expenseCategoryLabel, formatDate } from '@/lib/utils';

const CURRENCY_FORMAT = '"Tk" #,##0.00;[Red]-"Tk" #,##0.00';

function sanitizeSheetName(name: string) {
  return name.replace(/[\\/*?:[\]]/g, ' ').slice(0, 31);
}

function uniqueSheetName(workbook: ExcelJS.Workbook, name: string) {
  const base = sanitizeSheetName(name).trim() || 'Sheet';
  let candidate = base;
  let index = 2;
  while (workbook.getWorksheet(candidate)) {
    const suffix = ` ${index}`;
    candidate = `${base.slice(0, 31 - suffix.length)}${suffix}`;
    index += 1;
  }
  return candidate;
}

function phaseSheetName(prefix: string, phaseName: string, kind: 'Breakdown' | 'Daily Cost') {
  const cleanPhaseName = phaseName.replace(/\s+/g, ' ').trim();
  return `${prefix} ${kind} - ${cleanPhaseName}`;
}

function sectionHeader(worksheet: ExcelJS.Worksheet, title: string, subtitle: string, company: string, project: string) {
  worksheet.mergeCells('A1:H1');
  worksheet.getCell('A1').value = title;
  worksheet.getCell('A1').font = { size: 18, bold: true, color: { argb: '1F2937' } };
  worksheet.getCell('A1').alignment = { vertical: 'middle' };

  worksheet.mergeCells('A2:H2');
  worksheet.getCell('A2').value = subtitle;
  worksheet.getCell('A2').font = { size: 10, color: { argb: '475569' } };

  worksheet.mergeCells('A3:H3');
  worksheet.getCell('A3').value = `${company} | ${project}`;
  worksheet.getCell('A3').font = { size: 10, color: { argb: '64748B' } };
}

function setColumnWidths(worksheet: ExcelJS.Worksheet, widths: number[]) {
  worksheet.columns = widths.map((width) => ({ width }));
}

function styleHeaderRow(row: ExcelJS.Row) {
  row.font = { bold: true, color: { argb: '334155' } };
  row.alignment = { vertical: 'middle', horizontal: 'center' };
  row.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'E2E8F0' },
  };
  row.eachCell((cell) => {
    cell.border = {
      top: { style: 'thin', color: { argb: 'CBD5E1' } },
      left: { style: 'thin', color: { argb: 'CBD5E1' } },
      bottom: { style: 'thin', color: { argb: 'CBD5E1' } },
      right: { style: 'thin', color: { argb: 'CBD5E1' } },
    };
  });
}

function styleBodyRows(worksheet: ExcelJS.Worksheet, startRow: number, endRow: number, currencyColumns: number[] = []) {
  for (let rowIndex = startRow; rowIndex <= endRow; rowIndex += 1) {
    const row = worksheet.getRow(rowIndex);
    row.alignment = { vertical: 'top' };
    row.eachCell((cell, colNumber) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'E2E8F0' } },
        left: { style: 'thin', color: { argb: 'E2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'E2E8F0' } },
        right: { style: 'thin', color: { argb: 'E2E8F0' } },
      };
      if (currencyColumns.includes(colNumber) && typeof cell.value === 'number') {
        cell.numFmt = CURRENCY_FORMAT;
        cell.alignment = { horizontal: 'right', vertical: 'top' };
      }
    });
  }
}

function addTableSheet(
  workbook: ExcelJS.Workbook,
  input: {
    name: string;
    title: string;
    subtitle: string;
    company: string;
    project: string;
    headers: string[];
    rows: Array<Array<string | number | Date | null>>;
    widths: number[];
    currencyColumns?: number[];
  },
) {
  const worksheet = workbook.addWorksheet(uniqueSheetName(workbook, input.name), {
    views: [{ state: 'frozen', ySplit: 5 }],
  });

  setColumnWidths(worksheet, input.widths);
  sectionHeader(worksheet, input.title, input.subtitle, input.company, input.project);

  const headerRow = worksheet.addRow(input.headers);
  styleHeaderRow(headerRow);

  const startRow = headerRow.number + 1;
  input.rows.forEach((row) => worksheet.addRow(row));
  const endRow = worksheet.rowCount;
  if (endRow >= startRow) {
    styleBodyRows(worksheet, startRow, endRow, input.currencyColumns);
  }

  return worksheet;
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const access = await assertApiProjectPermission({ projectId: params.id, module: 'reports', action: 'export' });
  if (!access.ok) return apiAccessError(access);

  const filters = parseProjectCostReportFilters(new URL(req.url).searchParams);
  const data = await getCompleteProjectReportData(access.context.companyId, params.id, filters);
  if (!data) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Sharebuild ERP';
  workbook.company = data.branding.name;
  workbook.subject = `${data.project.name} Complete Project Report`;
  workbook.title = `${data.project.name} Complete Project Report`;
  workbook.created = data.generatedAt;
  workbook.modified = data.generatedAt;

  const indexSheet = workbook.addWorksheet('00 Index', {
    views: [{ state: 'frozen', ySplit: 5 }],
  });
  setColumnWidths(indexSheet, [34, 68, 18]);
  sectionHeader(
    indexSheet,
    'Complete Project Report Index',
    'Table of contents for the controlled workbook export',
    data.branding.name,
    data.project.name,
  );
  const indexHeader = indexSheet.addRow(['Sheet', 'Purpose', 'Link']);
  styleHeaderRow(indexHeader);
  const workbookIndexRows: Array<{ sheetName: string; purpose: string }> = [];
  const trackSheet = (worksheet: ExcelJS.Worksheet, purpose: string) => {
    workbookIndexRows.push({ sheetName: worksheet.name, purpose });
    return worksheet;
  };

  const overviewSheet = trackSheet(workbook.addWorksheet('01 Project Overview'), 'Project identity, report controls, reporting period, and historical continuity.');
  setColumnWidths(overviewSheet, [28, 30, 24, 44]);
  sectionHeader(
    overviewSheet,
    'Project Overview',
    'Project identity, report controls, and historical continuity',
    data.branding.name,
    data.project.name,
  );
  const overviewRows = [
    ['Company', data.branding.name, 'Project', data.project.name],
    ['Project Code', data.project.code ?? '', 'Reporting Period', data.reportingPeriod],
    ['Generated At', `${formatDate(data.generatedAt)} ${data.generatedAt.toLocaleTimeString('en-BD', { hour: '2-digit', minute: '2-digit' })}`, 'Generated By', access.context.session?.user?.name ?? access.context.userId],
    ['Report Mode', filters.detailMode, 'Visible Sections', filters.sections.join(', ')],
    ['Phase Filter', filters.phaseIds.join(', ') || 'All phases', 'Source Types', filters.sourceTypes.join(', ') || 'All cost sources'],
    ['Party Search', filters.partySearch ?? 'Any', 'Voucher Filter', filters.voucherStatus],
    ['Historical Income', data.summary.totalCollected, 'Historical Expense', data.summary.totalExpense],
    ['Historical Balance', data.summary.projectBalance, 'Filtered Cost Rows', data.costReport.rows.length],
  ];
  overviewRows.forEach((row) => overviewSheet.addRow(row));
  styleBodyRows(overviewSheet, 4, overviewSheet.rowCount, [2, 4]);
  overviewSheet.addRow([]);
  const notesHeader = overviewSheet.addRow(['Report Notes']);
  notesHeader.font = { bold: true, color: { argb: '334155' } };
  data.reportNotes.forEach((note) => overviewSheet.addRow([note]));

  const executiveSheet = trackSheet(workbook.addWorksheet('02 Executive Summary'), 'Financial summary of demand, collection, cost, payable, treasury, and audit exposure.');
  setColumnWidths(executiveSheet, [32, 20, 32, 20]);
  sectionHeader(
    executiveSheet,
    'Executive Summary',
    'Financial story, demand context, and unified project cost totals',
    data.branding.name,
    data.project.name,
  );
  [
    ['Historical Collection', data.summary.totalCollected, 'Issued Demand', data.summary.issuedDemand],
    ['Final Reconciliation Demand', data.summary.finalReconciliationDemand, 'Allocated Collection', data.summary.allocatedCollection],
    ['Unallocated Collection', data.summary.unallocatedCollection, 'Buyer Due', data.summary.buyerReceivable],
    ['Buyer Advance', data.summary.buyerAdvance, 'Direct Expense', data.costReport.totals.DIRECT_EXPENSE],
    ['Supplier Bill Items', data.costReport.totals.SUPPLIER_BILL_ITEM, 'Subcontractor Bills', data.costReport.totals.SUBCONTRACTOR_PROGRESS_BILL],
    ['Company Service Charge / Supervision Fee', data.costReport.totals.COMPANY_SERVICE_CHARGE, 'Unified Cost Total', data.costReport.totals.total],
    ['Supplier Payable', data.summary.supplierPayable, 'Subcontractor Payable', data.summary.subcontractorPayable],
    ['Cash In', data.summary.cashIn, 'Cash Out', data.summary.cashOut],
    ['Project Balance', data.summary.projectBalance, 'Final Surplus / Deficit', data.summary.finalSurplusDeficit],
    ['Missing Vouchers', data.auditSummary.missingVoucher.length, 'Pending Approvals', data.auditSummary.pendingApprovals.length],
  ].forEach((row) => executiveSheet.addRow(row));
  styleBodyRows(executiveSheet, 4, executiveSheet.rowCount, [2, 4]);

  trackSheet(addTableSheet(workbook, {
    name: '03 Phase Summary',
    title: 'Phase Summary',
    subtitle: 'Phase-wise collection, unified cost mix, and surplus / deficit',
    company: data.branding.name,
    project: data.project.name,
    headers: ['Phase', 'Status', 'Collection', 'Direct Expense', 'Supplier Items', 'Subcontractor Bills', 'Company Service Charge / Supervision Fee', 'Total Billable Cost', 'Phase Balance'],
    rows: data.phaseSummary.map((row) => [
      row.phaseName,
      row.status,
      row.collection,
      row.directExpense,
      row.supplierBillItemTotal,
      row.subcontractorBillItemTotal,
      row.serviceChargeCostTotal,
      row.totalBillablePhaseCost,
      row.phaseBalance,
    ]),
    widths: [28, 18, 16, 16, 18, 18, 16, 18, 16],
    currencyColumns: [3, 4, 5, 6, 7, 8, 9],
  }), 'Phase-wise collection, actual construction cost, service charge, billable cost, and phase balance.');

  trackSheet(addTableSheet(workbook, {
    name: '04 All Phase Breakdown',
    title: 'Phase Expense Breakdown',
    subtitle: 'Category-wise cost breakdown for each visible phase',
    company: data.branding.name,
    project: data.project.name,
    headers: ['Phase', 'Category', 'Rows', 'Amount'],
    rows: data.costReport.phaseGroups.flatMap((group) =>
      group.categoryBreakdown.map((row) => [
        group.phaseName,
        expenseCategoryLabel(row.category),
        row.rowCount,
        row.amount,
      ]),
    ),
    widths: [28, 26, 12, 18],
    currencyColumns: [4],
  }), 'All visible phase category breakdown rows from the unified project cost report.');

  trackSheet(addTableSheet(workbook, {
    name: '05 All Daily Cost Details',
    title: 'Daily Project Cost Details',
    subtitle: 'Unified line-by-line project cost register',
    company: data.branding.name,
    project: data.project.name,
    headers: ['Date', 'Phase', 'Source Type', 'Bill / Voucher', 'Party', 'Category', 'Description', 'Qty', 'Unit', 'Rate', 'Amount', 'Voucher', 'Approval'],
    rows: data.costReport.rows.map((row) => [
      formatDate(row.date),
      row.phaseName,
      row.sourceType.replaceAll('_', ' '),
      row.sourceNo,
      row.partyName,
      expenseCategoryLabel(row.category),
      row.description,
      row.quantity ?? null,
      row.unit ?? '',
      row.rate ?? null,
      row.amount,
      row.voucherStatus.replaceAll('_', ' '),
      row.approvalStatus.replaceAll('_', ' '),
    ]),
    widths: [14, 24, 18, 18, 24, 20, 32, 10, 10, 14, 16, 14, 16],
    currencyColumns: [10, 11],
  }), 'All visible daily project cost rows, including supplier bill item lines and service charge rows.');

  trackSheet(addTableSheet(workbook, {
    name: '06 Buyer Billing Due',
    title: 'Buyer Billing & Due',
    subtitle: 'Buyer-wise demand, collection, due, and advance position',
    company: data.branding.name,
    project: data.project.name,
    headers: ['Buyer', 'Phone', 'Units', 'Issued Demand', 'Final Reconciliation', 'Collection', 'Allocated', 'Due', 'Advance'],
    rows: data.buyerBillingSummary.map((row) => [
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
    widths: [26, 18, 30, 16, 18, 16, 16, 16, 16],
    currencyColumns: [4, 5, 6, 7, 8, 9],
  }), 'Buyer-wise demand, collection, allocation, due, and advance.');

  trackSheet(addTableSheet(workbook, {
    name: '07 Supplier Ledger',
    title: 'Supplier Ledger',
    subtitle: 'Supplier billed value, paid amount, due, and document quality',
    company: data.branding.name,
    project: data.project.name,
    headers: ['Supplier', 'Assignment / Contract', 'Bill Total', 'Paid', 'Payable', 'Missing Invoice Bills', 'Document Count'],
    rows: data.projectSupplierAssignments.map((assignment) => [
      assignment.supplier.name,
      assignment.materialCategory || assignment.paymentTerms || 'General supplier assignment',
      assignment.summary.totalBilled,
      assignment.summary.totalPaid,
      assignment.summary.totalDue,
      assignment.summary.missingInvoiceCount,
      assignment.summary.documentCount,
    ]),
    widths: [28, 28, 16, 16, 16, 18, 16],
    currencyColumns: [3, 4, 5],
  }), 'Supplier-wise payable and payment summary kept separate from daily cost details.');

  trackSheet(addTableSheet(workbook, {
    name: '08 Subcontractor Ledger',
    title: 'Subcontractor Ledger',
    subtitle: 'Subcontractor billed value, due, retention, and document quality',
    company: data.branding.name,
    project: data.project.name,
    headers: ['Subcontractor', 'Work Type', 'Contract Amount', 'Bill Total', 'Paid', 'Due', 'Retention', 'Document Quality'],
    rows: data.projectSubcontractorAssignments.map((assignment) => [
      assignment.supplier.name,
      assignment.workType.replaceAll('_', ' '),
      Number(assignment.contractAmount ?? 0) + Number(assignment.extraWorkAmount ?? 0),
      assignment.summary.totalBilled,
      assignment.summary.totalPaid,
      assignment.summary.totalDue,
      assignment.payables.reduce((sum, payable) => sum + Number(payable.retentionAmount ?? 0), 0),
      assignment.summary.missingAgreement || assignment.summary.missingMeasurement ? 'Review docs' : 'Ready',
    ]),
    widths: [28, 22, 18, 16, 16, 16, 16, 18],
    currencyColumns: [3, 4, 5, 6, 7],
  }), 'Subcontractor work-package ledger with contract, bill, paid, due, retention, and document quality.');

  trackSheet(addTableSheet(workbook, {
    name: '09 Cash Bank Book',
    title: 'Cash Bank Book',
    subtitle: 'Account-wise treasury movement for the selected report slice',
    company: data.branding.name,
    project: data.project.name,
    headers: ['Account', 'Type', 'Opening', 'Cash In', 'Cash Out', 'Balance'],
    rows: (data.cashBankSummary?.accountsUsed ?? []).map((account) => [
      account.accountName,
      account.type.replaceAll('_', ' '),
      account.openingBalance,
      account.inflow,
      account.outflow,
      account.balance,
    ]),
    widths: [28, 18, 16, 16, 16, 16],
    currencyColumns: [3, 4, 5, 6],
  }), 'Account-wise treasury movement for the selected report slice.');

  trackSheet(addTableSheet(workbook, {
    name: '10 Cheque Register',
    title: 'Cheque Register',
    subtitle: 'Issued and received cheque log for the selected report slice',
    company: data.branding.name,
    project: data.project.name,
    headers: ['Cheque No', 'Type', 'Party', 'Date', 'Amount', 'Status', 'Source'],
    rows: data.chequeSummary.cheques.map((cheque) => [
      cheque.chequeNo,
      cheque.chequeType.replaceAll('_', ' '),
      cheque.partyName ?? cheque.partyType,
      formatDate(cheque.chequeDate),
      Number(cheque.amount),
      cheque.status,
      cheque.sourceType.replaceAll('_', ' '),
    ]),
    widths: [18, 16, 24, 14, 16, 16, 18],
    currencyColumns: [5],
  }), 'Issued and received cheque register for the selected report slice.');

  trackSheet(addTableSheet(workbook, {
    name: '11 Tax Deduction',
    title: 'Tax Deduction',
    subtitle: 'VAT, AIT / TDS, and other bill-level deductions',
    company: data.branding.name,
    project: data.project.name,
    headers: ['Party', 'Bill', 'Reference', 'VAT', 'AIT / TDS', 'Other'],
    rows: [...data.supplierSummary, ...data.subcontractorSummary]
      .filter((payable) => Number(payable.vatAmount ?? 0) > 0 || Number(payable.aitTdsAmount ?? 0) > 0 || Number(payable.otherDeductionAmount ?? 0) > 0)
      .map((payable) => [
        payable.supplier.name,
        payable.billNo ?? 'Project bill',
        payable.deductionReference ?? '',
        Number(payable.vatAmount ?? 0),
        Number(payable.aitTdsAmount ?? 0),
        Number(payable.otherDeductionAmount ?? 0),
    ]),
    widths: [28, 18, 20, 16, 16, 16],
    currencyColumns: [4, 5, 6],
  }), 'VAT, AIT/TDS, and other bill-level deductions.');

  trackSheet(addTableSheet(workbook, {
    name: '12 Retention',
    title: 'Retention',
    subtitle: 'Retention held, released, and outstanding',
    company: data.branding.name,
    project: data.project.name,
    headers: ['Party', 'Bill', 'Held', 'Released', 'Outstanding', 'Status'],
    rows: [...data.supplierSummary, ...data.subcontractorSummary]
      .filter((payable) => Number(payable.retentionAmount ?? 0) > 0)
      .map((payable) => [
        payable.supplier.name,
        payable.billNo ?? 'Project bill',
        Number(payable.retentionAmount ?? 0),
        Number(payable.retentionReleasedAmount ?? 0),
        Math.max(Number(payable.retentionAmount ?? 0) - Number(payable.retentionReleasedAmount ?? 0), 0),
        payable.retentionStatus.replaceAll('_', ' '),
    ]),
    widths: [28, 18, 16, 16, 18, 16],
    currencyColumns: [3, 4, 5],
  }), 'Retention held, released, and outstanding by bill.');

  trackSheet(addTableSheet(workbook, {
    name: '13 Service Charge',
    title: 'Company Service Charge / Supervision Fee',
    subtitle: 'Phase service charge basis, settlement, and demand inclusion visibility',
    company: data.branding.name,
    project: data.project.name,
    headers: ['Phase / Work', 'Basis Amount', 'Percent', 'Service Charge', 'Settlement', 'Included in Demand'],
    rows: (data.serviceChargeLedger?.rows ?? []).map((row) => [
      row.phaseName,
      row.basisAmount,
      Number(row.percentage ?? 0),
      row.serviceChargeAmount,
      row.settlementStatus.replaceAll('_', ' '),
      row.includedInDemand ? 'Yes' : 'No',
    ]),
    widths: [28, 16, 14, 16, 18, 16],
    currencyColumns: [2, 4],
  }), 'Company Service Charge / Supervision Fee by phase or manual entry.');

  trackSheet(addTableSheet(workbook, {
    name: '14 Final Reconciliation',
    title: 'Final Reconciliation',
    subtitle: 'Ownership-based final surplus / deficit distribution',
    company: data.branding.name,
    project: data.project.name,
    headers: ['Buyer', 'Units', 'Share %', 'Amount', 'Direction'],
    rows: (data.reconciliationPreview?.distribution ?? []).map((row) => [
      row.buyerName,
      row.units,
      row.sharePercent,
      row.amount,
      data.reconciliationPreview?.direction ?? 'BALANCED',
    ]),
    widths: [28, 34, 14, 16, 16],
    currencyColumns: [4],
  }), 'Ownership-based final reconciliation distribution.');

  trackSheet(addTableSheet(workbook, {
    name: '15 Audit Summary',
    title: 'Audit Summary',
    subtitle: 'Voucher gaps, pending approvals, reversals, and limitations',
    company: data.branding.name,
    project: data.project.name,
    headers: ['Type', 'Record', 'Amount', 'Reason / Note'],
    rows: [
      ...data.auditSummary.reversedRecords.map((row) => [row.type, row.label, row.amount, row.reason] as Array<string | number>),
      ['Missing Voucher Count', '', data.auditSummary.missingVoucher.length, ''],
      ['Pending Approval Count', '', data.auditSummary.pendingApprovals.length, ''],
      ['Audit Locked Phase Count', '', data.auditSummary.lockedPhases.length, ''],
    ],
    widths: [24, 36, 16, 38],
    currencyColumns: [3],
  }), 'Voucher gaps, pending approvals, reversals, audit locks, and report limitations.');

  data.costReport.phases.forEach((phase, index) => {
    const group = data.costReport.phaseGroups.find((item) => item.phaseId === phase.id) ?? {
      phaseId: phase.id,
      phaseName: phase.name,
      phaseSequence: phase.sequence,
      rows: [],
      totals: {
        DIRECT_EXPENSE: 0,
        SUPPLIER_BILL_ITEM: 0,
        SUBCONTRACTOR_PROGRESS_BILL: 0,
        COMPANY_SERVICE_CHARGE: 0,
        ADJUSTMENT: 0,
      },
      totalCost: 0,
      voucherMissingCount: 0,
      pendingCount: 0,
      reversedCount: 0,
      categoryBreakdown: [],
    };
    const prefix = `P${String(index + 1).padStart(2, '0')}`;
    trackSheet(addTableSheet(workbook, {
      name: phaseSheetName(prefix, group.phaseName, 'Breakdown'),
      title: `${group.phaseName} - Category Breakdown`,
      subtitle: 'Phase-specific category totals from the unified project cost builder',
      company: data.branding.name,
      project: data.project.name,
      headers: ['Category', 'Rows', 'Amount', 'Percent of Phase Billable Cost'],
      rows: group.categoryBreakdown.map((row) => [
        expenseCategoryLabel(row.category),
        row.rowCount,
        row.amount,
        group.totalCost > 0 ? Number(((row.amount / group.totalCost) * 100).toFixed(2)) : 0,
      ]),
      widths: [30, 12, 18, 22],
      currencyColumns: [3],
    }), `${group.phaseName} phase-specific category breakdown.`);

    trackSheet(addTableSheet(workbook, {
      name: phaseSheetName(prefix, group.phaseName, 'Daily Cost'),
      title: `${group.phaseName} - Daily Project Cost Details`,
      subtitle: 'Phase-specific direct expense, supplier bill item, subcontractor bill, and service charge rows',
      company: data.branding.name,
      project: data.project.name,
      headers: ['Date', 'Source Type', 'Bill / Voucher', 'Party', 'Category', 'Description', 'Qty', 'Unit', 'Rate', 'Amount', 'Voucher', 'Approval', 'Notes'],
      rows: group.rows.map((row) => [
        formatDate(row.date),
        row.sourceType.replaceAll('_', ' '),
        row.sourceNo,
        row.partyName,
        expenseCategoryLabel(row.category),
        row.description,
        row.quantity ?? null,
        row.unit ?? '',
        row.rate ?? null,
        row.amount,
        row.voucherStatus.replaceAll('_', ' '),
        row.approvalStatus.replaceAll('_', ' '),
        row.notes,
      ]),
      widths: [14, 24, 18, 24, 20, 34, 10, 10, 14, 16, 14, 16, 32],
      currencyColumns: [9, 10],
    }), `${group.phaseName} phase-specific daily project cost detail.`);
  });

  workbookIndexRows.forEach((row) => {
    const entry = indexSheet.addRow([
      row.sheetName,
      row.purpose,
      { text: 'Open sheet', hyperlink: `#'${row.sheetName.replaceAll("'", "''")}'!A1` },
    ]);
    entry.getCell(1).font = { bold: true, color: { argb: '1F2937' } };
    entry.getCell(3).font = { color: { argb: '2563EB' }, underline: true };
  });
  styleBodyRows(indexSheet, 5, indexSheet.rowCount);

  const buffer = await workbook.xlsx.writeBuffer();
  const stamp = data.generatedAt.toISOString().slice(0, 10);

  await safeAuditLog({
    userId: access.context.userId,
    projectId: data.project.id,
    action: 'CREATE',
    entityType: 'report_export',
    entityId: data.project.id,
    newValues: { report: 'complete_project', format: 'xlsx', filtered: exportQueryPresent(filters) },
    context: 'complete project report xlsx export',
  });

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="complete-project-report-${data.project.code ?? data.project.id}-${stamp}.xlsx"`,
      'Cache-Control': 'no-store',
    },
  });
}

function exportQueryPresent(filters: ReturnType<typeof parseProjectCostReportFilters>) {
  return Boolean(
    filters.from ||
      filters.to ||
      filters.phaseIds.length ||
      filters.sourceTypes.length ||
      filters.categories.length ||
      filters.partySearch ||
      filters.approvalStatuses.length ||
      filters.voucherStatus !== 'all' ||
      filters.includeDraftPending ||
      filters.includeReversedCancelled,
  );
}

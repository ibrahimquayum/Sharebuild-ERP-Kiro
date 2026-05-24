import { NextResponse } from 'next/server';
import JSZip from 'jszip';

import { apiAccessError, assertApiProjectPermission } from '@/lib/access-control';
import { safeAuditLog } from '@/lib/audit';
import { getCompleteProjectReportData } from '@/lib/complete-project-report';
import { formatDate } from '@/lib/utils';

type WorkbookSheet = { name: string; rows: unknown[][] };

function xml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function colName(index: number) {
  let name = '';
  let current = index + 1;
  while (current > 0) {
    const remainder = (current - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    current = Math.floor((current - 1) / 26);
  }
  return name;
}

function appendSheet(sheets: WorkbookSheet[], name: string, rows: unknown[][]) {
  sheets.push({ name: name.slice(0, 31), rows });
}

function sheetXml(rows: unknown[][]) {
  const rowXml = rows
    .map((row, rowIndex) => {
      const cellXml = row
        .map((cell, cellIndex) => {
          const ref = `${colName(cellIndex)}${rowIndex + 1}`;
          if (typeof cell === 'number' && Number.isFinite(cell)) return `<c r="${ref}"><v>${cell}</v></c>`;
          return `<c r="${ref}" t="inlineStr"><is><t>${xml(cell)}</t></is></c>`;
        })
        .join('');
      return `<row r="${rowIndex + 1}">${cellXml}</row>`;
    })
    .join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rowXml}</sheetData></worksheet>`;
}

async function workbookBuffer(sheets: WorkbookSheet[]) {
  const zip = new JSZip();
  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>${sheets.map((_, index) => `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`);
  zip.folder('_rels')!.file('.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>`);
  zip.folder('docProps')!.file('core.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/"><dc:creator>Sharebuild ERP</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">${new Date().toISOString()}</dcterms:created></cp:coreProperties>`);
  zip.folder('docProps')!.file('app.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>Sharebuild ERP</Application></Properties>`);
  const workbookSheets = sheets.map((sheet, index) => `<sheet name="${xml(sheet.name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`).join('');
  zip.folder('xl')!.file('workbook.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${workbookSheets}</sheets></workbook>`);
  zip.folder('xl')!.folder('_rels')!.file('workbook.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, index) => `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`).join('')}</Relationships>`);
  const worksheets = zip.folder('xl')!.folder('worksheets')!;
  sheets.forEach((sheet, index) => worksheets.file(`sheet${index + 1}.xml`, sheetXml(sheet.rows)));
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const access = await assertApiProjectPermission({ projectId: params.id, module: 'reports', action: 'export' });
  if (!access.ok) return apiAccessError(access);

  const data = await getCompleteProjectReportData(access.context.companyId, params.id);
  if (!data) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

  const wb: WorkbookSheet[] = [];
  appendSheet(wb, 'Summary', [
    ['Company', data.branding.name],
    ['Project', data.project.name],
    ['Generated', data.generatedAt.toISOString()],
    [],
    ['Metric', 'BDT'],
    ['Total Demand', data.summary.totalDemanded],
    ['Total Collection', data.summary.totalCollected],
    ['Buyer Receivable', data.summary.buyerReceivable],
    ['Buyer Advance', data.summary.buyerAdvance],
    ['Approved Expense', data.summary.totalExpense],
    ['Service Charge', data.summary.serviceChargeAccrued],
    ['Tax / Deductions', data.summary.taxDeductionTotal],
    ['Retention Held', data.summary.retentionHeld],
    ['Supplier Payable', data.summary.supplierPayable],
    ['Subcontractor Payable', data.summary.subcontractorPayable],
    ['Project Balance', data.summary.projectBalance],
  ]);
  appendSheet(wb, 'Top Sheet', [
    ['Phase', 'Type', 'Income', 'Expense', 'Balance'],
    ...data.topSheet.map((row) => [row.phaseName, row.phaseType, row.income, row.expense, row.balance]),
  ]);
  appendSheet(wb, 'Phase Summary', [
    ['Phase', 'Status', 'Demand', 'Collection', 'Expense', 'Supplier Bill', 'Subcontractor Bill', 'Carry In', 'Carry Out', 'Audit Locked'],
    ...data.phaseSummary.map((row) => [row.phaseName, row.status, row.demand, row.collection, row.expense, row.supplierBill, row.subcontractorBill, row.carryIn, row.carryOut, row.auditLocked ? 'Yes' : 'No']),
  ]);
  appendSheet(wb, 'Daily Expenses', [
    ['Date', 'Phase', 'Category', 'Description', 'Supplier / Local Shop', 'Amount', 'Payment Method', 'Status', 'Voucher'],
    ...data.expenses.map((expense) => [formatDate(expense.expenseDate), expense.phase.name, expense.category, expense.description, expense.supplier?.name ?? expense.localShopName ?? 'Cash / no supplier', Number(expense.amount), expense.paymentMethod, expense.status, expense.documents.length > 0 ? 'Attached' : 'Missing']),
  ]);
  appendSheet(wb, 'Supplier Ledger', [
    ['Supplier', 'Phase', 'Bill No', 'Bill Date', 'Bill Total', 'Paid', 'Payable', 'Status'],
    ...data.supplierSummary.map((payable) => [payable.supplier.name, payable.phase?.name ?? 'Project general', payable.billNo ?? '', formatDate(payable.billDate), Number(payable.totalAmount), payable.validPaid, Number(payable.dueAmount), payable.status]),
  ]);
  appendSheet(wb, 'Subcontractor Ledger', [
    ['Subcontractor', 'Phase', 'Bill No', 'Bill Date', 'Bill Total', 'Paid', 'Due', 'Status'],
    ...data.subcontractorSummary.map((payable) => [payable.supplier.name, payable.phase?.name ?? 'Project general', payable.billNo ?? '', formatDate(payable.billDate), Number(payable.totalAmount), payable.validPaid, Number(payable.dueAmount), payable.status]),
  ]);
  appendSheet(wb, 'Buyer Due', [
    ['Buyer', 'Phone', 'Units', 'Demanded', 'Paid', 'Allocated', 'Due', 'Advance', 'Oldest Due'],
    ...data.buyerDue.map((row) => [row.buyerName, row.phone ?? '', row.unitsText || '', row.demanded, row.paid, row.allocated, row.due, row.advance, formatDate(row.oldestDue)]),
  ]);
  appendSheet(wb, 'Cash Bank Book', [
    ['Metric', 'BDT'],
    ['Cash In', data.summary.cashIn],
    ['Cash Out', data.summary.cashOut],
    ['Pending Received Cheques', data.summary.pendingReceivedCheques],
    ['Pending Issued Cheques', data.summary.pendingIssuedCheques],
  ]);
  appendSheet(wb, 'Cheques', [
    ['Metric', 'BDT'],
    ['Pending Received Cheques', data.summary.pendingReceivedCheques],
    ['Pending Issued Cheques', data.summary.pendingIssuedCheques],
  ]);
  appendSheet(wb, 'Tax Deductions', [
    ['Party', 'Bill No', 'VAT', 'AIT/TDS', 'Other Deduction', 'Reference'],
    ...[...data.supplierSummary, ...data.subcontractorSummary]
      .filter((payable) => Number(payable.vatAmount ?? 0) > 0 || Number(payable.aitTdsAmount ?? 0) > 0 || Number(payable.otherDeductionAmount ?? 0) > 0)
      .map((payable) => [payable.supplier.name, payable.billNo ?? '', Number(payable.vatAmount ?? 0), Number(payable.aitTdsAmount ?? 0), Number(payable.otherDeductionAmount ?? 0), payable.deductionReference ?? '']),
  ]);
  appendSheet(wb, 'Retention', [
    ['Party', 'Bill No', 'Held', 'Released', 'Outstanding', 'Status'],
    ...[...data.supplierSummary, ...data.subcontractorSummary]
      .filter((payable) => Number(payable.retentionAmount ?? 0) > 0)
      .map((payable) => [payable.supplier.name, payable.billNo ?? '', Number(payable.retentionAmount ?? 0), Number(payable.retentionReleasedAmount ?? 0), Math.max(Number(payable.retentionAmount ?? 0) - Number(payable.retentionReleasedAmount ?? 0), 0), payable.retentionStatus]),
  ]);
  appendSheet(wb, 'Service Charge', [
    ['Phase', 'Basis', 'Status', 'Service Charge', 'Settlement'],
    ...(data.serviceChargeLedger?.rows ?? []).map((row) => [row.phaseName, row.basisType, row.status, row.serviceChargeAmount, row.settlementStatus]),
  ]);
  appendSheet(wb, 'Final Reconciliation', [
    ['Metric', 'BDT'],
    ['Surplus / Deficit', data.summary.surplusDeficit],
  ]);
  appendSheet(wb, 'Audit Summary', [
    ['Type', 'Label', 'Amount', 'Reason'],
    ...data.auditSummary.reversedRecords.map((row) => [row.type, row.label, row.amount, row.reason]),
    [],
    ['Missing Voucher Count', data.auditSummary.missingVoucher.length],
    ['Pending Approval Count', data.auditSummary.pendingApprovals.length],
    ['Audit Locked Phase Count', data.auditSummary.lockedPhases.length],
  ]);

  await safeAuditLog({
    userId: access.context.userId,
    projectId: data.project.id,
    action: 'CREATE',
    entityType: 'report_export',
    entityId: data.project.id,
    newValues: { report: 'complete_project', format: 'xlsx' },
    context: 'complete project report xlsx export',
  });

  const buffer = await workbookBuffer(wb);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="complete-project-report-${data.project.code ?? data.project.id}.xlsx"`,
    },
  });
}

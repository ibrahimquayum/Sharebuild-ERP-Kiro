# Report Control, Invoice, And Dummy Data Phase

**Date:** May 25, 2026  
**Branch:** `feat/erp-v1`

## Current Report / Export Weaknesses Found

- Reports were becoming visually professional, but screen output, print output, CSV output, and XLSX output were still too easy to drift apart.
- Expense-style reporting treated direct expenses, supplier bills, subcontractor bills, and service charge as separate silos instead of one project-cost story.
- Supplier bill items were not consistently surfaced inside daily project cost detail, even though they are part of project cost.
- Several printable business documents were missing, so finance workflows still depended on raw detail pages instead of proper receipts, vouchers, and invoices.
- Seed data was strong for legacy/historical totals, but too thin for verifying the full modern demand, vendor, treasury, and reconciliation reporting path.

## Unified Project Cost Data Model

The report engine now uses one shared cost-row builder:

- `src/lib/project-cost-report.ts`

It produces unified project cost rows from:

- direct expenses
- supplier bill line items
- subcontractor progress/work bills
- approved service charge entries
- adjustments where available through the existing finance record state

Each row carries:

- project and phase identity
- transaction date
- source type
- bill or voucher reference
- category and description
- party name
- quantity, unit, rate, amount
- payment method
- voucher status
- approval status
- linked document count
- notes

### Accounting Rule Preserved

- Supplier bill items appear inside Daily Project Cost Details.
- Supplier and subcontractor payments do **not** appear as project cost rows.
- Supplier Ledger and Subcontractor Ledger remain separate party/accounting reports for billed, paid, and payable relationships.

## Report Control / Filter Plan Implemented

Shared report controls now live in:

- `src/lib/report-controls.ts`
- `src/components/reports/report-control-panel.tsx`

Supported control dimensions:

- date range
- phase
- source type
- category
- party search
- approval status
- voucher status
- include draft/pending
- include reversed/cancelled
- summary / detailed / audit mode
- include/exclude major Complete Project Report sections

These controls now drive the same filtered data across:

- screen report
- print view
- CSV export
- Complete Project Report XLSX workbook

## Invoice / Receipt / Voucher Document Plan Implemented

The following print-ready document routes are now available:

- Buyer Money Receipt  
  `/projects/[id]/collections/[collectionId]/receipt`
- Supplier Bill / Invoice  
  `/projects/[id]/payables/[payableId]/invoice`
- Supplier Payment Voucher  
  `/projects/[id]/payables/[payableId]/payments/[paymentId]/voucher`
- Direct Expense Voucher  
  `/projects/[id]/expenses/[expenseId]/voucher`
- Retention Release Voucher  
  `/projects/[id]/payables/[payableId]/retention-release/[releaseId]/voucher`
- Final Reconciliation Demand Notice  
  `/projects/[id]/finance/final-reconciliation/[reconciliationId]/notice`
- Subcontractor invoice / payment-voucher aliases:
  - `/projects/[id]/subcontractors/bills/[billId]/invoice`
  - `/projects/[id]/subcontractors/bills/[billId]/payments/[paymentId]/voucher`

All use the shared project document context so they:

- respect company scope
- respect project assignment
- respect page permission checks
- use tenant branding with text fallback
- hide app shell in print
- keep Sharebuild as a generated-by footer only

## Complete Dummy Data Design

A new idempotent seed helper now creates:

- `Madina Demo Complete Project`

Seed coverage includes:

- 8 phases
- 14 units including parking
- 8 buyers
- multi-unit buyer scenario
- co-owned unit scenario
- 4 demand batches with service charge-aware buyer demand rows
- 9 collections covering partial, full, advance, bank, cash, mobile, and cheque examples
- direct expenses with approved, pending, and cancelled examples
- supplier bills with multiple material line items
- subcontractor progress bills with retention and deduction examples
- treasury rows, account transfer, and cheque examples
- approved and draft service charge examples
- posted final reconciliation sample
- document metadata pointing to safe real placeholder files under `public/uploads/demo-docs`

Relax Tower seed totals remain untouched and exact:

- Income `100,143,800`
- Expense `104,659,890.40`
- Balance `-4,516,090.40`

## Workbook / Export Status

Complete Project Report XLSX is now a real formatted workbook driven by the same report engine and filters as the screen report. The production print/export pass added a workbook index and per-phase drilldown tabs.

Sheets:

1. `00 Index`
2. `01 Project Overview`
3. `02 Executive Summary`
4. `03 Phase Summary`
5. `04 All Phase Breakdown`
6. `05 All Daily Cost Details`
7. `06 Buyer Billing Due`
8. `07 Supplier Ledger`
9. `08 Subcontractor Ledger`
10. `09 Cash Bank Book`
11. `10 Cheque Register`
12. `11 Tax Deduction`
13. `12 Retention`
14. `13 Service Charge`
15. `14 Final Reconciliation`
16. `15 Audit Summary`

Each phase also receives purpose-first tabs so Excel's 31-character sheet limit does not hide the drilldown type:

- `Pxx Breakdown - [Phase]`
- `Pxx Daily Cost - [Phase]`

Sheet names are shortened where needed to satisfy Excel's 31-character limit.

## Production Print / Phase Formula Update

- Added `PHASE_REPORT_PRINT_EXPORT_PRODUCTION_PASS.md`.
- Complete Project Report now has a dedicated print route:
  - `/projects/[id]/reports/complete-project/print`
- The print route is generated outside the project workspace scroll shell and prints from full document flow.
- Phase financial logic now uses:
  - Actual Construction Cost = direct expense + supplier bill items + subcontractor bills + adjustments
  - Company Service Charge / Supervision Fee = Actual Construction Cost x phase service charge %
  - Total Phase Billable Cost = Actual Construction Cost + Company Service Charge / Supervision Fee
  - Phase Balance = Total Collection - Total Phase Billable Cost
- The phase detail page now uses the unified phase summary helper and shows service charge, billable cost, category breakdown, daily cost details, and audit/voucher notes.

## Test Plan Completed

- `npx prisma validate`
- `npx prisma generate`
- `npm run build`
- `npm run db:seed`
- authenticated route smoke against production-style `next start`
- workbook download and sheet-name verification
- permission denial verification for project-only export attempts

## Smoke Results

- Complete Project Report opens for Relax Tower.
- Complete Project Report opens for Madina Demo Complete Project.
- Dummy project workbook downloads with all expected sheets.
- Daily Project Cost Details includes supplier bill line items such as `Iron rod - 3.5 ton`.
- Supplier Ledger remains separate and still shows supplier-wise payable/payment summary.
- Buyer receipt, supplier invoice, supplier payment voucher, expense voucher, retention release voucher, and final reconciliation notice routes all open.
- Project-only engineer is denied workbook export with `403`.
- No Radix Select empty-value runtime error appeared in the checked report/document routes.

## Known Risks / Remaining Gaps

- Server-generated PDF is still future work; browser Print / Save as PDF is the supported PDF path.
- Complete Project Report remains the only native XLSX workbook export.
- Some thin report pages still need deeper filter/export parity improvements if they later gain standalone workbook export.
- Local file storage remains public-disk based and is intentionally deferred to the later dependency/storage hardening pass.

## May 26 Universal Print / Phase UX Follow-Up

- Added the dedicated universal print-document primitive layer in `src/components/reports/print-document.tsx`.
- Complete Project Report print route now uses compact document tables rather than web-style KPI cards.
- Workbook sheets now include auto-filter and totals rows on major financial tabs.
- Phase detail UX was corrected so the page again reads as:
  - Income / Collections
  - Expenses / Project Cost
  - Total Phase Cost and Phase Balance
- Service charge remains inside the phase cost footing instead of being treated like a dominant standalone KPI.

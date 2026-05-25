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

Complete Project Report XLSX is now a real formatted workbook driven by the same report engine and filters as the screen report.

Sheets:

1. Project Overview
2. Executive Summary
3. Phase Summary
4. Phase Expense Breakdown
5. Daily Project Cost Details
6. Buyer Billing & Due
7. Supplier Ledger
8. Subcontractor Ledger
9. Cash Bank Book
10. Cheque Register
11. Tax Deduction
12. Retention
13. Service Charge
14. Final Reconciliation
15. Audit Summary

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

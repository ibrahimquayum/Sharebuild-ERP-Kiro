# Phase, Report Print, And Export Production Pass

**Date:** May 25, 2026  
**Branch:** `feat/erp-v1`

## Current Visual / Report / Export Issues Found

- Complete Project Report was still rendered inside the project workspace app shell for screen use.
- The project workspace layout uses fixed viewport height and scroll containers, which can cause browser print preview to capture only the visible viewport.
- Global print CSS was hiding all `header` elements, including report headers, rather than only app-shell headers.
- Long report sections were marked as page-break-avoid blocks, which is unsafe for multi-page audit tables.
- Complete Project Report screen, print behavior, and workbook export shared data, but the print document did not yet have a dedicated route.
- Workbook export had strong main sheets but did not include an index/table of contents or per-phase drilldown tabs.
- Phase detail page was still using direct phase collections and expenses only, so it did not show the unified cost story or billable service-charge formula.

## Print / PDF Issue Cause

The root cause was layout containment:

- project workspace layout: `h-screen overflow-hidden`
- project workspace content: `overflow-hidden`
- project main content: `overflow-y-auto`
- report tables and report wrapper: overflow containers

Chrome print can treat this as one scrollable viewport instead of a full document. The pass fixes this in two ways:

- Dedicated print route:
  - `/projects/[id]/reports/complete-project/print`
- Print CSS overrides:
  - app sidebar/header hidden
  - report header preserved
  - height and overflow constraints released in print
  - long sections allowed to break across pages
  - table headers repeat where the browser supports it

Server PDF remains future work. Browser Print / Save as PDF is the supported PDF path.

## Phase Financial Formula

Phase reporting now uses the production billable-cost formula:

```text
Actual Construction Cost
= direct expenses
+ supplier bill item rows
+ subcontractor progress/work bills
+ adjustments

Company Service Charge / Supervision Fee
= Actual Construction Cost x phase service charge percentage

Total Phase Billable Cost
= Actual Construction Cost + Company Service Charge / Supervision Fee

Phase Balance
= Total Collection - Total Phase Billable Cost
```

Relax Tower Top Sheet historical totals remain preserved because Top Sheet continuity still uses the historical income/expense summary, not the new billable-cost phase balance.

## Service Charge Behavior

- Service charge rows are now part of the unified project cost report as `COMPANY_SERVICE_CHARGE`.
- They are labeled as `Company Service Charge / Supervision Fee`.
- If an approved/calculated service-charge ledger row exists, the report uses it.
- If no ledger row exists, the report calculates a live preview from phase percentage or project default percentage.
- Service charge appears in:
  - phase detail page
  - Complete Project Report
  - print route
  - Excel workbook
  - phase category breakdown
  - daily project cost details

## Supplier Bill Reporting Logic

The accounting/reporting rule is preserved:

- supplier bill line items appear in Daily Project Cost Details
- supplier bill line items appear in phase category breakdown
- supplier payments do not appear as project cost rows
- Supplier Ledger remains separate and answers billed, paid, payable, and document status

Example: New SK Traders rod, sand, stone, and brick line items appear as daily project cost rows, while the Supplier Ledger shows New SK Traders as a party payable/payment relationship.

## Excel Workbook Structure

Complete Project Report XLSX now includes:

- `00 Index`
- `01 Project Overview`
- `02 Executive Summary`
- `03 Phase Summary`
- `04 All Phase Breakdown`
- `05 All Daily Cost Details`
- `06 Buyer Billing Due`
- `07 Supplier Ledger`
- `08 Subcontractor Ledger`
- `09 Cash Bank Book`
- `10 Cheque Register`
- `11 Tax Deduction`
- `12 Retention`
- `13 Service Charge`
- `14 Final Reconciliation`
- `15 Audit Summary`

Per-phase drilldown tabs are also generated for every phase with the tab purpose first:

- `P01 Breakdown - [Phase]`
- `P01 Daily Cost - [Phase]`
- `P02 Breakdown - [Phase]`
- `P02 Daily Cost - [Phase]`
- and so on

Excel sheet names are shortened when needed to stay within Excel's 31-character sheet-name limit.

Workbook formatting includes:

- table of contents
- styled headings
- frozen header rows
- numeric amount columns
- currency formatting
- sensible widths
- phase-specific drilldown
- selected report controls applied to the exported data

## Phase Page Redesign

The phase detail page now uses the unified phase financial summary helper and shows:

- phase header with status, project, date range, and actions
- financial summary cards
- billing and collection section
- cost overview section
- service charge line
- total billable phase cost
- phase balance
- category breakdown with percentage bars
- daily project cost details
- audit/voucher notes

## Report Control Status

Report controls now include:

- Client Summary
- Management Detailed
- Full Audit
- date range
- phases
- source type
- category
- party search
- voucher status
- approval status
- include draft/pending
- include reversed/cancelled
- include empty sections
- section selection

The same control object drives:

- screen report
- print route
- CSV exports where implemented
- Complete Project Report XLSX workbook

## Invoice / Receipt / Voucher Status

The print document system now includes:

- Buyer Demand Notice / Phase Bill
- Buyer Money Receipt
- Supplier Bill / Invoice View
- Supplier Payment Voucher
- Subcontractor Progress Bill alias
- Subcontractor Payment Voucher alias
- Direct Expense Voucher
- Retention Release Voucher
- Final Reconciliation Demand Notice

These documents use tenant branding, project reference, document number/date, amount breakdowns, party information, and signature areas.

## QA Checklist

- [x] `npx prisma validate`
- [x] `npx prisma generate`
- [x] `npm run build`
- [x] `npm run db:seed`
- [x] Relax Tower Top Sheet totals preserved
- [x] phase detail page opens and shows service charge
- [x] Complete Project Report screen opens
- [x] Complete Project Report print route opens
- [x] print route has no sidebar, controls, or app shell content
- [x] print route document is full-height and not viewport-clipped
- [x] Complete Project XLSX downloads
- [x] workbook has index, 16 numbered main/summary sheets, and 8 breakdown plus 8 daily-cost phase sheets for the demo project
- [x] supplier bill items appear in daily project cost details
- [x] Supplier Ledger remains separate
- [x] no Radix Select empty value error observed in smoke-tested routes

## Known Gaps

- Server-generated PDF is not implemented.
- Complete Project Report remains the only native XLSX workbook export.
- Browser print quality depends on the user's browser print engine, but the app no longer traps the report inside a scroll container.
- Private upload storage and dependency hardening remain deferred to the next pass.

## Universal Print And Phase UX Follow-Up - May 26, 2026

- Added `UNIVERSAL_PRINT_PHASE_REPORT_DOCUMENT_PASS.md`.
- Complete Project Report print route now uses dedicated print-document primitives instead of dashboard KPI cards.
- Print CSS now includes universal document classes:
  - `.print-hidden`
  - `.screen-only`
  - `.print-only`
  - `.avoid-break`
  - `.page-break-before`
  - `.page-break-after`
  - `.print-document`
  - `.report-page`
  - `.report-section`
- Phase detail page returned to the stronger side-by-side mental model:
  - left: Income / Collections
  - right: Expenses / Project Cost
- Service charge is now shown inside the expense footing:
  - Subtotal Construction Cost
  - Company Service Charge / Supervision Fee
  - Total Phase Cost
  - Phase Balance
- Complete Project Report workbook now adds:
  - auto-filtered table sheets
  - totals rows for key financial sheets
  - cleaner per-phase sheet naming within Excel limits

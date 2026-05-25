# Professional Report System Overhaul

**Date:** May 25, 2026  
**Branch:** `feat/erp-v1`

## Current Report Problems Found

- The old Complete Project Report read like a printed web page instead of a formal management report.
- The logo area could degrade into a broken or empty placeholder when no tenant logo was configured.
- Report pages mixed polished sections with placeholder-like foundations and inconsistent spacing.
- Report actions were not consistent across pages, and some labels still sounded generic instead of business-facing.
- Report filters were not yet strong enough to guarantee the same data across screen, print, CSV, and workbook surfaces.
- The previous Complete Project Report workbook export was technically functional, but not complete enough for client/audit handoff.

## Formula Inconsistencies Found

- Relax Tower seed data preserves historical collection totals from imported summary-ledger data, but it does not include matching issued demand rows.
- That made the old report show:
  - `Total Demand = 0`
  - `Buyer Advance = 100,143,800`
  - `Total Collection = 100,143,800`
- Those numbers were technically true for the seed, but the presentation was misleading.

## Formula Fixes Implemented

- Reporting now separates:
  - historical collection
  - allocated collection
  - regular issued demand
  - final reconciliation demand
  - unallocated collection
  - buyer due
  - buyer advance
- Where historical Excel-summary receipts exist without live issued demand rows, reports now explain that clearly instead of implying fake demand/advance behavior.
- Finance hub and report helpers now use the same demand/allocation interpretation so the collection story stays consistent across:
  - Finance hub
  - Complete Project Report
  - Top Sheet
  - Due-facing report views
  - Final reconciliation reporting

## Design Problems Found

- weak cover-page hierarchy
- too much empty white space
- inconsistent section framing
- weak KPI grid layout
- raw table presentation
- print surface still too app-like
- repeated footer treatment felt awkward
- demand notice print looked like a debug surface rather than a bill

## Design System Implemented

- Added reusable report building blocks:
  - `ReportDocumentLayout`
  - `ReportCoverPage`
  - `ReportHeader`
  - `ReportFooter`
  - `ReportSection`
  - `ReportSummaryGrid`
  - `ReportKpiCard`
  - `ReportTable`
  - `ReportAmount`
  - `ReportStatusBadge`
  - `ReportSignatureBlock`
  - `ReportPageBreak`
  - `ReportNoteBox`
  - `ReportExportToolbar`
- Added a professional logo fallback so no report shows a broken image icon or blank logo area.
- Improved A4 print CSS:
  - tighter margins
  - hidden app shell
  - repeated table headers
  - cleaner page breaks
  - reduced print chrome

## Report Control Engine Added

- Added shared report control parsing in `src/lib/report-controls.ts`.
- Added a reusable report control UI in `src/components/reports/report-control-panel.tsx`.
- Filters now drive the same data for:
  - Complete Project Report screen
  - expense / project cost report screen
  - CSV export
  - Complete Project Report XLSX workbook
- Supported filters now include:
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
  - include/exclude major report sections

## Unified Project Cost Engine Added

- Added `src/lib/project-cost-report.ts` as the shared project-cost data builder.
- Daily Project Cost Details now pull from the same unified source across screen and workbook.
- The builder now includes:
  - direct expenses
  - supplier bill line items
  - subcontractor progress/work bills
  - approved service charge entries
- Accounting/reporting rule preserved:
  - supplier bill items appear in Daily Project Cost Details
  - supplier and subcontractor payments do not appear as project cost
  - supplier ledger and subcontractor ledger stay separate party/accounting reports

## Complete Project Report Rebuild

The report now includes:

1. Cover page
2. Project overview
3. Executive summary
4. Phase summary
5. Per-phase summary and category-wise breakdown
6. Daily project cost details
7. Buyer billing and due summary
8. Supplier ledger summary
9. Subcontractor ledger summary
10. Cash / bank summary
11. Cheque register summary
12. Tax / deduction summary
13. Retention summary
14. Service charge summary
15. Final reconciliation summary
16. Audit / data quality summary
17. Signature page

## Individual Report Status

Print-ready report pages now exist for:

- Complete Project Report
- Top Sheet
- Phase Summary
- Buyer Statement
- Unit Statement
- Due Report
- Collection Report
- Expense / Project Cost Report
- Supplier Ledger
- Subcontractor Ledger
- Cash / Bank Book
- Cheque Register
- Tax / Deduction Report
- Retention Report
- Service Charge Report
- Final Reconciliation Report
- Audit Report

Business document print routes now exist for:

- Buyer Money Receipt
- Supplier Bill / Invoice
- Supplier Payment Voucher
- Direct Expense Voucher
- Retention Release Voucher
- Final Reconciliation Demand Notice
- Subcontractor invoice / payment-voucher aliases

Still honest about limited depth where data is sparse:

- Server-generated PDF is still not implemented.
- Native workbook export is still limited to Complete Project Report.

## Export Gaps Found

- Server PDF remains future work.
- Most report exports are still CSV rather than native XLSX.
- Relax Tower seed data does not naturally demonstrate issued-demand-heavy reporting because historical collection was imported before system billing history existed.

## Export Improvements Implemented

- Complete Project Report now exports a real multi-sheet `.xlsx` workbook using `exceljs`.
- Workbook sheets now include:
  - Project Overview
  - Executive Summary
  - Phase Summary
  - Phase Expense Breakdown
  - Daily Project Cost Details
  - Buyer Billing & Due
  - Supplier Ledger
  - Subcontractor Ledger
  - Cash Bank Book
  - Cheque Register
  - Tax Deduction
  - Retention
  - Service Charge
  - Final Reconciliation
  - Audit Summary
- Workbook metadata, numeric columns, styled headers, column widths, and the Top Sheet grand total row are now included.
- Print/export labels now stay honest:
  - XLSX only where real
  - CSV only where implemented
  - PDF means browser Print / Save as PDF

## Dummy Project Coverage Added

- Added `Madina Demo Complete Project` as the complete modern-system demo seed.
- The demo project now exercises:
  - phase billing with service charge
  - allocations and buyer advance
  - supplier bill items
  - subcontractor progress billing
  - treasury and cheque flows
  - retention release
  - final reconciliation reporting
  - document counts against real placeholder paths

## Sections Previously Missing From Complete Project Report

- professional cover page
- control-driven data filtering
- project overview
- per-phase category breakdown
- unified daily project cost details
- cash/bank and cheque summary
- service charge summary
- final reconciliation summary
- explicit audit/data-quality limitations
- formal signature page

## QA Completed In This Pass

- `npx prisma validate`
- `npx prisma generate`
- `npm run build`
- `npm run db:seed`
- authenticated report smoke checks
- workbook download and sheet-name verification
- project-only export denial verification

## QA Results

- reports index opens
- complete project report opens for Relax Tower
- complete project report opens for `Madina Demo Complete Project`
- service charge report opens
- final reconciliation report opens
- demand notice print page opens
- buyer money receipt opens
- supplier invoice opens
- supplier payment voucher opens
- expense voucher opens
- retention release voucher opens
- final reconciliation notice opens
- Complete Project Report workbook downloads and opens
- workbook contains all expected sheet names
- workbook daily cost detail includes supplier bill items
- project-only engineer receives `403` on workbook export
- project-only engineer is denied from unassigned project and company admin pages
- Relax Tower totals remain:
  - Income `100,143,800`
  - Expense `104,659,890.40`
  - Balance `-4,516,090.40`

## Known Remaining Limitations

- No server-generated PDF yet.
- Only Complete Project Report has native XLSX.
- Relax Tower seed demand history remains intentionally sparse, so its demand/buyer-due sections still rely on explanatory notes for imported historical collections.
- The richer billing, collection, and voucher test coverage now lives in `Madina Demo Complete Project`.

## Implementation Plan Status

- [x] Formula audit
- [x] Shared professional report design system
- [x] Shared report control/filter engine
- [x] Unified project cost data builder
- [x] Complete Project Report rebuild
- [x] Report index redesign
- [x] Core report-page polish
- [x] Complete Project Report workbook overhaul
- [x] Browser print polish
- [x] Printable receipt / voucher / invoice routes
- [x] Complete demo project seed coverage
- [x] Project-only export permission verification
- [x] Documentation pass

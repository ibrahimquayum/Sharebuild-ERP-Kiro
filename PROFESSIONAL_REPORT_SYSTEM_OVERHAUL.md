# Professional Report System Overhaul

**Date:** May 25, 2026  
**Branch:** `feat/erp-v1`

## Current Report Problems Found

- The old Complete Project Report read like a printed web page instead of a formal management report.
- The logo area could degrade into a broken or empty placeholder when no tenant logo was configured.
- Report pages mixed polished sections with placeholder-like foundations and inconsistent spacing.
- Report actions were not consistent across pages, and some labels still sounded generic instead of business-facing.
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
  - regular issued demand
  - final reconciliation demand
  - allocated collection
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
- Added a professional logo fallback so no report shows a broken image icon or blank “Logo” area.
- Improved A4 print CSS:
  - tighter margins
  - hidden app shell
  - repeated table headers
  - cleaner page breaks
  - reduced print chrome

## Complete Project Report Rebuild

The report now includes:

1. Cover page
2. Executive summary
3. Collection and demand interpretation
4. Top Sheet with grand totals
5. Phase summary
6. Daily expenses by phase
7. Supplier ledger summary
8. Subcontractor ledger summary
9. Buyer billing and due summary
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
- Expense Report
- Service Charge Report
- Final Reconciliation Report
- Cash / Bank Book
- Cheque Register
- Audit Report

Still honest about limited depth where data is sparse:

- Demand Notice / Bill print is polished, but seed data currently contains an empty QA demand batch.
- Server-generated PDF is still not implemented.
- Native workbook export is still limited to Complete Project Report.

## Export Gaps Found

- Server PDF remains future work.
- Most report exports are still CSV rather than native XLSX.
- Seed data does not naturally demonstrate issued-demand-heavy reporting because historical collection was imported before system billing history existed.

## Export Improvements Implemented

- Complete Project Report now exports a real multi-sheet `.xlsx` workbook using `exceljs`.
- Workbook sheets now include:
  - Summary
  - Top Sheet
  - Phase Summary
  - Daily Expenses
  - Supplier Ledger
  - Subcontractor Ledger
  - Buyer Due
  - Cash Bank Book
  - Cheques
  - Tax Deductions
  - Retention
  - Service Charge
  - Final Reconciliation
  - Audit Summary
- Workbook metadata, numeric columns, and the Top Sheet grand total row are now included.
- Print/export labels now stay honest:
  - XLSX only where real
  - CSV only where implemented
  - PDF means browser Print / Save as PDF

## Sections Previously Missing From Complete Project Report

- professional cover page
- demand/allocation interpretation
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
- complete project report opens
- service charge report opens
- final reconciliation report opens
- demand notice print page opens
- Complete Project Report workbook downloads and opens
- workbook contains all expected sheet names
- project-only engineer receives `403` on workbook export
- project-only engineer is denied from unassigned project and company admin pages
- Relax Tower totals remain:
  - Income `100,143,800`
  - Expense `104,659,890.40`
  - Balance `-4,516,090.40`

## Known Remaining Limitations

- No server-generated PDF yet.
- Only Complete Project Report has native XLSX.
- Seed demand history remains intentionally sparse, so some demand/buyer-due sections rely on explanatory notes rather than rich historical issuance rows.
- The current seeded demand batch has zero issued demand rows, so the redesigned bill page can be validated structurally but not yet against a rich live seeded batch example.

## Implementation Plan Status

- [x] Formula audit
- [x] Shared professional report design system
- [x] Complete Project Report rebuild
- [x] Report index redesign
- [x] Core report-page polish
- [x] Complete Project Report workbook overhaul
- [x] Browser print polish
- [x] Demand notice print redesign
- [x] Project-only export permission verification
- [x] Documentation pass


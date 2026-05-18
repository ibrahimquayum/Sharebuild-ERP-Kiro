# Reversal and Export Plan

Branch: `feat/erp-v1`

## Current Reversal / Adjustment Support

- Collections and expenses have reversal metadata and backend reversal routes from the accounting hardening pass.
- Supplier bills and supplier payments have reversal metadata in schema but no reversal routes or UI yet.
- Subcontractor bills/payments are represented through `SupplierPayable`/`SupplierPayment` where supplier type is `LABOUR_CONTRACTOR`.
- Adjustment records are not first-class schema entities yet. The safe short-term correction workflow is reversal with reason, followed by a new corrected record.
- Audit logs are available and should be best-effort so audit-log failure does not falsely fail the correction.

## Current Report / Export Support

- Report pages use tenant/company branding through `ReportHeader`.
- Top Sheet is live and seed-accurate.
- Other report pages are print-ready foundations.
- `package.json` does not include a PDF or XLSX library.
- Existing PDF/Excel buttons are disabled placeholders.

## Missing UI

- Detail pages for collections, expenses, supplier bills, and supplier payments need clear record context and correction actions.
- Reversal pages need reason forms and audit-safe copy.
- Reversed records need clear badges and should remain visible.
- Complete Project Report needs a professional printable bundle view.

## Missing Backend

- Supplier bill reversal route.
- Supplier payment reversal route that restores payable due/paid amounts.
- CSV/Excel-compatible export routes for complete project, top sheet, and expenses.
- Report export audit logging where practical.

## Package / Library Availability

- No XLSX package is installed.
- No PDF package is installed.
- This pass will avoid dependency risk and implement:
  - Print / Save as PDF via browser print for PDF-ready output.
  - Real Excel-compatible CSV exports with actual data.
- Server-generated PDF and multi-sheet XLSX remain future enhancements unless a dependency is added in a later pass.

## Implementation Plan

1. Add supplier bill and supplier payment reversal backend routes.
2. Add reusable reversal form UI.
3. Add detail and reversal pages for:
   - project collection
   - project expense
   - project payable
   - project payable payment reversal
4. Add reusable report data helper for complete project report and CSV exports.
5. Update report actions to support Print / Save as PDF and real CSV export links.
6. Build `/projects/[id]/reports/complete-project`.
7. Add CSV export routes:
   - `/api/projects/[id]/reports/complete-project/excel`
   - `/api/projects/[id]/reports/top-sheet/excel`
   - `/api/projects/[id]/reports/expenses/excel`
8. Update report index and documentation.
9. Run Prisma generate, build, seed, then commit and push.

## Risks

- CSV is Excel-compatible but not a true multi-sheet `.xlsx` workbook.
- PDF is print/PDF-ready HTML, not server-generated PDF.
- Adjustment remains reversal-plus-new-record until a dedicated adjustment table is added.
- Supplier/subcontractor accounting still shares `SupplierPayable` internals.

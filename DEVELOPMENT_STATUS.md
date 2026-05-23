# Development Status - Sharebuild ERP

**Last updated:** May 23, 2026
**Branch:** `feat/erp-v1`

## Current State

Sharebuild ERP now has a buildable project-first foundation. Sharebuild remains the platform brand, while tenant company branding is loaded from Company Settings for report/print surfaces.

This branch now has a buildable project-first finance foundation with vendor contracts, treasury accounts, cheque lifecycle tracking, bill-level deduction/retention fields, transfer workflow, and finance report exports, while still preserving the Relax Tower seed totals.

## Verified

| Check | Status | Notes |
| --- | --- | --- |
| Prisma Client | Pass | `npx prisma generate` |
| Production build | Pass | `npm run build` |
| Migration reset | Pass | `npx prisma migrate reset --force --skip-seed` |
| Seed | Pass | `npm run db:seed` |
| Finance completion build | Pass | `npm run build` after tax/retention, transfer, cheque, and reconciliation work |
| Project create/edit save | Pass | Authenticated API create returned 201 and update returned 200 |
| Top Sheet totals | Pass | Income 100,143,800 / Expense 104,659,890.40 / Balance -4,516,090.40 |
| Product foundation build | Pass | `npm run build` after save-flow and bulk/document fixes |
| Module completion build | Pass | `npm run build` after bulk expense, FIFO allocation, and supplier line-item changes |

## Implemented In This Pass

- Clean global sidebar: Dashboard, Projects, Company Setup, Reports, Audit.
- Project workspace sidebar reorganized into Overview, Setup, Finance, Work, Documents, Reports, Audit, Settings.
- Project units foundation:
  - `/projects/[id]/units`
  - `/projects/[id]/units/new`
  - `/projects/[id]/units/[unitId]`
  - `POST /api/projects/[id]/units`
  - `PUT /api/projects/[id]/units/[unitId]`
  - `POST /api/projects/[id]/units/bulk`
  - Bulk generation from floor/unit plan using existing `Unit` persistence.
- Buyer ownership foundation:
  - Project-scoped Buyers & Ownership page.
  - Unit ownership share.
  - Co-owner support through multiple `UnitBuyer` rows.
  - Payer flag for payer-vs-owner foundation.
  - Project buyer detail/ledger route.
  - Ownership share validation now prevents a unit from exceeding 100% owner share.
- Document foundation:
  - Project document library.
  - Project document upload route.
  - Document scope/category/title/sort/status metadata.
  - Project, buyer, unit, phase, expense, and bill document relations.
  - Multi-file upload now saves every selected PDF/image/document with sort order.
- Finance foundation:
  - `/projects/[id]/finance`
  - Project-scoped finance summary and links to daily money pages.
  - `/projects/[id]/expenses/bulk`
  - `POST /api/projects/[id]/expenses/bulk`
  - Bulk field expense entry with local shop, payment method, pending approval status, vouchers, and missing voucher tracking.
- Demand foundation:
  - `/projects/[id]/demands/new`
  - `POST /api/projects/[id]/demands`
  - Equal amount demand generation for selected buyer/unit ownership rows.
  - `GET /api/projects/[id]/demands`
  - FIFO collection allocation updates demand status to partially/fully paid.
- Reports foundation:
  - Branded report header.
  - Print action.
  - Disabled PDF/Excel buttons until real export endpoints exist.
  - Report entry routes for Top Sheet, buyer statement, unit statement, phase summary, collection report, expense report, supplier ledger, subcontractor ledger, due report, and audit report.
- Permission foundation:
  - Central permission config in `src/lib/permissions.ts`.
  - Practical guards added to new project/unit/buyer/document/demand APIs.
- Project audit page now reads `AuditLog`.
- Company settings now includes report footer note.
- Company settings now supports local logo upload, preview, remove, registration/trade license, and TIN/VAT fields using existing company columns.
- Audit logging is best-effort on common save flows, so an audit failure no longer falsely marks the main save as failed.

## Finance Completion Pass - May 23, 2026

### Added

- `FINANCE_COMPLETION_PHASE.md`
- migration `0008_finance_completion_phase`
- bill-level VAT / AIT-TDS / other deduction support on supplier and subcontractor bills
- bill-level retention/security support on supplier and subcontractor bills
- retention release workflow and treasury posting
- company account transfer workflow
- stricter cheque transition logic for pending/cleared/bounced/cancelled
- final reconciliation preview page
- print-ready finance report pages for:
  - tax / deduction
  - retention
  - final reconciliation
- Excel-compatible CSV export endpoints for:
  - cash / bank book
  - cheque register
  - tax / deduction
  - retention
  - final reconciliation

### Still Simplified

- final reconciliation does not post buyer demand records yet
- service charge is computed for reporting and preview, not yet stored as a dedicated ledger entry
- direct-expense bounced cheque handling cancels treasury movement but keeps expense cost
- native XLSX workbook export and server PDF export are still future work

## Final Finance QA / Reconciliation Pass - May 23, 2026

### Added

- `FINAL_FINANCE_QA_RECONCILIATION_PHASE.md`
- migration `20260523095713_final_finance_qa_reconciliation_phase`
- persisted service charge ledger through `ServiceChargeEntry`
- persisted final reconciliation header/line ledgers through:
  - `FinalReconciliation`
  - `FinalReconciliationLine`
- explicit demand typing through:
  - `Demand.demandType`
  - `Demand.finalReconciliationId`
- service charge workflow:
  - `GET/POST /api/projects/[id]/service-charge`
  - `/projects/[id]/finance/service-charge`
  - `/projects/[id]/reports/service-charge`
  - `/api/projects/[id]/reports/service-charge/excel`
- final reconciliation workflow:
  - `GET/POST /api/projects/[id]/final-reconciliation`
  - `/projects/[id]/finance/final-reconciliation`
  - `/projects/[id]/reports/final-reconciliation`
  - `/api/projects/[id]/reports/final-reconciliation/excel`

### Improved

- finance hub now shows service charge, final surplus/deficit, and finance readiness from shared formulas
- buyer detail and buyer due views now include posted reconciliation effect
- complete project report now uses the shared buyer/service-charge finance truth
- reconciliation posting is blocked when no unit ownership exists, preventing empty posted headers

### Remaining

- seeded Relax Tower data still needs unit ownership assignment before reconciliation posting from the seeded workspace
- service charge has no separate collection/settlement flow yet
- surplus reconciliation posts credit lines, not a separate refund payment workflow

## Schema Changes

Yes. One migration was added in the module completion pass:

```text
prisma/migrations/0004_expense_field_entry/migration.sql
```

It adds expense payment/local-shop metadata for field engineer bulk entry.

Existing schema changes remain:

```text
prisma/migrations/0002_project_setup_fields/migration.sql
prisma/migrations/0003_product_foundation/migration.sql
prisma/migrations/0004_expense_field_entry/migration.sql
```

It adds:

- Project setup fields and company branding fields used by the settings form.
- Expense payment method, supplier mode, local shop name, and local shop phone.
- New user roles for the permission foundation.
- Additional unit type/status values.
- `DocumentScope` and `DocumentStatus`.
- Document metadata and relations for unit, phase, payable, and uploadedBy.
- `UnitBuyer.isPayer`, `UnitBuyer.relationship`, and `UnitBuyer.notes`.

## Still Incomplete / Placeholder

- PDF and Excel exports are not implemented yet; buttons are intentionally disabled.
- Most non-Top-Sheet report pages are branded print-ready foundations, not full report engines.
- Materials, categories, and payment methods are still documented schema gaps.
- Full dynamic permission editing UI/database tables are not built; permissions are code-configured.
- Subcontractor bill creation is still not fully separated from supplier payable internals.
- Payment allocation against demands is FIFO; manual allocation and reversal logic are future accounting steps.
- File upload remains local disk under `public/uploads/[companyId]`.
- Local shop / one-time vendor purchasing is implemented for expenses, not supplier bills.

## Next Recommended Build Step

Build the accountant-facing reversal/adjustment UI and expand supplier/subcontractor ledgers before real PDF/Excel exports and SaaS onboarding.

## Accounting Hardening Pass - May 18, 2026

### Added

- `ACCOUNTING_HARDENING_PLAN.md` documents current accounting risks, schema support, implementation priority, and remaining audit gaps.
- One clean migration was added:

```text
prisma/migrations/0005_accounting_hardening/migration.sql
```

- Added `CollectionAllocation` for durable demand-payment allocation.
- Added reversal metadata to collections, expenses, supplier bills, and supplier payments.
- Added supplier payment status and cheque status metadata.
- Added phase audit-lock metadata.
- Added collection and expense reversal API foundations.
- Added phase audit-lock API foundation.

### Hardened

- Collection creation now writes allocation ledger rows transactionally and refreshes demand status from allocation totals.
- Manual allocation is supported by API in addition to FIFO and single-demand allocation.
- Locked phases now block phase-scoped demand, collection, expense, bulk expense, supplier bill, and supplier payment writes.
- Finance totals now exclude reversed collections and reversed/cancelled expenses.
- Final expense totals use approved/paid/partially-paid expenses, with pending expense shown separately.
- Finance hub now shows buyer receivable, buyer advance, pending expense, and phase carry-forward.
- Supplier bills now require bill line totals to match the bill total.
- Supplier payments capture cheque status for cheque-based payments.

### Still Incomplete

- Reversal UI is not complete; backend foundations exist for collection and expense reversals.
- Supplier/subcontractor reversal UI remains a future step.
- Dedicated subcontractor accounting tables are still a future schema improvement; current flow separates subcontractors by supplier type.
- Final reconciliation persistence remains future; phase carry-forward is computed for display.

## Reversal And Export Pass - May 18, 2026

### Added

- `REVERSAL_AND_EXPORT_PLAN.md`.
- Collection detail and reversal pages:
  - `/projects/[id]/collections/[collectionId]`
  - `/projects/[id]/collections/[collectionId]/reverse`
- Expense detail and reversal pages:
  - `/projects/[id]/expenses/[expenseId]`
  - `/projects/[id]/expenses/[expenseId]/reverse`
- Supplier/subcontractor bill detail and reversal pages:
  - `/projects/[id]/payables/[payableId]`
  - `/projects/[id]/payables/[payableId]/reverse`
  - `/projects/[id]/payables/[payableId]/payments/[paymentId]/reverse`
- Backend routes for supplier bill reversal and supplier payment reversal.
- Complete Project Report:
  - `/projects/[id]/reports/complete-project`
- Excel-compatible CSV exports:
  - `/api/projects/[id]/reports/complete-project/excel`
  - `/api/projects/[id]/reports/top-sheet/excel`
  - `/api/projects/[id]/reports/expenses/excel`

### Export Status

- PDF: print-ready HTML with browser Print / Save as PDF. No fake server PDF export.
- Excel: real CSV downloads containing report data. True XLSX workbook remains future.

### Remaining

- Dedicated adjustment-entry schema and UI are still future. Current correction workflow is reverse-with-reason, then enter a corrected record.
- Server-side PDF generation remains future.
- True multi-sheet XLSX remains future.

## Product Finishing Pass - May 18, 2026

### Added

- `PRODUCT_FINISHING_PLAN.md`.
- Real subcontractor bill entry page:
  - `/projects/[id]/subcontractors/bills/new`
- Bill-linked document upload prefill through:
  - `/projects/[id]/documents/upload?payableId=...&scope=SUPPLIER_BILL`
  - `/projects/[id]/documents/upload?payableId=...&scope=SUBCONTRACTOR_BILL`

### Improved

- Supplier bills and supplier payments now exclude labour contractors and service providers.
- Subcontractor bills and subcontractor payments have separate project navigation and labels.
- Subcontractor overview/list pages now link to bill detail instead of presenting the module as a future workaround.
- Bulk expense entry now shows the bill/voucher number field in the row UI.
- Bill detail pages include an upload action for invoices, vouchers, measurement sheets, and agreements.
- Generic placeholder copy now marks future workflows honestly without implying completion.

### Remaining

- Same-form bill upload is now available for supplier invoices and subcontractor measurement/agreement/invoice files.
- Dedicated subcontractor tables remain a future schema improvement.
- Dynamic permission editing, server PDF, and XLSX workbook export remain future.

## Vendor/Subcontractor Completion - May 18, 2026

### Added

- `VENDOR_SUBCONTRACTOR_COMPLETION_PLAN.md`.
- Project supplier create/reuse route:
  - `/projects/[id]/suppliers/new`
- Project subcontractor create/reuse route:
  - `/projects/[id]/subcontractors/new`
- Subcontractor bill detail alias:
  - `/projects/[id]/subcontractors/bills/[billId]`

### Improved

- Project Vendors page clearly separates supplier/material vendors from subcontractors/service providers and exposes add/bill/ledger actions for both.
- Supplier bill create form can upload invoice/voucher files and links them to the created payable.
- Subcontractor bill create form can upload measurement sheet, agreement, and invoice/voucher files and links them to the created payable.
- Initial paid amount on a supplier/subcontractor bill now creates a payment row with method/reference metadata.
- Finance hub quick links now include Add Supplier, Add Subcontractor, Supplier Ledger, Subcontractor Ledger, and Complete Project Report.

### Remaining

- Project vendor assignment is still inferred from project bills/expenses.
- Dedicated subcontractor contract tables remain future.
- Full ledger filtering and same-page edit workflows remain future.

## Project Vendor Contract Phase 1 - May 22, 2026

### Added

- `PROJECT_VENDOR_CONTRACT_PHASE1.md`
- Migration:
  - `prisma/migrations/0006_project_vendor_contract_phase1/migration.sql`
- New Prisma models:
  - `ProjectSupplier`
  - `ProjectSubcontractor`
- New relations:
  - `SupplierPayable.projectSupplierId`
  - `SupplierPayable.projectSubcontractorId`
  - `Document.projectSupplierId`
  - `Document.projectSubcontractorId`

### New Project Routes

- `/projects/[id]/suppliers`
- `/projects/[id]/suppliers/new`
- `/projects/[id]/suppliers/[projectSupplierId]`
- `/projects/[id]/suppliers/[projectSupplierId]/edit`
- `/projects/[id]/subcontractors/[projectSubcontractorId]`
- `/projects/[id]/subcontractors/[projectSubcontractorId]/edit`

### Improved

- Project Vendors page now reads from formal project assignments instead of inferring vendors only from bills.
- Supplier bills can link to project supplier assignments.
- Subcontractor bills can link to project subcontractor assignments.
- Contract/rate/agreement/measurement documents can link directly to project vendor assignments.
- Supplier and subcontractor ledger reports now group by project assignment.
- Finance overview now separates:
  - direct expense
  - supplier bill cost
  - subcontractor bill cost
  - supplier payable
  - subcontractor payable
- Supplier and subcontractor payments are no longer shown as project cost in the finance summary.

### Verified In This Pass

| Check | Status | Notes |
| --- | --- | --- |
| Prisma validate | Pass | `npx prisma validate` |
| Prisma generate | Pass | `npx prisma generate` |
| Migration apply | Pass | `npx prisma migrate dev` |
| Production build | Pass | `npm run build` |
| Seed | Pass | `npm run db:seed` |
| Migration reset | Pass | `npx prisma migrate reset --force --skip-seed` |
| Seed after reset | Pass | `npm run db:seed` |
| Top Sheet totals | Pass | Income 100,143,800 / Expense 104,659,890.40 / Balance -4,516,090.40 |

### Next Recommended Build Step

Cash/bank account architecture and cheque lifecycle.

## Cash / Bank / Cheque Phase - May 23, 2026

### Added

- `CASH_BANK_CHEQUE_PHASE.md`.
- Migration:
  - `prisma/migrations/0007_cash_bank_cheque_phase/migration.sql`
- New treasury models:
  - `CashBankAccount`
  - `CashBankTransaction`
  - `ChequeLog`
  - `AccountTransfer`
- New company routes:
  - `/company/accounts`
  - `/company/accounts/new`
  - `/company/accounts/[accountId]`
  - `/company/accounts/[accountId]/edit`
  - `/company/cheques`
- New project routes:
  - `/projects/[id]/finance/cash-bank`
  - `/projects/[id]/finance/cheques`
  - `/projects/[id]/reports/cash-bank-book`
  - `/projects/[id]/reports/cheque-register`

### Improved

- Collections now create cash/bank inflow rows through `CashBankTransaction`.
- Approved and final expenses now create cash/bank outflow rows.
- Bulk expenses now create cash/bank outflow rows for approved/final entries.
- Supplier payments and subcontractor payments now create treasury outflow rows without being treated as project cost.
- Cheque-backed collections, expenses, and vendor payments now create `ChequeLog` entries.
- Finance overview now shows cash in, cash out, net cash movement, account balance, pending cheques, and bounced cheques separately from project cost.
- Global sidebar now includes company treasury navigation.
- Project workspace sidebar now includes project cash/bank and cheque routes.
- Seed creates default company accounts and treasury rows for seeded collections and expenses.

### Verified In This Pass

| Check | Status | Notes |
| --- | --- | --- |
| Prisma validate | Pass | `npx prisma validate` |
| Prisma generate | Pass | `npx prisma generate` |
| Production build | Pass | `npm run build` |
| Seed | Pass | `npm run db:seed` |
| Migration reset | Pass | `npx prisma migrate reset --force --skip-seed` |
| Seed after reset | Pass | `npm run db:seed` |
| Migration status | Pass | `npx prisma migrate status` |
| Authenticated route smoke checks | Pass | `/dashboard`, `/company/accounts`, `/company/cheques`, `/projects/project-relax-tower/finance`, `/projects/project-relax-tower/finance/cash-bank`, `/projects/project-relax-tower/finance/cheques` |
| Top Sheet totals | Pass | Income 100,143,800 / Expense 104,659,890.40 / Balance -4,516,090.40 |

### Known Gaps

- No dedicated account transfer UI yet.
- No strict cheque-clearance posting workflow yet.
- No VAT/AIT/TDS handling yet.
- No retention/security ledger yet.
- No final reconciliation yet.

### Next Recommended Build Step

VAT/AIT/TDS plus retention/security architecture and accounting flows.

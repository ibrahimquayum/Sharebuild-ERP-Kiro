# Development Status - Sharebuild ERP

**Last updated:** May 25, 2026
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
- native XLSX workbook export now exists for Complete Project Report; server PDF export and other report workbooks are still future work

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

## Ownership Seed / Browser QA Pass - May 24, 2026

### Added

- `OWNERSHIP_SEED_FINANCE_QA_PHASE.md`
- one additive migration:
  - `20260523183725_ownership_seed_finance_qa_phase`
- realistic Relax Tower seed coverage:
  - 54 apartment units
  - 50 buyers
  - 56 ownership rows
  - multi-unit and co-owned buyer scenarios
- service charge settlement metadata and treasury posting
- surplus credit settlement metadata for final reconciliation lines
- final reconciliation demand visibility in `/projects/[id]/demands`

### Browser QA Completed

- authenticated route smoke passed across dashboard, project workspace, finance pages, treasury pages, and finance report pages
- service charge calculate, approve, and settle were exercised successfully
- final reconciliation preview and posting were exercised successfully before reseeding the database back to baseline
- generated reconciliation demand rows were verified in both the posted reconciliation page and the project demand list

### Current Remaining Gaps

- Relax Tower seed now supports deficit reconciliation QA, but not a natural surplus/refund scenario
- no dedicated service charge collection screen beyond service-charge settlement actions
- native XLSX workbook exists for Complete Project Report; no server-side PDF export

## Access Control / Reporting / Billing Pass - May 24, 2026

### Added

- `ACCESS_REPORTING_BILLING_COMPLETION_PLAN.md`
- migration `20260524051702_access_reporting_billing_completion`
- persisted dynamic permission foundation:
  - `CompanyRole`
  - `RolePermission`
  - `User.companyRoleId`
- persisted phase billing foundation:
  - `DemandBatch`
  - detailed demand portion fields for service-charge-aware billing
- new access helper layer in `src/lib/access-control.ts`
- new `/access-denied` page
- user and role management routes under:
  - `/company/users/*`
  - `/company/roles/*`
- demand batch routes under:
  - `/projects/[id]/demands/batches/*`

### Verified

- `npx prisma validate`
- `npx prisma generate`
- `npm run build`
- `npm run db:seed`
- `npx prisma migrate reset --force --skip-seed`
- `npx prisma migrate status`
- authenticated route smoke:
  - admin can access company users, roles, accounts, finance, and complete project report
  - project-only engineer is redirected from company-wide pages
  - project-only engineer is blocked from seeded unauthorized project `project-madina-garden`
- live QA:
  - service charge calculate / approve
  - demand batch issue with service charge linked
  - final reconciliation post created traceable final demand rows

### Honest Remaining Gaps

- Legacy global create forms now have server-wrapper guards; remaining API work is focused on older nested project/vendor endpoints.
- CSV remains the real export path for most reports; Complete Project Report now also has native XLSX.
- Browser print remains the PDF path.

## Legacy Security / Report Export Polish - May 24, 2026

### Added

- `LEGACY_SECURITY_REPORT_EXPORT_POLISH.md`
- Native Complete Project Report XLSX workbook export:
  - `/api/projects/[id]/reports/complete-project/xlsx`
- Server-wrapper guards for legacy global create forms:
  - `/buyers/new`
  - `/collections/new`
  - `/expenses/new`
  - `/suppliers/new`
  - `/phases/new`
- Per-buyer demand notice print blocks with service charge and carry-forward portions.

### Hardened

- Legacy global daily-work routes now require company-wide access.
- Buyers, collections, expenses, suppliers, phases, and project APIs now use the newer access helper layer for the audited surfaces.
- Complete Project Report page and CSV/XLSX exports enforce project assignment plus report permissions.
- Project list API only returns assigned projects for project-only users.

### Verified

- `npx prisma validate`
- `npx prisma generate`
- `npm run build`
- `npm run db:seed`
- Seed totals preserved:
  - Income `100,143,800`
  - Expense `104,659,890.40`
  - Balance `-4,516,090.40`

### Remaining

- Server-generated PDF remains future work.
- Complete Project Report has XLSX; other reports retain CSV/foundation status.
- A dependency security review is needed: `npm audit --omit=dev --audit-level=critical` still flags existing Next.js advisories and NextAuth/uuid/PostCSS moderate advisories.

## Security / Dependency / API Guard Pass - May 25, 2026

### Added

- `SECURITY_DEPENDENCY_API_GUARD_PASS.md`
- safe dependency upgrades:
  - `next` `14.2.35`
  - `next-auth` `4.24.14`
  - `eslint-config-next` `14.2.35`

### Hardened

- `next.config.js` now disables `X-Powered-By`.
- Broad image remote-source configuration was removed.
- High-risk nested `src/app/api` routes were moved onto the centralized access-control helpers or equivalent shared permission checks.
- Document list/upload now enforces linked-entity scope, assignment checks, and extension allowlists.
- Buyer nested API responses are filtered so project-only users do not see cross-project linked data.
- Supplier payable/payment/reversal flows now enforce module permission plus project assignment.
- Project report/export endpoints now consistently enforce report export permission and project scope.
- Project workspace layout now only passes serializable project fields into client components, fixing the authenticated production 500 caused by Prisma `Decimal` serialization.

### Verified

- `npm install`
- `npm audit`
- `npx prisma validate`
- `npx prisma generate`
- `npm run build`
- `npm run db:seed`
- authenticated smoke:
  - project-only engineer can open assigned project and finance hub
  - project-only engineer is denied from unassigned project and company admin pages
  - project-only engineer receives 403 on protected write/export APIs
  - admin can access company users/roles and download Complete Project Report XLSX
- seed totals preserved:
  - Income `100,143,800`
  - Expense `104,659,890.40`
  - Balance `-4,516,090.40`

### Remaining

- `npm audit` still reports unresolved Next.js, PostCSS, NextAuth/uuid, and dev-tooling advisories that require a separate major-upgrade review.
- Local document storage is still public-disk based and should move to private object storage before multi-tenant production.
- Server-side PDF remains future work.
- Complete Project Report is still the only native XLSX workbook export.

## Professional Report System Overhaul - May 25, 2026

### Added

- `PROFESSIONAL_REPORT_SYSTEM_OVERHAUL.md`
- shared professional report components for:
  - cover pages
  - headers/footers
  - KPI grids
  - section wrappers
  - amount/status display
  - signature blocks
  - report export toolbar
- `exceljs`-based Complete Project Report workbook export

### Improved

- Complete Project Report now reads like a formal management/audit report instead of a printed app page.
- Report formulas now explain the Relax Tower seed condition where historical collections exist without issued system demand rows.
- Top Sheet report and workbook now show explicit grand totals.
- Demand Notice / Bill print now uses professional report styling and cleaner billing breakdown.
- Report toolbars now use honest wording and consistent actions.

### Verified

- `npx prisma validate`
- `npx prisma generate`
- `npm run build`
- `npm run db:seed`
- authenticated smoke:
  - reports index opens
  - complete project report opens
  - service charge report opens
  - final reconciliation report opens
  - demand batch print opens
  - project-only engineer gets `403` on workbook export
  - admin workbook export downloads and opens with all expected sheet names

### Remaining

- Browser Print / Save as PDF is the supported PDF path; no server-generated PDF yet.
- Only Complete Project Report has native XLSX.
- Seeded demand-batch history is still too sparse to demonstrate a rich live issued-demand bill pack without creating fresh batch data during QA.

## Report Control / Invoice / Dummy Data Pass - May 25, 2026

### Added

- `REPORT_CONTROL_INVOICE_DUMMY_DATA_PHASE.md`
- shared report control/filter helper:
  - `src/lib/report-controls.ts`
- shared report control UI:
  - `src/components/reports/report-control-panel.tsx`
- shared unified project cost builder:
  - `src/lib/project-cost-report.ts`
- printable business-document routes:
  - `/projects/[id]/collections/[collectionId]/receipt`
  - `/projects/[id]/payables/[payableId]/invoice`
  - `/projects/[id]/payables/[payableId]/payments/[paymentId]/voucher`
  - `/projects/[id]/expenses/[expenseId]/voucher`
  - `/projects/[id]/payables/[payableId]/retention-release/[releaseId]/voucher`
  - `/projects/[id]/finance/final-reconciliation/[reconciliationId]/notice`
  - subcontractor invoice and payment-voucher aliases
- idempotent demo seed helper:
  - `prisma/seed-demo-project.ts`

### Improved

- Complete Project Report and Expense / Project Cost Report now read from the same unified filtered cost engine.
- Daily Project Cost Details now include supplier bill line items alongside direct expenses, subcontractor bills, and approved service charge.
- Supplier/subcontractor payments remain excluded from project cost and continue to live in treasury and ledger reporting only.
- Complete Project Report XLSX now follows the same filters and section data used by the screen report.
- Report document routes now use shared project document context for branding, scope checks, and print-safe layout.
- A richer QA project, `Madina Demo Complete Project`, now exercises:
  - demand batches
  - allocations and buyer advance
  - supplier multi-item bills
  - subcontractor progress billing
  - cheque and transfer activity
  - retention release
  - final reconciliation

### Verified

- `npx prisma validate`
- `npx prisma generate`
- `npm run build`
- `npm run db:seed`
- authenticated production-style smoke:
  - Relax Tower Complete Project Report opens
  - Madina Demo Complete Project Complete Project Report opens
  - dummy workbook export downloads with all expected sheets
  - supplier bill item rows appear inside Daily Project Cost Details
  - supplier ledger remains separate
  - buyer receipt, supplier invoice, supplier payment voucher, expense voucher, retention release voucher, and final reconciliation notice all open
  - project-only engineer receives `403` on workbook export
  - no Radix Select empty-value runtime error observed
- seed totals preserved:
  - Income `100,143,800`
  - Expense `104,659,890.40`
  - Balance `-4,516,090.40`

### Remaining

- Server-generated PDF remains future.
- Complete Project Report is still the only native XLSX workbook export.
- Dependency hardening and private upload storage are intentionally deferred to the next pass.

## Phase / Print / Workbook Production Pass - May 25, 2026

### Added

- `PHASE_REPORT_PRINT_EXPORT_PRODUCTION_PASS.md`
- dedicated Complete Project Report print route:
  - `/projects/[id]/reports/complete-project/print`
- print-specific report renderer:
  - `src/components/reports/complete-project-print-document.tsx`
- central phase finance summary helper:
  - `getPhaseFinancialSummary(...)`

### Improved

- Browser Print / Save as PDF no longer depends on printing the scroll-constrained project workspace screen.
- Global print CSS now releases height/overflow constraints and hides app shell surfaces without hiding report headers.
- Complete Project Report screen now links to the dedicated print/PDF route.
- Phase detail page now uses unified project cost data and the production billable-cost formula.
- Unified project cost builder now adds live Company Service Charge / Supervision Fee rows when a phase has construction cost and a configured service-charge percentage.
- Complete Project Report XLSX now includes a workbook index, numbered main sheets, and per-phase breakdown/daily-cost tabs.
- Report index now groups reports as Project Reports, Billing Documents, Expense & Vendor Reports, Treasury Reports, and Compliance & Audit.

### Verified

- `npx prisma validate`
- `npx prisma generate`
- `npm run build`
- `npm run db:seed`
- authenticated production-style smoke:
  - phase detail page opens and shows service charge plus total billable phase cost
  - Complete Project Report screen opens and links to print/PDF version
  - Complete Project Report print route opens without sidebar, controls, or app shell content
  - print route document height is much larger than the viewport and is not trapped in app overflow
  - Complete Project Report XLSX downloads
  - workbook contains index, numbered sheets, and per-phase drilldown tabs
  - supplier bill item `Iron rod - 3.5 ton` appears in daily project cost details
  - no Radix Select empty-value runtime error observed
- seed totals preserved:
  - Income `100,143,800`
  - Expense `104,659,890.40`
  - Balance `-4,516,090.40`

### Remaining

- Server-generated PDF remains future.
- Complete Project Report is still the only native XLSX workbook export.
- Dependency/private-upload-storage hardening remains the next production step.

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

- Server-generated PDF is not implemented; browser Print / Save as PDF is the supported PDF path.
- Native XLSX workbook export exists for Complete Project Report only; other report exports remain CSV or future workbook work.
- Some report pages are now fully useful, while the thinner ones still depend on seeded data depth rather than missing route foundations.
- Materials, categories, and payment methods are still documented schema gaps.
- Full dynamic permission editing UI/database tables are not built; permissions are code-configured.
- Subcontractor bill creation is still not fully separated from supplier payable internals.
- Payment allocation against demands is FIFO; manual allocation and reversal logic are future accounting steps.
- File upload remains local disk under `public/uploads/[companyId]`.
- Local shop / one-time vendor purchasing is implemented for expenses, not supplier bills.

## Next Recommended Build Step

Start the dependency/private-upload-storage hardening pass, then return for deeper accountant-facing reversal/adjustment UX and broader native workbook coverage before SaaS onboarding.

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
- Excel: real CSV downloads containing report data. Complete Project Report now has true XLSX workbook export.

### Remaining

- Dedicated adjustment-entry schema and UI are still future. Current correction workflow is reverse-with-reason, then enter a corrected record.
- Server-side PDF generation remains future.
- True multi-sheet XLSX exists for Complete Project Report; other reports remain future.

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
- Dynamic permission editing and server PDF remain future. XLSX workbook export exists for Complete Project Report only.

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

## Universal Print / Phase Report Update - May 26, 2026

- Added `UNIVERSAL_PRINT_PHASE_REPORT_DOCUMENT_PASS.md`.
- Complete Project Report print route now renders through dedicated document primitives rather than dashboard KPI cards.
- Global print CSS now includes universal print document classes and page-break helpers.
- Phase detail UX now restores the side-by-side collection vs project-cost mental model.
- Service charge is now displayed inside the expense footing:
  - Subtotal Construction Cost
  - Company Service Charge / Supervision Fee
  - Total Phase Cost
  - Phase Balance
- Complete Project Report workbook now includes auto-filtered sheets, totals rows, and improved per-phase sheet naming.

## Service Charge Phase Page Fix - May 26, 2026

- Added `SERVICE_CHARGE_PHASE_PAGE_FIX.md`.
- Added migration `20260525191553_service_charge_defaults_nullable`.
- Removed schema-default `0` from:
  - `Project.defaultServiceChargePct`
  - `Phase.serviceChargePct`
- Normalized old schema-default zero values to `NULL` so fallback can distinguish inherited vs explicit values.
- Added `src/lib/service-charge.ts` for centralized effective service-charge fallback.
- Relax Tower Piling now shows:
  - Service charge `5%`
  - Service charge amount `Tk 8,52,058.27`
  - Total phase cost `Tk 1,78,93,223.71`
  - Phase balance `-Tk 43,93,223.71`
- Phase detail page now restores the actual side-by-side collection vs cost layout and shows real cost rows in the main right-side panel.

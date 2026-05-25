# Manual Test Checklist - Sharebuild ERP

Use this after:

```bash
npx prisma migrate reset --force --skip-seed
npm run db:seed
npm run dev
```

Login: `admin@relaxdevelopers.com` / `admin123`

## A. Core App

- [ ] `/login` signs in successfully.
- [ ] `/dashboard` opens after login.
- [ ] Protected routes redirect to `/login` after logout.
- [ ] Global sidebar shows Dashboard, Projects, Company Setup, Reports, Audit.
- [ ] Legacy daily-work pages are not primary global menu items.

## B. Project Workspace

- [ ] `/projects` lists Relax Tower.
- [ ] Clicking Relax Tower opens `/projects/project-relax-tower`.
- [ ] Project workspace sidebar replaces the global sidebar.
- [ ] Sidebar groups are Overview, Setup, Finance, Work, Documents, Reports, Audit, Settings.
- [ ] Overview KPI totals match seeded data.
- [ ] Quick actions route to project-scoped pages.

## C. Project Setup

- [ ] `/projects/new` creates a new project and redirects to `/projects/[newProjectId]`.
- [ ] `/projects/[id]/settings` saves profile/planning fields.
- [ ] Financial totals cannot be manually edited.

## D. Units And Ownership

- [ ] `/projects/[id]/units` opens.
- [ ] `/projects/[id]/units/new` creates a unit.
- [ ] Bulk unit generation creates many units and rejects duplicate unit numbers.
- [ ] `/projects/[id]/units/[unitId]` opens and edits unit fields.
- [ ] `/projects/[id]/buyers` assigns an existing contact to a unit.
- [ ] Ownership share is displayed.
- [ ] Co-owners can be represented by multiple buyer rows on one unit.
- [ ] Ownership share validation prevents total owner share above 100%.
- [ ] Payer-differs flag displays clearly.
- [ ] Buyer balances are project-scoped only.

## E. Documents

- [ ] `/projects/[id]/documents` opens.
- [ ] Search and scope filter do not crash.
- [ ] `/projects/[id]/documents/upload` uploads one or more PDF/image files.
- [ ] Document title, category, scope, linked buyer/unit/phase, sort order, uploader, and date display.
- [ ] Uploaded file opens from the document table.

## F. Finance And Demands

- [ ] `/projects/[id]/finance` opens.
- [ ] Finance overview shows demanded, collected, due, expense, supplier payable, subcontractor payable, project balance, missing vouchers, and pending approvals.
- [ ] `/projects/[id]/demands/new` creates demand records from per-unit amount and ownership share.
- [ ] `/projects/[id]/demands` shows created demands.
- [ ] `/projects/[id]/collections` remains project-scoped.
- [ ] `/projects/[id]/expenses` remains project-scoped.
- [ ] `/projects/[id]/expenses/bulk` creates multiple pending/approved field expenses.
- [ ] Bulk expense rows support existing supplier, local shop, and no supplier/cash modes.
- [ ] Bulk expense voucher upload creates linked expense documents.
- [ ] Expenses without voucher show Missing indicator.
- [ ] `/projects/[id]/payables` remains project-scoped.
- [ ] Supplier bill creation accepts multiple line items and paid amount.
- [ ] Collection creation allocates FIFO to unpaid demands and updates demand status.

## G. Reports

- [ ] `/projects/[id]/reports` lists all report foundations.
- [ ] `/projects/[id]/reports/top-sheet` shows tenant branding and correct seeded totals:
  - Income: 100,143,800
  - Expense: 104,659,890.40
  - Balance: -4,516,090.40
- [ ] Print button works on report pages.
- [ ] Report action labels stay honest:
  - XLSX only where implemented
  - CSV only where implemented
  - PDF means browser Print / Save as PDF
- [ ] `/projects/[id]/reports/complete-project` shows cover page, executive summary, demand/allocation interpretation, detailed sections, and signature page.
- [ ] `/api/projects/[id]/reports/complete-project/xlsx` downloads a workbook with all expected sheets and opens without repair prompts.

## H. Company Setup

- [ ] `/company/settings` saves company profile, logo, registration/TIN, and report footer note.
- [ ] Logo preview appears after upload and report headers use tenant logo.
- [ ] `/company/contacts` opens.
- [ ] `/company/suppliers` opens.
- [ ] `/company/subcontractors` opens.
- [ ] `/company/materials` opens and documents schema gap.
- [ ] `/company/categories` opens and documents schema gap.
- [ ] `/company/payment-methods` opens and documents schema gap.
- [ ] `/company/users` creates a user with one of the product roles.

## I. Legacy/Fallback Routes

- [ ] `/phases` opens and shows legacy warning.
- [ ] `/collections` opens and shows project-workspace guidance.
- [ ] `/expenses` opens and shows project-workspace guidance.
- [ ] `/buyers` opens as company-wide identity fallback.
- [ ] `/reports/top-sheet` still opens.

## J. Stability

- [ ] No Radix Select empty-value runtime error.
- [ ] No duplicate/random migration folders.
- [ ] `npx prisma generate` passes.
- [ ] `npm run build` passes.
- [ ] `npm run db:seed` passes.

## K. Accounting Hardening

- [ ] Creating a collection with unpaid demands creates allocation rows and updates demand status.
- [ ] Overpayment remains visible as buyer advance/credit.
- [ ] Buyer detail ledger shows project-scoped demand, allocation/payment, due, and advance only.
- [ ] Reversing a collection through `POST /api/collections/[id]/reverse` marks it reversed and recalculates linked demand status.
- [ ] Reversing an expense through `POST /api/expenses/[id]/reverse` marks it cancelled/reversed and removes it from final finance totals.
- [ ] Phase audit lock through `POST /api/phases/[id]/audit-lock` blocks new demand, collection, expense, bulk expense, supplier bill, and supplier payment writes for that phase.
- [ ] Supplier bill line-item total must equal bill total.
- [ ] Cheque supplier payment stores cheque/payment status.

## L. Finance Completion

- [ ] Supplier bill form accepts VAT/AIT-TDS/other deduction values and saves them on the bill detail page.
- [ ] Subcontractor bill form accepts VAT/AIT-TDS plus retention/security values and saves them on the bill detail page.
- [ ] `/company/accounts/transfers` opens.
- [ ] `/company/accounts/transfers/new` posts a transfer between two different accounts.
- [ ] Transfer creates matching `TRANSFER_OUT` and `TRANSFER_IN` treasury rows.
- [ ] Cheque-backed collection creates a pending cheque register row and treasury row stays pending until cleared.
- [ ] Marking a received cheque cleared posts the treasury inflow.
- [ ] Marking a received cheque bounced or cancelled reverses the collection effect and restores buyer due.
- [ ] Marking an issued supplier/subcontractor cheque bounced or cancelled restores payable.
- [ ] `/projects/[id]/reports/tax-deductions` opens and shows real bill data when deductions exist.
- [ ] `/projects/[id]/reports/retention` opens and shows real bill data when retention exists.
- [ ] `/projects/[id]/finance/final-reconciliation` opens and shows ownership-based preview amounts.
- [ ] CSV export works for cash/bank book, cheque register, tax/deduction report, retention report, and final reconciliation preview.
- [ ] `/projects/[id]/finance` shows buyer receivable, buyer advance, approved expenses, pending expenses, and phase carry-forward.
- [ ] Top Sheet still verifies:
  - Income: 100,143,800
  - Expense: 104,659,890.40
  - Balance: -4,516,090.40

## L. Reversal And Export

- [ ] `/projects/[id]/collections/[collectionId]` opens and shows allocation/advance effect.
- [ ] `/projects/[id]/collections/[collectionId]/reverse` requires a reason and reverses the collection.
- [ ] `/projects/[id]/expenses/[expenseId]` opens and shows voucher/status/audit context.
- [ ] `/projects/[id]/expenses/[expenseId]/reverse` requires a reason and reverses/cancels the expense.
- [ ] `/projects/[id]/payables/[payableId]` opens and shows bill lines, payments, documents, and status.
- [ ] `/projects/[id]/payables/[payableId]/reverse` reverses supplier/subcontractor bill with reason.
- [ ] `/projects/[id]/payables/[payableId]/payments/[paymentId]/reverse` reverses payment and restores bill due.
- [ ] `/projects/[id]/reports/complete-project` opens with tenant branding and signature section.
- [ ] Complete Project Report browser Print / Save as PDF works cleanly.
- [ ] `/api/projects/[id]/reports/complete-project/excel` downloads populated CSV data.
- [ ] `/api/projects/[id]/reports/top-sheet/excel` downloads populated CSV data.
- [ ] `/api/projects/[id]/reports/expenses/excel` downloads populated CSV data.

## M. Product Finishing

- [ ] `/projects/[id]/payables` shows supplier/vendor bills only, not labour contractors or service providers.
- [ ] `/projects/[id]/payables/new` supplier dropdown excludes labour contractors and service providers.
- [ ] `/projects/[id]/subcontractors` opens without placeholder/workaround language.
- [ ] `/projects/[id]/subcontractors/bills` lists subcontractor bills and links to detail.
- [ ] `/projects/[id]/subcontractors/bills/new` creates a subcontractor bill through the existing payable backend.
- [ ] `/projects/[id]/payables/payments?type=subcontractor` shows subcontractor payments separately from supplier payments.
- [ ] Bill detail upload action opens the document uploader with supplier/subcontractor bill scope prefilled.
- [ ] Uploading a bill document from that flow returns to the bill detail page.
- [ ] `/projects/[id]/expenses/bulk` exposes bill/voucher number per row and submits it with the expense rows.

## N. Vendor/Subcontractor Completion

- [ ] `/projects/[id]/vendors` shows separate Suppliers and Subcontractors sections.
- [ ] `/projects/[id]/vendors` has Add Supplier and Add Subcontractor actions.
- [ ] `/projects/[id]/suppliers/new` creates a company supplier and redirects into project supplier bill creation.
- [ ] `/projects/[id]/suppliers/new` can reuse an existing supplier without creating a duplicate.
- [ ] `/projects/[id]/subcontractors/new` creates a company subcontractor/service provider and redirects into project subcontractor bill creation.
- [ ] `/projects/[id]/subcontractors/new` can reuse an existing subcontractor.
- [ ] `/projects/[id]/payables/new?supplierId=...` preselects the supplier.
- [ ] Supplier bill create uploads invoice/voucher and the bill detail page shows it in Documents.
- [ ] `/projects/[id]/subcontractors/bills/new?subcontractorId=...` preselects the subcontractor.
- [ ] Subcontractor bill create uploads measurement sheet, agreement, and invoice/voucher files.
- [ ] Bill create with paid amount creates a payment row with payment method/reference metadata.
- [ ] `/projects/[id]/finance` includes Add Supplier, Add Subcontractor, Supplier Ledger, Subcontractor Ledger, and Complete Project Report links.

## O. Project Vendor Contract Phase 1

- [ ] `/projects/[id]/suppliers` lists assigned project suppliers, not only inferred bill vendors.
- [ ] `/projects/[id]/suppliers/new` can assign an existing company supplier with project-specific terms.
- [ ] `/projects/[id]/suppliers/new` can create a new company supplier and assign it to the project in one flow.
- [ ] `/projects/[id]/suppliers/[projectSupplierId]` shows terms, documents, bills, phase breakdown, and audit history.
- [ ] `/projects/[id]/suppliers/[projectSupplierId]/edit` updates assignment terms and supplier master fields.
- [ ] `/projects/[id]/subcontractors` lists assigned project subcontractors with contract, billed, paid, and due values.
- [ ] `/projects/[id]/subcontractors/new` can assign an existing or new subcontractor with project contract terms.
- [ ] `/projects/[id]/subcontractors/[projectSubcontractorId]` shows agreement/measurement docs, bills, and audit history.
- [ ] `/projects/[id]/subcontractors/[projectSubcontractorId]/edit` updates subcontractor assignment terms.
- [ ] Contract/rate-sheet/agreement uploads attach to the project vendor assignment and appear on the assignment detail page.
- [ ] `/projects/[id]/payables/new?projectSupplierId=...` preselects the project supplier assignment.
- [ ] `/projects/[id]/subcontractors/bills/new?projectSubcontractorId=...` preselects the project subcontractor assignment.
- [ ] `/projects/[id]/reports/supplier-ledger` groups data by project supplier assignment.
- [ ] `/projects/[id]/reports/subcontractor-ledger` groups data by project subcontractor assignment.
- [ ] `/projects/[id]/finance` shows direct expense, supplier bill cost, and subcontractor bill cost without double-counting payments as cost.

## P. Cash / Bank / Cheque Phase

- [ ] `/company/accounts` opens after login.
- [ ] `/company/accounts/new` creates a cash/bank account.
- [ ] `/company/accounts/[accountId]` shows account info, recent transactions, inflow, outflow, and balance.
- [ ] `/company/accounts/[accountId]/edit` updates account details successfully.
- [ ] `/company/cheques` opens and shows cheque status actions.
- [ ] `/projects/[id]/finance` shows cash in, cash out, net cash movement, account balance, pending received cheques, pending issued cheques, and bounced cheques.
- [ ] `/projects/[id]/finance/cash-bank` opens and shows account-wise and transaction-wise treasury movement.
- [ ] `/projects/[id]/finance/cheques` opens and shows project cheque register.
- [ ] `/projects/[id]/reports/cash-bank-book` opens with print-friendly treasury reporting.
- [ ] `/projects/[id]/reports/cheque-register` opens with project cheque data.
- [ ] Creating a buyer collection writes a `CashBankTransaction` inflow row.
- [ ] Creating a cheque-based buyer collection writes a `ChequeLog` row.
- [ ] Creating an approved expense writes a `CashBankTransaction` outflow row.
- [ ] Creating a cheque-based approved expense writes a `ChequeLog` row.
- [ ] Creating approved bulk expenses writes treasury outflow rows for approved/final items only.
- [ ] Creating a supplier payment writes a `CashBankTransaction` outflow row and does not increase project cost.
- [ ] Creating a cheque-based supplier payment writes a `ChequeLog` row.
- [ ] Creating a subcontractor payment writes a `CashBankTransaction` outflow row and does not increase project cost.
- [ ] Finance cost totals still separate direct expense, supplier bills, and subcontractor bills from cash movement.
- [ ] Seed still verifies:
  - Income: 100,143,800
  - Expense: 104,659,890.40
  - Balance: -4,516,090.40

## Q. Final Finance QA / Reconciliation

- [ ] `/projects/[id]/finance/service-charge` opens and shows phase-wise service charge rows.
- [ ] `POST /api/projects/[id]/service-charge` can calculate service charge rows without crashing.
- [ ] Approved service charge rows appear in finance hub, service charge report, and complete project report.
- [ ] Service charge can be settled separately to a treasury account and then shows as settled in the ledger.
- [ ] `/projects/[id]/finance/final-reconciliation` opens and shows finance readiness plus buyer distribution preview.
- [ ] Final reconciliation posting is blocked when no ownership rows exist.
- [ ] After assigning unit ownership, final reconciliation posting succeeds once.
- [ ] Posted final reconciliation creates `FINAL_RECONCILIATION` demand rows for deficit posting.
- [ ] Generated reconciliation demands carry `finalReconciliationId`.
- [ ] Generated reconciliation demands appear in `/projects/[id]/demands` and are labeled as final reconciliation demands.
- [ ] Reversing a posted reconciliation is blocked if generated reconciliation demands already have collected allocations.
- [ ] `/projects/[id]/reports/service-charge` opens and CSV export returns real rows.
- [ ] `/projects/[id]/reports/final-reconciliation` opens and CSV export returns posted reconciliation metadata when available.
- [ ] Buyer detail, buyer due report, finance hub, and complete project report all show the same due/advance totals after reconciliation posting.

## R. Ownership Seed And Finance QA Sequence

- [ ] Login with `admin@relaxdevelopers.com` / `admin123`.
- [ ] Open `/projects/project-relax-tower/units` and confirm 54 apartment units exist.
- [ ] Open `/projects/project-relax-tower/buyers` and confirm 50 project buyers plus seeded ownership rows.
- [ ] Open `/projects/project-relax-tower/finance/service-charge`.
- [ ] Calculate service charge entries.
- [ ] Approve service charge entries.
- [ ] Settle one approved service charge entry to `Office Cash` or another active account.
- [ ] Open `/projects/project-relax-tower/finance/final-reconciliation`.
- [ ] Confirm preview is not blocked for missing ownership.
- [ ] Post final reconciliation once.
- [ ] Open `/projects/project-relax-tower/demands` and confirm posted final reconciliation demand rows are visible.
- [ ] Open `/projects/project-relax-tower/reports/final-reconciliation` and confirm generated demand count is shown.
- [ ] Re-seed the database after QA if you want the clean baseline restored.

## S. Access Control / Reporting / Billing Sequence

- [ ] Login with `admin@relaxdevelopers.com` / `admin123`.
- [ ] Open `/company/users` and confirm user list, project assignments, and active status render.
- [ ] Open `/company/roles` and confirm role matrix summaries render.
- [ ] Open `/company/accounts/new` and confirm the page opens for admin.
- [ ] Open `/projects/project-relax-tower/demands/batches/new`.
- [ ] Create one phase demand batch with an approved service charge entry included.
- [ ] Open the created batch detail and confirm:
  - base amount
  - service charge amount
  - total billable amount
  - issued demand count
- [ ] Open the batch print page and confirm buyer notice styling is print-friendly.
- [ ] Open `/projects/project-relax-tower/reports` and confirm grouped report categories render.
- [ ] Open `/projects/project-relax-tower/reports/complete-project` and confirm:
  - branded report layout
  - section headings
  - signature block
- [ ] Log out and log back in as `engineer@relaxdevelopers.com` / `engineer123`.
- [ ] Confirm `/projects` opens and only assigned project work is visible.
- [ ] Confirm `/projects/project-relax-tower/finance` opens.
- [ ] Confirm `/company/users` redirects to `/access-denied`.
- [ ] Confirm `/company/accounts/new` redirects to `/access-denied`.
- [ ] Confirm `/buyers`, `/collections`, `/expenses`, and `/suppliers` redirect to `/access-denied`.
- [ ] Confirm `/projects/project-madina-garden/finance` redirects to `/access-denied`.

## T. Legacy Security / Report Export Polish

- [ ] Login with `engineer@relaxdevelopers.com` / `engineer123`.
- [ ] Confirm `/buyers/new`, `/collections/new`, `/expenses/new`, `/suppliers/new`, and `/phases/new` redirect to `/access-denied`.
- [ ] Confirm `GET /api/projects` only returns assigned projects for the engineer.
- [ ] Confirm project-only write calls to `/api/collections`, `/api/expenses`, `/api/phases`, and `/api/suppliers` return clean 403/404 JSON when outside assignment or missing permission.
- [ ] Login with `admin@relaxdevelopers.com` / `admin123`.
- [ ] Confirm `/projects/project-relax-tower/reports` shows grouped report cards and honest Print-ready / CSV / Excel workbook / PDF / Coming next status.
- [ ] Confirm `/projects/project-relax-tower/reports/complete-project` opens and shows print controls, XLSX workbook, CSV, report sections, and signature area.
- [ ] Confirm `/api/projects/project-relax-tower/reports/complete-project/xlsx` downloads a workbook with summary, top sheet, phase, expense, vendor, buyer due, cash/bank, cheque, tax, retention, service charge, final reconciliation, and audit sheets.
- [ ] Confirm demand batch print pages show per-buyer demand notice / bill blocks with base phase cost, service charge, adjustment, carry-forward, amount payable, due date, payment instruction, and signature.
- [ ] Confirm browser Print / Save as PDF uses A4 layout and hides app shell/sidebar/header.
- [ ] Confirm seed totals remain:
  - Income: 100,143,800
  - Expense: 104,659,890.40
  - Balance: -4,516,090.40

## U. Security / Dependency / API Guard Pass

- [ ] Run `npm install` and confirm lockfile updates without dependency conflicts.
- [ ] Run `npm audit` and confirm the remaining findings are limited to the documented Next.js, PostCSS, NextAuth/uuid, and dev-tooling advisories.
- [ ] Login with `engineer@relaxdevelopers.com` / `engineer123`.
- [ ] Confirm `/projects/project-relax-tower` opens.
- [ ] Confirm `/projects/project-madina-garden` redirects to `/access-denied`.
- [ ] Confirm `/company/users` redirects to `/access-denied`.
- [ ] Confirm `/company/roles` redirects to `/access-denied`.
- [ ] Confirm `POST /api/company/users` returns 403 for the engineer.
- [ ] Confirm `POST /api/expenses/[id]/approve` returns 403 for the engineer.
- [ ] Confirm `GET /api/projects/project-relax-tower/reports/complete-project/xlsx` returns 403 for the engineer.
- [ ] Login with `admin@relaxdevelopers.com` / `admin123`.
- [ ] Confirm `/company/users` opens.
- [ ] Confirm `/company/roles` opens.
- [ ] Confirm `GET /api/projects/project-relax-tower/reports/complete-project/xlsx` returns 200 and downloads the workbook.
- [ ] Confirm `/projects/project-relax-tower/documents` only shows project/company-visible documents and that upload rejects unsafe file extensions.
- [ ] Confirm report action labels stay honest:
  - workbook only where native XLSX exists
  - CSV only where implemented
  - PDF means browser Print / Save as PDF
- [ ] Confirm `npm run build` passes.
- [ ] Confirm `npm run db:seed` passes.
- [ ] Confirm seed totals remain:
  - Income: 100,143,800
  - Expense: 104,659,890.40
  - Balance: -4,516,090.40

## V. Professional Report System Overhaul

- [ ] Login with `admin@relaxdevelopers.com` / `admin123`.
- [ ] Open `/projects/project-relax-tower/reports` and confirm grouped sections render with professional descriptions and honest export badges.
- [ ] Open `/projects/project-relax-tower/reports/complete-project` and confirm:
  - text/logo fallback is clean
  - no broken image placeholder appears
  - cover page shows company/project/report metadata
  - executive summary cards are compact and aligned
  - collection vs demand interpretation note is visible
  - Top Sheet grand totals match:
    - Income `100,143,800`
    - Expense `104,659,890.40`
    - Balance `-4,516,090.40`
- [ ] Open `/projects/project-relax-tower/reports/top-sheet` and confirm explicit grand totals are visible.
- [ ] Open `/projects/project-relax-tower/reports/service-charge` and `/projects/project-relax-tower/reports/final-reconciliation`.
- [ ] Open `/projects/project-relax-tower/demands/batches/[batchId]/print` and confirm the demand notice layout is business-facing and print-friendly.
- [ ] Download `/api/projects/project-relax-tower/reports/complete-project/xlsx` and confirm sheets:
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
- [ ] Confirm the workbook Top Sheet includes a grand total row.
- [ ] Login with `engineer@relaxdevelopers.com` / `engineer123`.
- [ ] Confirm `GET /api/projects/project-relax-tower/reports/complete-project/xlsx` returns 403.

## W. Report Control / Invoice / Dummy Data Phase

- [ ] Login with `admin@relaxdevelopers.com` / `admin123`.
- [ ] Open `/projects/project-madina-demo-complete/reports/complete-project`.
- [ ] Confirm the report-control panel changes the URL query and the screen report updates without crashing.
- [ ] Confirm Daily Project Cost Details shows mixed source rows, including:
  - direct expense
  - supplier bill item
  - subcontractor bill
  - service charge
- [ ] Confirm supplier bill item rows include `Iron rod - 3.5 ton` under `New SK Traders`.
- [ ] Confirm supplier bill items appear inside Daily Project Cost Details, not as a duplicate separate phase-detail bill section.
- [ ] Confirm `/projects/project-madina-demo-complete/reports/expense-report` uses the same filtered cost story as the Complete Project Report.
- [ ] Download `/api/projects/project-madina-demo-complete/reports/complete-project/xlsx` and confirm sheets:
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
- [ ] Confirm the workbook opens without repair prompts and reflects the selected filters.
- [ ] Confirm `/projects/project-madina-demo-complete/demands/batches/demo-batch-piling/print` opens and shows a real buyer bill breakdown.
- [ ] Confirm `/projects/project-madina-demo-complete/collections/demo-col-001/receipt` opens.
- [ ] Confirm `/projects/project-madina-demo-complete/payables/demo-payable-sk-001/invoice` opens.
- [ ] Confirm `/projects/project-madina-demo-complete/payables/demo-payable-structure-02/payments/demo-payment-structure-progress/voucher` opens.
- [ ] Confirm `/projects/project-madina-demo-complete/expenses/demo-exp-legal-reg/voucher` opens.
- [ ] Confirm `/projects/project-madina-demo-complete/payables/demo-payable-structure-02/retention-release/demo-payment-structure-release/voucher` opens.
- [ ] Confirm `/projects/project-madina-demo-complete/finance/final-reconciliation/demo-final-reconciliation-001/notice` opens.
- [ ] Login with `engineer@relaxdevelopers.com` / `engineer123`.
- [ ] Confirm `/projects/project-madina-demo-complete/reports/complete-project` redirects to `/access-denied`.
- [ ] Confirm `GET /api/projects/project-madina-demo-complete/reports/complete-project/xlsx` returns `403`.
- [ ] Confirm no Radix Select empty-value runtime error appears on the checked routes.

## X. Phase / Print / Workbook Production Pass

- [ ] Login with `admin@relaxdevelopers.com` / `admin123`.
- [ ] Open `/phases/demo-phase-piling` and confirm the redesigned phase page shows:
  - construction cost
  - Company Service Charge / Supervision Fee
  - total billable phase cost
  - phase balance
  - category breakdown
  - daily project cost details
- [ ] Open `/projects/project-madina-demo-complete/reports/complete-project` and confirm the toolbar shows `View Print/PDF Version` and `Export Excel Workbook`.
- [ ] Open `/projects/project-madina-demo-complete/reports/complete-project/print` and confirm:
  - no sidebar, app header, filters, or controls appear
  - report header/cover appears
  - supplier bill item rows such as `Iron rod - 3.5 ton` appear in daily project cost details
  - signature page appears near the end
- [ ] Use browser Print / Save as PDF on the print route and confirm the report spans multiple pages instead of one clipped viewport.
- [ ] Download `/api/projects/project-madina-demo-complete/reports/complete-project/xlsx` and confirm:
  - `00 Index` exists
  - numbered main sheets `01` through `15` exist
  - every demo phase has both `Pxx Breakdown - [Phase]` and `Pxx Daily Cost - [Phase]` tabs
  - amount columns open as numeric values
  - supplier bill items appear inside daily project cost sheets
  - Supplier Ledger remains separate
- [ ] Login with `engineer@relaxdevelopers.com` / `engineer123`.
- [ ] Confirm `GET /api/projects/project-madina-demo-complete/reports/complete-project/xlsx` returns `403`.

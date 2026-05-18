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
- [ ] PDF/Excel buttons are disabled and do not claim export is complete.

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

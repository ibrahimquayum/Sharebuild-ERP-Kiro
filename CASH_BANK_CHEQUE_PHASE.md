## Cash / Bank / Cheque Phase

**Date:** 2026-05-22  
**Branch:** `feat/erp-v1`

### Current Money Movement Status

- Buyer collections reduce buyer receivable and create collection records.
- Direct expenses create project cost records.
- Supplier and subcontractor payments reduce payable balances.
- Supplier and subcontractor bills already count as project cost without double-counting payments.
- There is currently no durable company account master.
- There is currently no dedicated cash/bank transaction ledger.
- There is currently no cheque lifecycle register.
- Finance summary still estimates cash position from collections and payments instead of reading from a treasury ledger.

### Schema Gaps

- Missing company-level cash/bank account master.
- Missing durable money-movement ledger tied to collections, expenses, and vendor payments.
- Missing cheque register with pending, cleared, bounced, cancelled lifecycle.
- Missing account transfer support.
- Existing `Collection`, `Expense`, and `SupplierPayment` records do not formally store account selection.
- Existing payment/expense records do not capture complete cheque metadata consistently.

### Planned Models / Fields

One migration in this phase adds:

- `CashBankAccount`
- `CashBankTransaction`
- `ChequeLog`
- `AccountTransfer`

And extends existing records with account / cheque fields where needed:

- `Collection.accountId`
- `Collection.chequeBranchName`
- `Collection.chequeMaturityDate`
- `Expense.accountId`
- `Expense.referenceNo`
- `Expense.chequeNo`
- `Expense.chequeDate`
- `Expense.chequeBankName`
- `Expense.chequeBranchName`
- `Expense.chequeMaturityDate`
- `SupplierPayment.accountId`
- `SupplierPayment.chequeBranchName`
- `SupplierPayment.chequeMaturityDate`

### Accounting Rules Used

- Supplier bill = project cost + supplier payable.
- Supplier payment = cash/bank outflow + payable reduction only.
- Subcontractor bill = project cost + subcontractor payable.
- Subcontractor payment = cash/bank outflow + payable reduction only.
- Direct expense = project cost + immediate cash/bank outflow once approved/final.
- Buyer collection = cash/bank inflow + buyer receivable reduction or buyer advance.
- Cheque-backed transactions are recorded immediately in business workflow, while cheque status is tracked separately in the cheque register.
- Draft / pending expenses do not post to cash/bank until approved.

### Routes / Pages / APIs To Change

#### Company

- `/company/accounts`
- `/company/accounts/new`
- `/company/accounts/[accountId]`
- `/company/accounts/[accountId]/edit`
- `/company/cheques`
- `/company/reports/cash-bank-book`

#### Project

- `/projects/[id]/finance`
- `/projects/[id]/finance/cash-bank`
- `/projects/[id]/finance/cheques`
- `/projects/[id]/reports/cash-bank-book`
- `/projects/[id]/reports/cheque-register`
- `/projects/[id]/collections/new`
- `/projects/[id]/expenses/new`
- `/projects/[id]/expenses/bulk`
- `/projects/[id]/payables/new`
- `/projects/[id]/subcontractors/bills/new`

#### APIs

- `GET/POST /api/company/accounts`
- `GET/PATCH /api/company/accounts/[id]`
- `POST /api/company/cheques/[id]/status`
- update `POST /api/collections`
- update `POST /api/expenses`
- update `POST /api/projects/[id]/expenses/bulk`
- update `POST /api/suppliers/payables`
- update `POST /api/suppliers/payables/[id]/payments`
- update reversal routes for collections, expenses, and supplier payments

### Testing Plan

1. `npx prisma validate`
2. `npx prisma generate`
3. `npm run build`
4. `npm run db:seed`
5. If schema changes: `npx prisma migrate reset --force --skip-seed`
6. `npm run db:seed`
7. `npx prisma migrate status`

Manual checks:

- Create company account and edit it.
- Record project collection into selected account.
- Record single expense from selected account.
- Record bulk expenses with per-row account and bill number.
- Record supplier payment from selected account.
- Record subcontractor payment from selected account.
- Verify cash/bank book shows inflow/outflow rows.
- Verify cheque register shows pending cheque rows and status changes.
- Verify finance summary shows cash in/out separately from project cost.
- Verify Top Sheet totals remain unchanged.

## Completion Update - May 23, 2026

- Company cash/bank account management is now live.
- Company account transfer UI and API are now live.
- Project cash/bank book and cheque register are live and print-ready.
- Buyer collections, approved direct expenses, supplier payments, and subcontractor payments now post treasury transactions through `CashBankTransaction`.
- Cheque-backed treasury rows now stay `DRAFT` until the cheque is cleared.
- Cheque status transitions now validate pending-only updates and can:
  - post linked treasury movement on clear
  - cancel linked treasury movement on bounce/cancel
  - reverse buyer collection business effect on bounced/cancelled received cheques
  - reverse supplier/subcontractor payment business effect on bounced/cancelled issued cheques
- Known simplification:
  - direct-expense cheque bounce/cancel currently cancels treasury movement but keeps the expense cost record, because the expense itself may still be a valid project cost even when payment failed.

### Implementation Status

Implemented in this pass:

- One clean migration:
  - `prisma/migrations/0007_cash_bank_cheque_phase/migration.sql`
- New models:
  - `CashBankAccount`
  - `CashBankTransaction`
  - `ChequeLog`
  - `AccountTransfer`
- Existing finance records now carry treasury metadata where relevant:
  - `Collection.accountId`
  - `Expense.accountId`
  - `Expense.referenceNo`
  - `Expense.chequeNo`
  - `Expense.chequeDate`
  - `Expense.chequeBankName`
  - `Expense.chequeBranchName`
  - `Expense.chequeMaturityDate`
  - `SupplierPayment.accountId`
  - `SupplierPayment.chequeBranchName`
  - `SupplierPayment.chequeMaturityDate`
- New treasury helper:
  - `src/lib/cash-bank.ts`
- Company treasury UI:
  - `/company/accounts`
  - `/company/accounts/new`
  - `/company/accounts/[accountId]`
  - `/company/accounts/[accountId]/edit`
  - `/company/cheques`
- Project treasury UI:
  - `/projects/[id]/finance/cash-bank`
  - `/projects/[id]/finance/cheques`
  - `/projects/[id]/reports/cash-bank-book`
  - `/projects/[id]/reports/cheque-register`
- Finance hub now shows:
  - cash in
  - cash out
  - net cash movement
  - account balance
  - pending received cheques
  - pending issued cheques
  - bounced cheques
- Collections now create cash/bank inflow transactions.
- Approved/final expenses now create cash/bank outflow transactions.
- Bulk expenses now create cash/bank outflow transactions per approved/final row.
- Supplier payments now create cash/bank outflow transactions.
- Subcontractor payments use the same treasury flow with separate source typing.
- Cheque-backed collections, expenses, and supplier/subcontractor payments now create `ChequeLog` rows.
- Seed now creates default company accounts and backfills treasury rows for seeded collections and expenses without changing Relax Tower totals.

### Simplifications In This Phase

- Cheque-based collections and payments are posted immediately to business records; cheque status is tracked separately in `ChequeLog`.
- Pending cheque state is visible in treasury/cheque views, but strict clearance-based receivable/payable treatment is deferred to a later phase.
- `AccountTransfer` schema exists, but a full transfer UI was not completed in this phase.
- Company-wide cash/bank report shell was deferred; the project cash/bank book and company account detail views are the primary treasury views for now.

### Verification Result

- `npx prisma validate` — pass
- `npx prisma generate` — pass
- `npm run build` — pass
- `npm run db:seed` — pass
- `npx prisma migrate reset --force --skip-seed` — pass
- `npm run db:seed` after reset — pass
- `npx prisma migrate status` — pass
- Authenticated route smoke checks returned `200` for:
  - `/dashboard`
  - `/company/accounts`
  - `/company/cheques`
  - `/projects/project-relax-tower/finance`
  - `/projects/project-relax-tower/finance/cash-bank`
  - `/projects/project-relax-tower/finance/cheques`
- Seeded treasury data now includes:
  - 2 default company accounts
  - buyer collection inflow transactions
  - direct expense outflow transactions

### Known Gaps

- No dedicated transfer entry UI yet.
- No strict cheque-clearance accounting yet for receivable/payable recognition.
- No VAT/AIT/TDS handling yet.
- No retention/security ledger yet.
- No final reconciliation yet.

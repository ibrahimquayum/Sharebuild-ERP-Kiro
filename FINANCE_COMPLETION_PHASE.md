## Finance Completion Phase

### Current Status
- Project-first finance foundation is live: demands, collections, direct expenses, supplier bills, subcontractor bills, treasury accounts, cash/bank transactions, cheque register, finance hub, and branded report foundations.
- Supplier and subcontractor payments already post treasury outflows and do not count as project cost.
- Cash/bank and cheque tracking are functional, but cheque handling is still simplified: business records post immediately and cheque status is tracked separately.
- CSV export exists for a small set of reports; print-ready report pages exist more broadly.

### Remaining Schema Gaps
- No persisted tax/deduction structure on supplier or subcontractor bills.
- No persisted retention/security tracking on bills or releases.
- No persisted service charge entries by phase/work basis.
- No final reconciliation model or posting guard.
- Account transfer exists in schema foundation, but no user-facing workflow is wired.
- Cheque lifecycle needs stricter state transitions and linked-effect tracking.

### Accounting Rules For This Phase
- Supplier bill = project cost + supplier payable.
- Supplier payment = treasury outflow + payable reduction. Never a second cost.
- Subcontractor bill = project cost + subcontractor payable.
- Subcontractor payment = treasury outflow + payable reduction. Never a second cost.
- Direct expense = project cost + treasury outflow.
- Buyer demand = receivable.
- Buyer collection = treasury inflow + receivable reduction or buyer advance.
- Tax deduction reduces current net payable but remains visible in ledger/reporting.
- Retention reduces current net payable but remains payable later until released or adjusted.
- Pending cheque visibility must be separate from cleared treasury views where practical.

### Proposed Implementation Plan
1. Extend payable schema once:
   - Add gross/tax/deduction/net-payable fields to `SupplierPayable`.
   - Add retention fields to `SupplierPayable`.
   - Add optional `serviceChargeBasis` and `serviceChargeAmount` where needed for reporting.
   - Add `FinalReconciliation` plus reconciliation line items if posting is implemented safely enough.
2. Add transfer workflow:
   - Company transfer list/create pages.
   - Transfer API and linked treasury transactions.
3. Harden cheque lifecycle:
   - Enforce valid transitions.
   - Record business-posted vs cheque-cleared state clearly.
   - Restore/flag linked receivable or payable on bounce/cancel where safe.
4. Expand reports and exports:
   - Cash/bank book and cheque register stay print-ready.
   - Add finance CSV endpoints for new tax, retention, and reconciliation views.
   - Keep PDF as print-first unless a real generator is already safe to use.
5. Finalize finance hub:
   - Separate cost, payable, treasury, tax, retention, and reconciliation summaries.

### Routes / Pages / APIs Expected To Change
- `/projects/[id]/payables/new`
- `/projects/[id]/subcontractors/bills/new`
- `/projects/[id]/finance`
- `/projects/[id]/finance/cheques`
- `/projects/[id]/finance/final-reconciliation`
- `/company/accounts/transfers`
- `/company/accounts/transfers/new`
- `/api/suppliers/payables`
- `/api/suppliers/payables/[id]/payments`
- `/api/collections`
- `/api/company/cheques/[id]/status`
- `/api/company/accounts/transfers`
- report pages and CSV export routes

### Migration Risk
- Moderate: extending `SupplierPayable` is safer than introducing parallel financial tables for tax/retention in this pass.
- Higher risk area: bounced cheque restoration and final reconciliation posting, because both touch live balance logic.
- Constraint: keep this to one clean migration only.

### Testing Plan
- `npx prisma validate`
- `npx prisma generate`
- `npm run build`
- `npm run db:seed`
- if schema changes: `npx prisma migrate reset --force --skip-seed`, `npm run db:seed`, `npx prisma migrate status`
- Verify:
  - supplier bill tax fields save and display
  - subcontractor bill retention fields save and display
  - account transfer creates paired treasury entries
  - cheque status updates follow valid transitions
  - finance hub opens with tax/retention/treasury split
  - final reconciliation preview opens
  - report exports return real data or stay honestly disabled
  - Relax Tower totals remain:
    - Income `100,143,800`
    - Expense `104,659,890.40`
    - Balance `-4,516,090.40`

### Completion Notes - May 23, 2026

- Implemented with one migration: `0008_finance_completion_phase`.
- Chosen simplifications:
  - service charge is computed for reporting from project/phase percentages instead of using a dedicated persisted ledger entry
  - final reconciliation is preview/export only in this pass and does not post buyer demand records
  - cheque clearance now controls treasury posting state, while business posting is reversed on bounced/cancelled buyer collections and supplier/subcontractor payments
  - direct-expense bounced cheques cancel treasury movement without deleting the cost record

### Superseded By Final Finance QA Pass

This document remains accurate for the tax, retention, transfer, and cheque phase, but two areas have now moved forward:

- service charge is no longer preview-only; it now has a persisted `ServiceChargeEntry` ledger and approval/reversal workflow
- final reconciliation is no longer preview-only; it now supports controlled posting and reversal through:
  - `FinalReconciliation`
  - `FinalReconciliationLine`
  - `Demand.demandType = FINAL_RECONCILIATION`

See `FINAL_FINANCE_QA_RECONCILIATION_PHASE.md` for the current source of truth on those two ledgers.

# Final Finance QA + Reconciliation Phase

Date: 2026-05-23  
Branch: `feat/erp-v1`

## Current Finance Status

The finance core is already project-first and mostly audit-safe:

- buyer demand, collection, FIFO/manual allocation, and buyer advance exist
- direct expenses and bulk expenses post project cost
- supplier and subcontractor bills create project cost and payable
- supplier and subcontractor payments reduce payable and post treasury outflow
- cash/bank accounts, treasury transactions, cheque register, retention, tax/deduction fields, and account transfers exist
- final reconciliation preview exists
- finance CSV exports exist for key treasury and finance reports

The remaining gaps before SaaS readiness are not foundation gaps anymore. They are consistency and posting gaps:

- service charge is still computed, not posted to a dedicated ledger
- final reconciliation is still preview-only
- buyer due/advance and report totals need to read from the same finance truth tables
- finance readiness needs an explicit checklist instead of informal interpretation

## Remaining Accounting Risks

### High Risk

- final reconciliation cannot post a controlled buyer-side result yet
- service charge is not persisted as company income
- buyer due and advance views can drift when preview-only reconciliation or credits exist

### Medium Risk

- some report totals still depend on page-local calculations instead of shared helpers
- reversal of a future posted reconciliation needs guardrails around collected reconciliation demands

### Lower Risk

- service charge is currently informative in reports but not yet part of a posted ledger
- readiness / close indicators are visible in pieces, not as one explicit finance-ready checklist

## Finance QA Audit Matrix

| Module | Source | Official formula | Included statuses | Excluded statuses | Reversal support | Cash/Bank impact | Risk |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Buyer Demand | `Demand` | sum demand amount | non-cancelled, and later posted reconciliation demand | cancelled | partial | no | medium |
| Buyer Collection | `Collection`, `CollectionAllocation` | sum non-reversed collection / allocation | non-reversed | reversed | yes | inflow | medium |
| Buyer Advance | collection minus allocated paid minus posted surplus credits | non-reversed collections and posted credits | reversed/cancelled | partial | inflow only | medium |
| Direct Expense | `Expense` | approved/paid/partially-paid amount | final expense statuses | reversed/cancelled/pending | yes | outflow when posted | low |
| Supplier Bill | `SupplierPayable` | gross bill amount | non-reversed | reversed | yes | none at bill time | low |
| Supplier Payment | `SupplierPayment` | paid amount only for payable reduction | non-reversed | reversed/cancelled | yes | outflow | low |
| Subcontractor Bill | `SupplierPayable` filtered by supplier type | gross bill amount | non-reversed | reversed | yes | none at bill time | low |
| Subcontractor Payment | `SupplierPayment` filtered by supplier type | paid amount only for payable reduction | non-reversed | reversed/cancelled | yes | outflow | low |
| Tax / Deduction | bill-level fields on `SupplierPayable` | VAT + AIT/TDS + other deduction | non-reversed bills | reversed | indirect | none directly | medium |
| Retention | bill-level fields on `SupplierPayable` | retained minus released | non-reversed bills | reversed | partial | outflow on release | medium |
| Account Transfer | `AccountTransfer`, `CashBankTransaction` | transfer in/out only | posted | reversed/cancelled | partial | internal movement | low |
| Cheque Register | `ChequeLog` | cheque amount by state | pending/cleared/bounced/cancelled | replaced parent where needed | yes | treasury status | medium |
| Service Charge | currently computed only | approved or calculated phase/project service charge | not yet persisted | n/a | no | none | high |
| Final Reconciliation | preview helper only | final surplus/deficit distribution | preview only | n/a | no | none | high |

## Service Charge Design

Service charge must be persisted as company income and must stay separate from project material or labour cost.

Planned ledger model:

- `ServiceChargeEntry`
- one row per phase or project-level calculation
- basis type can be project default, direct expense, supplier bills, subcontractor bills, total phase cost, or manual
- status must move through `DRAFT`, `CALCULATED`, `APPROVED`, `REVERSED`

Accounting treatment:

- service charge is company income
- it does not inflate project direct/supplier/subcontractor cost
- it affects final surplus/deficit when management decides it is part of the company’s recoverable income
- if `includedInDemand = true`, later buyer-facing demand/reporting must show it clearly

## Reconciliation Posting Design

Posting must move final reconciliation from preview to controlled accounting action.

### Posting rules

- only one active posted reconciliation per project
- project deficit creates final reconciliation demand rows
- project surplus creates posted buyer credit lines
- posting requires confirmation, reason/note, and permission
- reversal requires reason and is blocked if posted reconciliation demands already have non-reversed collections

### Distribution basis

- distribute by project unit ownership share
- one buyer with multiple units receives combined share
- co-owners split by `UnitBuyer.sharePercent`

### Persistence

- `FinalReconciliation`
- `FinalReconciliationLine`
- `Demand.demandType` so final reconciliation demands are explicitly marked

## QA Checklist

1. finance hub and report totals use the same helper formulas
2. posted service charge appears in finance hub and service charge report
3. final reconciliation preview and posted result match buyer-by-buyer distribution totals
4. posted deficit creates `FINAL_RECONCILIATION` demand rows
5. posted surplus creates buyer credit lines and updates project-scoped advance view
6. reversed/cancelled records drop out of official totals
7. supplier/subcontractor payments never inflate project cost
8. Top Sheet totals remain unchanged for Relax Tower

## Exact Implementation Plan

1. add one clean migration for:
   - `DemandType`
   - `ServiceChargeStatus`
   - `FinalReconciliationType`
   - `FinalReconciliationStatus`
   - `ServiceChargeEntry`
   - `FinalReconciliation`
   - `FinalReconciliationLine`
   - `Demand.demandType`
   - optional relation from `Demand` to `FinalReconciliation`
2. add shared finance helper functions for:
   - official service charge totals
   - buyer project ledger with posted reconciliation effects
   - final reconciliation preview and posting payload
   - finance readiness checklist
3. implement service charge API + page/report
4. implement final reconciliation post/reverse API + page/report/export
5. align buyer due/advance, finance hub, and report data to the same formulas
6. run Prisma/build/seed verification and update docs

## Migration Risk

Moderate.

This pass changes live finance truth tables, so the safest approach is:

- one additive migration
- no replacement of current cost/payable/treasury tables
- use new posted ledgers for service charge and reconciliation
- keep old preview logic only as fallback until posted rows exist

## Completion Notes - May 23, 2026

- Implemented with one additive migration:
  - `20260523095713_final_finance_qa_reconciliation_phase`
- Added persisted finance ledgers:
  - `ServiceChargeEntry`
  - `FinalReconciliation`
  - `FinalReconciliationLine`
  - `Demand.demandType`
  - `Demand.finalReconciliationId`
- Service charge now has:
  - calculate
  - approve
  - reverse
  - phase/project reporting visibility
- Final reconciliation now has:
  - preview
  - posting
  - posted result visibility
  - reversal guardrails
  - generated demand traceability through `FINAL_RECONCILIATION` demand rows
- Shared finance truth now drives:
  - buyer due / advance
  - finance hub summary
  - phase balances
  - complete project report
  - service charge report
  - final reconciliation report and CSV

## Current Simplifications

- Service charge uses the configured project/phase percentage basis and persists ledger rows only when calculated or approved; no separate cash receipt flow exists yet.
- Final reconciliation surplus posts buyer credit lines in the reconciliation ledger, but not a separate refund/payment workflow.
- Seeded Relax Tower data does not include unit ownership rows, so final reconciliation posting is intentionally blocked until ownership is assigned.
- Official Relax Tower Top Sheet totals remain unchanged:
  - Income `100,143,800`
  - Expense `104,659,890.40`
  - Balance `-4,516,090.40`

## Ownership Seed And Finance QA Update - May 24, 2026

- Added realistic Relax Tower ownership seed:
  - 54 apartment units
  - 50 buyers
  - 56 ownership rows
  - multiple two-unit buyers
  - two co-owned units
- Added durable settlement metadata for:
  - `ServiceChargeEntry`
  - `FinalReconciliationLine` surplus credit outcomes
- Service charge now supports:
  - calculate
  - approve
  - separate settlement to a treasury account
  - included-in-demand vs settled tracking
- Final reconciliation browser QA now verifies:
  - preview opens with seeded ownership
  - posted deficit creates `FINAL_RECONCILIATION` demand rows
  - generated demand rows are visible in `/projects/[id]/demands`
  - finance hub and reports reflect posted reconciliation totals consistently
- Relax Tower was re-seeded after QA so the repo finishes in a clean baseline with realistic ownership preserved.

## Access / Billing Alignment Update - May 24, 2026

- Final reconciliation demand traceability is now exposed in the project demand API:
  - `demandType`
  - `demandBatchId`
  - `finalReconciliationId`
  - base / service-charge / adjustment / carry-forward portions
- Demand batches now provide the buyer-facing bridge between:
  - approved service charge
  - phase billing
  - project-scoped demand issuance
- QA now includes a second seeded project (`Madina Garden`) so project-only access and unauthorized project routing can be tested without disturbing Relax Tower finance totals.

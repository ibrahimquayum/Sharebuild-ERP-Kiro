# Real World Finance Architecture

Date: 2026-05-22  
Branch: `feat/erp-v1`  
Status: Design only. No implementation in this pass.

## Phase 1 Status Update

Phase 1 of this architecture is now implemented in code on `feat/erp-v1`:

- Formal `ProjectSupplier` assignment layer added.
- Formal `ProjectSubcontractor` assignment layer added.
- Supplier and subcontractor bills can link to the project assignment layer.
- Contract/rate/agreement documents can link to project supplier/subcontractor assignments.
- Project finance now treats supplier and subcontractor bills as project cost while payments reduce payable without creating a second cost.

The remaining roadmap phases below are still the source of truth for later cash/bank, tax, retention, service charge, and final reconciliation work.

## Phase 2 Status Update

Phase 2 of this architecture is now implemented in code on `feat/erp-v1`:

- Formal `CashBankAccount` model added for company treasury accounts.
- Formal `CashBankTransaction` ledger added for durable money movement.
- Formal `ChequeLog` model added for pending, cleared, bounced, and cancelled cheque tracking.
- `AccountTransfer` schema foundation added for later internal transfer workflows.
- Collections now post treasury inflows.
- Approved/final direct expenses now post treasury outflows.
- Supplier and subcontractor payments now post treasury outflows without creating additional project cost.
- Project finance now shows treasury movement separately from project cost.
- Default seeded company accounts and treasury backfill now exist for Relax Tower demo data.

The remaining roadmap phases below are still the source of truth for tax, retention, service charge, and final reconciliation work.

## Phase 3+ Status Update

The next finance completion pass is now partially implemented in code on `feat/erp-v1`:

- Bill-level VAT/AIT/TDS/other deduction fields now exist on supplier and subcontractor bills.
- Bill-level retention/security fields now exist on supplier and subcontractor bills.
- Retention release now has a guarded workflow that creates treasury/payment effect without double-counting cost.
- Account transfer workflow is now live for company treasury accounts.
- Cheque lifecycle is now stricter:
  - cheque-backed treasury rows stay pending until cleared
  - bounced/cancelled buyer cheque collections reverse the collection effect
  - bounced/cancelled supplier/subcontractor cheque payments restore payable
- Final reconciliation now has a project-scoped preview page and CSV export foundation.
- Tax, retention, cash/bank book, cheque register, and final reconciliation now have print-ready report pages and Excel-compatible CSV export endpoints.

Remaining gaps from this architecture:

- no dedicated VAT/AIT/TDS liability ledger yet
- no dedicated service charge entry ledger yet
- no final reconciliation posting that creates buyer demand rows yet
- no full replacement-cheque workflow yet
- no true XLSX workbook or server-generated PDF yet

## Phase 4 Status Update

The finance QA, service charge, and final reconciliation pass is now implemented in code on `feat/erp-v1`:

- `ServiceChargeEntry` now provides a persisted service charge ledger with calculate, approve, and reverse workflow.
- `FinalReconciliation` and `FinalReconciliationLine` now provide controlled project-level posting and reversal.
- `Demand` now distinguishes regular demand from `FINAL_RECONCILIATION` demand.
- Buyer due and buyer advance views now read posted reconciliation impact from the shared finance helper.
- Finance hub, complete project report, service charge report, and final reconciliation report now use the same ledger-backed formulas.

Remaining gaps from this architecture:

- service charge collection and separate income settlement workflow still remain future
- surplus reconciliation still posts buyer credit lines without a dedicated refund payment workflow
- project closing and finance-ready workflow is still checklist-based, not a full close process
- no true XLSX workbook or server-generated PDF yet

## Phase 4.5 Status Update

The access-control and billing-alignment layer is now implemented on `feat/erp-v1`:

- dynamic company roles and persisted role-permission rows now exist
- project staff assignment is now enforced in page/API access helpers
- phase billing now has a persisted `DemandBatch` layer
- service charge can now be included directly in batch-issued buyer demands
- final reconciliation demand rows are now explicitly traceable in project demand APIs

Remaining architectural gaps after this step:

- some legacy client-form routes still need server-wrapper first-load access denial
- native XLSX workbook export is still absent
- browser print remains the PDF path

## 1. Finance Philosophy

Sharebuild ERP should treat project finance as five separate truths that must reconcile but must not be merged:

1. Cost: what the project consumed or incurred.
2. Payable: what the project still owes to suppliers or subcontractors.
3. Cash/Bank Movement: where money actually moved.
4. Receivable: what buyers owe to the project.
5. Income: what the company earns, including service charge and other non-cost inflows.

The core rule is simple:

- A supplier bill is cost plus payable.
- A supplier payment is payable reduction plus cash/bank outflow.
- A subcontractor bill is cost plus payable.
- A subcontractor payment is payable reduction plus cash/bank outflow.
- A direct expense is cost plus cash/bank outflow immediately.
- A buyer demand is receivable.
- A buyer collection is receivable reduction or buyer advance plus cash/bank inflow.

This means project cost must come from approved direct expenses, approved supplier bills, and approved subcontractor bills. Payments must never create cost again.

## 2. Transaction Types

### Buyer Demand

- Meaning: A receivable raised against a buyer for a phase, unit, ownership share, or final adjustment.
- When to use: When management issues phase-wise cost participation to buyers.
- Project impact: Increases buyer receivable.
- Phase impact: Usually linked to one phase; final reconciliation demand may be project-level.
- Cash/bank impact: None.
- Payable/receivable impact: Increases receivable.
- Report impact: Buyer due report, phase finance, buyer statement, final reconciliation.
- Example: Phase 7 slab demand issued at BDT 250,000 per unit.

### Buyer Collection

- Meaning: Money received from a buyer.
- When to use: Any buyer payment received by cash, bank, cheque, or mobile banking.
- Project impact: Increases project cash/bank inflow.
- Phase impact: Usually allocated to one or more demands, often FIFO.
- Cash/bank impact: Inflow to a specific account.
- Payable/receivable impact: Reduces receivable or creates buyer advance.
- Report impact: Collection report, buyer ledger, cash/bank book, phase finance.
- Example: Buyer pays BDT 150,000 by bank transfer against two unpaid phase demands.

### Collection Allocation

- Meaning: The mapping between one collection and one or more demands.
- When to use: Every time a collection is applied to demand.
- Project impact: Keeps buyer due and advance accurate.
- Phase impact: Determines which phase receivable is settled.
- Cash/bank impact: None beyond the original collection.
- Payable/receivable impact: Reduces specific demand due.
- Report impact: Buyer statement, due report, phase due, final reconciliation.
- Example: BDT 150,000 collection allocates BDT 100,000 to oldest demand and BDT 50,000 to current phase.

### Direct Expense

- Meaning: Immediate project cost paid directly without creating a vendor payable.
- When to use: Site cash expenses, local hardware, tea/food, emergency transport, small local shop purchases.
- Project impact: Increases cost immediately.
- Phase impact: Usually phase-linked.
- Cash/bank impact: Immediate outflow from a selected account.
- Payable/receivable impact: No payable unless explicitly converted later.
- Report impact: Expense report, cash/bank book, phase finance, audit report.
- Example: Site engineer buys emergency shuttering nails from a local shop and pays cash same day.

### Supplier Bill

- Meaning: A material/vendor bill that records project cost and supplier payable.
- When to use: Rod, cement, brick, sand, stone, sanitary, electrical material, equipment hire, or other vendor invoice.
- Project impact: Increases cost and supplier payable.
- Phase impact: Phase-linked when possible, otherwise project-general.
- Cash/bank impact: None at bill time unless immediate payment is also entered.
- Payable/receivable impact: Increases supplier payable.
- Report impact: Supplier ledger, project cost report, phase finance, complete project report.
- Example: ABC Steel submits a BDT 800,000 rod supply invoice for Phase 5.

### Supplier Payment

- Meaning: Payment against a supplier payable.
- When to use: Paying a supplier bill partially or fully.
- Project impact: Reduces payable, not cost.
- Phase impact: Indirect through the linked bill.
- Cash/bank impact: Outflow from a selected account.
- Payable/receivable impact: Reduces supplier payable.
- Report impact: Supplier ledger, cash/bank book, payable aging, cheque register.
- Example: BDT 300,000 bank transfer paid to ABC Steel against an older rod bill.

### Subcontractor Contract

- Meaning: A project-specific engagement record for a subcontractor.
- When to use: When a piling, civil, plumbing, tiles, painting, or similar work package is awarded.
- Project impact: Defines commitment, terms, retention, tax rule, and documents.
- Phase impact: May cover one or more phases.
- Cash/bank impact: None by itself.
- Payable/receivable impact: None by itself.
- Report impact: Subcontractor contract register, project vendor report, audit readiness.
- Example: A civil contractor is assigned structure work for BDT 1.8 crore with 5 percent retention.

### Subcontractor Bill

- Meaning: A progress bill, running bill, extra work bill, or final bill raised by a subcontractor.
- When to use: As work is measured and billed against a contract.
- Project impact: Increases project cost and subcontractor payable.
- Phase impact: Usually phase-linked.
- Cash/bank impact: None unless immediate payment is entered.
- Payable/receivable impact: Increases subcontractor payable, net of deductions if configured.
- Report impact: Subcontractor ledger, phase finance, retention report, tax report, complete project report.
- Example: Plumbing subcontractor submits a BDT 350,000 progress bill with retention and TDS deduction.

### Subcontractor Payment

- Meaning: Payment made against a subcontractor bill or contract balance.
- When to use: Paying certified work bills.
- Project impact: Reduces subcontractor payable, not cost.
- Phase impact: Indirect through linked bill or contract.
- Cash/bank impact: Outflow from a selected account.
- Payable/receivable impact: Reduces subcontractor payable.
- Report impact: Subcontractor ledger, cash/bank book, retention release tracking.
- Example: BDT 250,000 cheque issued against a progress bill after deductions.

### Retention Hold

- Meaning: A portion of a subcontractor or supplier bill intentionally withheld for later release.
- When to use: Contract terms require security, defect liability, or completion retention.
- Project impact: Cost stays recognized, but net payable now is reduced and retention payable later is tracked.
- Phase impact: Usually linked to the billed phase.
- Cash/bank impact: No immediate cash movement.
- Payable/receivable impact: Splits bill obligation into payable-now and retained-payable-later.
- Report impact: Retention report, subcontractor ledger, project payable summary.
- Example: 5 percent retained from a progress bill until handover.

### Retention Release

- Meaning: Later payment or release of previously retained amount.
- When to use: On completion, after liability period, or when management releases retention.
- Project impact: No new cost.
- Phase impact: Usually linked back to original bill/contract.
- Cash/bank impact: Outflow from a selected account.
- Payable/receivable impact: Reduces retention payable.
- Report impact: Retention register, cash/bank book, subcontractor ledger.
- Example: Retention of BDT 80,000 released after snag clearance.

### Tax/VAT/AIT/TDS Deduction

- Meaning: Statutory or contractual deduction taken from a bill or payment.
- When to use: VAT, AIT, TDS, or other regulatory deductions apply.
- Project impact: Gross project cost usually remains the full bill amount; net payable now is reduced; deduction payable is tracked separately.
- Phase impact: Usually linked to the related phase.
- Cash/bank impact: Reduces immediate cash paid to vendor and may create tax liability to government.
- Payable/receivable impact: Splits gross payable into vendor net plus tax payable.
- Report impact: Tax report, ledger, audit, payment summary.
- Example: 7.5 percent VAT and 3 percent AIT deducted from a subcontractor bill.

### Service Charge Income

- Meaning: Company income earned for development management or service charge.
- When to use: Madina charges a percentage or manual amount on phase or project cost.
- Project impact: Creates company income and can optionally be included in buyer demand.
- Phase impact: Can be phase-specific or project-default based.
- Cash/bank impact: None by itself unless collected from buyers.
- Payable/receivable impact: If included in demand, raises buyer receivable; if separate, stays as internal income calculation.
- Report impact: Service charge income report, phase finance, project profitability.
- Example: 5 percent service charge on approved phase cost included in buyer demand.

### Adjustment

- Meaning: Controlled correction that changes financial effect without deleting history.
- When to use: Wrong amount, wrong allocation, wrong deduction, wrong account, or approved record correction.
- Project impact: Depends on adjusted source.
- Phase impact: Depends on adjusted source.
- Cash/bank impact: Depends on adjusted source.
- Payable/receivable impact: Depends on adjusted source.
- Report impact: Audit report, ledger, adjustment register.
- Example: Approved supplier bill entered with wrong quantity; corrected by adjustment entry.

### Reversal

- Meaning: Cancellation of a previously approved financial record while preserving original history.
- When to use: Duplicate entry, invalid bill, bounced collection, cancelled expense, erroneous payment.
- Project impact: Removes or offsets original effect.
- Phase impact: Removes or offsets original effect.
- Cash/bank impact: Depends on record type.
- Payable/receivable impact: Restores original payable or receivable position if needed.
- Report impact: Audit report, ledger, exception reporting.
- Example: Duplicate expense entry reversed with mandatory reason.

### Cash/Bank Transfer

- Meaning: Movement between two internal accounts.
- When to use: Cash deposited to bank, bank-to-bank transfer, mobile wallet top-up, cheque clearing into bank.
- Project impact: No cost or income by itself.
- Phase impact: Usually none.
- Cash/bank impact: One account outflow and another account inflow.
- Payable/receivable impact: None.
- Report impact: Cash/bank book, account statement, cheque lifecycle.
- Example: BDT 500,000 transferred from cash account to bank account.

## 3. Project Vendor Architecture

### Master to project structure

1. Company Supplier Master
   - One row per supplier/vendor identity.
   - Shared across projects.
   - Stores basic profile, contact, bank details, default supplier type.

2. Project Supplier Assignment or Contract
   - One row per supplier per project.
   - Stores project-specific material category focus, assigned phases, rate sheet, agreement, payment terms, credit days, opening balance, and active status.
   - This should become the formal project relationship layer instead of inferring everything from bills.

3. Supplier Bill
   - One row per project bill.
   - Stores gross amount, due date, bill number, phase, line items, optional deduction summary, optional immediate payment metadata.
   - Creates project cost and supplier payable.

4. Supplier Payment
   - One row per project payment.
   - Stores cash/bank account, method, cheque lifecycle, reference, and linked payable.
   - Reduces supplier payable only.

5. Supplier Ledger
   - Bill, payment, deduction, reversal, balance, aging, voucher status.

6. Company-wide Supplier Report
   - Aggregates across projects by supplier.
   - Shows project-wise payable, paid, pending deductions, and document status.

### Architecture rules

- Supplier bill belongs to one project, optionally one phase, and one supplier assignment.
- Supplier payment belongs to one bill or one supplier assignment with allocation rules if later needed.
- Direct expenses should not masquerade as supplier bills unless there is a real vendor bill.
- Small local shop costs should stay as direct expense unless the user intentionally converts the vendor into a supplier master record.

## 4. Project Subcontractor Architecture

### Master to project structure

1. Company Subcontractor Master
   - Identity and contact only.
   - May still use `Supplier` internally short-term, but conceptually separate in design and UX.

2. Project Subcontractor Contract
   - One row per subcontractor per project contract or work package.
   - Stores work type, assigned phases, contract amount, extra work rule, retention rule, tax rule, start/end dates, agreement, measurement basis, and payment terms.

3. Progress Billing
   - One contract can have many bills.
   - Each bill can be running, extra work, final, retention release, or adjustment bill.
   - Bill stores gross amount, deductions, retention hold, net payable.

4. Extra Work
   - Must be tracked separately from base contract.
   - Can be approved as addendum or bill line.

5. Retention
   - Contract-level default rule with bill-level realized amounts.

6. Tax Deductions
   - Optional VAT, AIT, TDS, or other deductions per bill or per payment.

7. Payment
   - Reduces subcontractor payable or retained payable.
   - Must carry account and cheque metadata.

8. Ledger
   - Contract amount, extra work, billed, retained, deducted, paid, due, released retention.

9. Documents
   - Agreement upload on contract.
   - Measurement sheet upload on bill.
   - Invoice upload on bill.
   - Retention release approval/supporting file.

### Architecture rules

- Contract defines commercial terms.
- Bill records earned cost.
- Payment records cash movement.
- Retention and tax split the bill into net payable now versus later obligations.

## 5. Cash/Bank Account Architecture

### Needed structures

1. CashBankAccount
   - Account name
   - account type: cash, bank, mobile banking, petty cash
   - account number or wallet reference
   - bank name or provider
   - opening balance
   - active status
   - company ownership

2. CashBankTransaction
   - account
   - project optional
   - phase optional
   - direction: inflow or outflow
   - source type: collection, direct expense, supplier payment, subcontractor payment, transfer, retention release, refund, adjustment
   - source record id
   - amount
   - transaction date
   - method
   - reference
   - cheque log link optional

3. AccountTransfer
   - from account
   - to account
   - amount
   - date
   - reference
   - notes

4. ChequeLog
   - issued or received
   - account
   - source record
   - cheque no
   - cheque date
   - deposit date
   - clear date
   - bounce date
   - cancel date
   - status timeline

### Rules

- Every collection must post to one account.
- Every direct expense must post from one account.
- Every supplier/subcontractor payment must post from one account.
- A cheque should exist as an account-linked lifecycle object, not just a string field.
- The project finance dashboard should show project cash movement by account, but the true ledger should sit at account transaction level.

### Reports

- Cash Book
- Bank Book
- Mobile Wallet Book
- Cheque Register
- Account Transfer Log
- Project cash movement summary by account

## 6. Tax/Deduction Architecture

### Goal

Support optional deduction logic without forcing every tenant to use it.

### Proposed design

1. Bill-level gross amount remains the cost basis.
2. TaxDeduction records attach to supplier bill, subcontractor bill, or payment.
3. Deduction types:
   - VAT
   - AIT
   - TDS
   - retention-related deduction
   - other deduction
4. Fields:
   - deduction type
   - percent optional
   - amount
   - base amount
   - challan/reference
   - payable to government yes/no
   - settlement status

### Accounting treatment

- Gross bill amount remains project cost.
- Vendor net payable now = gross bill - retention hold - tax deductions - other deductions.
- Tax deduction may create a separate liability to government, not disappear from the system.
- If the tenant ignores tax, deduction rows are optional and absent.

### Reports

- Tax payable report
- deduction by vendor
- challan/reference register
- subcontractor deduction report

## 7. Service Charge Architecture

### Goal

Treat service charge as company income, not project cost.

### Configuration

- project default service charge percent
- phase override percent
- calculation basis:
  - approved direct cost only
  - supplier and subcontractor billed cost
  - total phase cost
  - manual amount

### Execution

1. System computes phase cost base.
2. Service charge rule computes service charge amount.
3. ServiceChargeEntry stores:
   - project
   - phase optional
   - basis type
   - base amount
   - percent or manual amount
   - computed amount
   - included in buyer demand yes/no
   - posted status

### Accounting treatment

- If included in buyer demand, it increases buyer receivable.
- It should show as company income in reporting.
- It should not inflate project cost.

### Reports

- Service charge income report by project and phase
- inclusion in buyer demand summary
- profitability summary

## 8. Phase Finance Architecture

Each phase should produce a balanced finance snapshot:

- demand issued
- collection allocated
- buyer due
- buyer advance related to the phase
- direct expense
- supplier bills
- subcontractor bills
- service charge
- retention held
- tax deducted
- supplier payable
- subcontractor payable
- supplier paid
- subcontractor paid
- surplus or deficit
- carry-forward in
- carry-forward out
- audit status

### Recommended formula layers

1. Receivable Layer
   - phase demand
   - allocated collection
   - phase due

2. Cost Layer
   - approved direct expense
   - approved supplier bill gross
   - approved subcontractor bill gross

3. Obligation Layer
   - supplier payable current
   - subcontractor payable current
   - retention payable later
   - tax payable

4. Income Layer
   - service charge earned

5. Balance Layer
   - operational phase balance:
     allocated collection - recognized phase cost - service charge if buyer-funded separation is needed
   - liquidity phase balance:
     cash received for phase - cash paid for phase
   - obligation-aware phase balance:
     collection - recognized cost - open payables - retained payables - tax payable

The UI should be explicit about which balance is being shown.

## 9. Project Finance Dashboard

### Summary cards

Buyer side:

- buyer demand
- buyer collection
- buyer due
- buyer advance

Expense side:

- direct expense
- pending direct expense
- missing vouchers

Supplier side:

- supplier bill total
- supplier paid
- supplier payable

Subcontractor side:

- subcontractor bill total
- subcontractor paid
- subcontractor payable

Control side:

- retention held
- tax deducted/payable
- service charge earned
- pending approvals
- audit locked phases

Cash side:

- cash on hand
- bank balance
- mobile banking balance
- uncleared cheque amount

Project result:

- project cost total
- project collection total
- gross surplus/deficit
- obligation-aware surplus/deficit

### Important rule

The dashboard must present cost, payable, and cash separately. One single number called "project balance" is not enough.

## 10. Reports Needed

### Project Cost Report

- Data source: direct expenses, supplier bills, subcontractor bills, service charge entries optional
- Filters: project, phase, date range, category, approval status
- Columns: source type, vendor, description, gross amount, deductions, net payable, status
- Totals: direct cost, supplier cost, subcontractor cost, total project cost
- PDF/Excel: grouped by phase and by source type

### Cash/Bank Book

- Data source: cash/bank transactions
- Filters: account, project, date range, transaction type
- Columns: date, account, source, inflow, outflow, running balance, reference
- Totals: opening, inflow, outflow, closing
- PDF/Excel: required

### Buyer Receivable Report

- Data source: demands, allocations, collections
- Filters: project, phase, buyer, status, date range
- Columns: buyer, units, demanded, allocated paid, due, advance, oldest due
- Totals: demanded, paid, due, advance
- PDF/Excel: required

### Supplier Ledger

- Data source: project supplier assignment, supplier bills, payments, deductions, documents
- Filters: project, supplier, phase, status, date range
- Columns: bill no, bill date, gross, deductions, retention if any, paid, due, voucher status
- Totals: billed, paid, due
- PDF/Excel: required

### Subcontractor Ledger

- Data source: project subcontractor contract, subcontractor bills, payments, retention, deductions
- Filters: project, subcontractor, work type, phase, status, date range
- Columns: contract amount, extra work, bill no, gross, retention, tax, net payable, paid, due, measurement status
- Totals: contracted, billed, retained, paid, due
- PDF/Excel: required

### Retention Report

- Data source: retention entries
- Filters: project, vendor, subcontractor, phase, release status
- Columns: source bill, retained amount, released amount, balance, release date, status
- Totals: held, released, outstanding
- PDF/Excel: required

### Tax/VAT/AIT Report

- Data source: tax deduction entries
- Filters: project, deduction type, vendor, date range, settlement status
- Columns: source bill, gross base, percent, deduction amount, challan reference, settlement status
- Totals: by tax type and overall
- PDF/Excel: required

### Service Charge Income Report

- Data source: service charge entries, buyer demand linkage
- Filters: project, phase, date range, posted status
- Columns: base amount, percent, service amount, included in demand yes/no
- Totals: service charge earned
- PDF/Excel: required

### Phase Finance Report

- Data source: phase summary ledger
- Filters: project, phase range, include draft/pending yes/no
- Columns: demand, collection, due, direct expense, supplier bill, subcontractor bill, service charge, retention, payable, paid, carry-forward
- Totals: project phase totals
- PDF/Excel: required

### Complete Project Report

- Data source: all finance summaries and key ledgers
- Filters: project, date range, include reversed yes/no, include pending yes/no
- Columns: section-specific
- Totals: project summary, cost, due, payable, retention, tax, income
- PDF/Excel: required

### Final Reconciliation Report

- Data source: final reconciliation model plus open due/advance snapshots
- Filters: project, buyer, unit, issue status
- Columns: final cost share, previous demand, previous payment, adjustment, final due or refund
- Totals: project-wide reconciliation
- PDF/Excel: required

## 11. Schema Gap Analysis

### Already supported by current schema

- `Demand` for buyer receivable creation
- `Collection` and `CollectionAllocation` for buyer payment and allocation
- `Expense` for direct expense
- `Supplier` for company-level supplier and subcontractor identity
- `SupplierPayable` for supplier and subcontractor bills
- `SupplierBillItem` for quantity, rate, amount line items
- `SupplierPayment` for vendor payment records
- `Document` for bill, expense, phase, project, buyer, and unit attachments
- `Phase.serviceChargePct` and `Project.defaultServiceChargePct` as basic service charge settings
- reversal fields on collection, expense, supplier payable, supplier payment
- `AuditLog` and `Approval` foundation

### Can be improved without schema change

- clearer report logic separating cost, payable, and cash views
- stricter finance dashboard language and formulas
- subcontractor UX using existing `Supplier` plus `SupplierPayable`
- richer supplier and subcontractor ledgers from current tables
- service charge calculations as derived view for early reporting

### Needs migration for clean long-term architecture

- `ProjectSupplier`
- `ProjectSubcontractor`
- `CashBankAccount`
- `CashBankTransaction`
- `TaxDeduction`
- `RetentionEntry`
- `ServiceChargeEntry`
- `AccountTransfer`
- `ChequeLog`
- `FinalReconciliation`

### Potential model intentions

#### ProjectSupplier

- purpose: project-specific supplier assignment and terms
- fields: supplierId, projectId, materialCategory, assignedPhases, rateSheetDocId, agreementDocId, creditDays, paymentTerms, openingBalance, isActive, notes

#### ProjectSubcontractor

- purpose: project-specific subcontractor contract
- fields: supplierId or subcontractorId, projectId, workType, assignedPhases, contractAmount, extraWorkAmount, retentionRule, taxRule, agreementDocId, startDate, endDate, paymentTerms, isActive, notes

#### CashBankAccount

- purpose: company account master
- fields: companyId, name, type, providerOrBank, accountNo, openingBalance, isActive

#### CashBankTransaction

- purpose: unified cash and bank movement ledger
- fields: accountId, projectId optional, phaseId optional, sourceType, sourceId, direction, amount, date, reference, notes

#### TaxDeduction

- purpose: optional bill or payment deduction tracking
- fields: sourceType, sourceId, deductionType, baseAmount, rate, amount, challanReference, settlementStatus

#### RetentionEntry

- purpose: hold and release tracking
- fields: sourceBillId, contractId, retainedAmount, releasedAmount, balanceAmount, releaseDate, status

#### ServiceChargeEntry

- purpose: computed or manual service charge income
- fields: projectId, phaseId optional, basisType, baseAmount, rate, amount, includedInDemand, postedAt

#### AccountTransfer

- purpose: movement between internal accounts
- fields: fromAccountId, toAccountId, amount, date, reference, notes

#### ChequeLog

- purpose: cheque lifecycle registry
- fields: accountId, sourceType, sourceId, chequeNo, issueDate, depositDate, clearDate, bounceDate, cancelDate, status

#### FinalReconciliation

- purpose: final buyer-level project settlement
- fields: projectId, buyerId, unitId optional, costShareAmount, demandBefore, paidBefore, finalAdjustment, finalDue, finalAdvance, status

## 12. UI/UX Flow

### Add direct expense

- user opens project expense or bulk expense
- selects phase and account
- enters immediate payment details
- optional local shop or supplier reference
- upload voucher
- submit as draft or pending approval

### Add supplier to project

- user can create or select from company supplier master
- system creates `ProjectSupplier` assignment in future
- optional upload rate sheet and agreement
- then user lands in supplier bill or vendor summary

### Add supplier bill

- select project supplier assignment
- select phase
- enter bill number, date, line items, deductions, due date
- optional immediate payment
- optional invoice upload
- system posts cost and supplier payable

### Pay supplier

- user opens supplier payable
- selects paying account and method
- enters cheque or bank reference if needed
- system reduces payable and posts cash/bank movement

### Add subcontractor to project

- create or select from company subcontractor master
- define work type, contract amount, terms, retention rule, tax rule
- upload agreement

### Add subcontractor bill

- select project subcontractor contract
- select phase
- enter running bill or final bill
- attach measurement sheet and invoice
- system computes gross, deductions, retention, net payable

### Pay subcontractor

- select payable or retention release
- choose account and method
- system reduces payable and posts cash/bank movement

### Record buyer collection

- select buyer and account
- capture receipt, method, cheque/reference
- then allocate automatically or manually to demands

### Allocate collection

- default oldest due first
- allow manual override
- show advance if payment exceeds open receivable

### Record tax deduction

- either as part of bill entry or payment entry
- visible in net payable summary
- later settled through tax payable flow

### Record retention

- auto-computed from contract rule or manual per bill
- clearly shown as held amount, not lost amount

### Release retention

- open retention register
- choose retained balance
- pay through account transaction

### View project finance

- show receivable, cost, payable, cash, retention, tax, service charge separately

### View cash/bank book

- choose account
- see transaction list and running balance

### Generate reports

- user picks report and filters
- output should use finance-ledger sources, not ad hoc totals

## 13. Audit and Approval Rules

### Statuses

- draft
- submitted
- approved
- rejected
- reversed
- adjusted
- audit locked

### Rules

- draft can be edited or deleted by creator or permitted role
- submitted can be approved or rejected
- approved cannot be silently edited
- approved corrections require reversal or adjustment with reason
- reversed records remain visible in ledger and audit
- adjusted records link back to original
- audit locked phase blocks new finance changes unless override role and reason exist

### Role direction

- engineer or site supervisor: create direct expenses and uploads, not approve final finance
- accounts: create, review, pay, allocate, export
- management or company admin: approve, reverse, adjust, unlock with reason
- auditor: view, export, audit lock oversight

### Audit log requirements

- supplier assignment create/update
- subcontractor contract create/update
- bill create/update/reverse
- payment create/reverse
- collection create/allocate/reverse
- direct expense create/approve/reverse
- retention hold/release
- tax deduction create/settle
- service charge posting
- account transfer

Reason required for:

- reversal
- adjustment
- audit unlock override
- rejection

## 14. Implementation Roadmap

### Phase 1

- Build `ProjectSupplier` and `ProjectSubcontractor`
- Add project-specific contract and rate sheet uploads
- Clean up supplier/subcontractor project ledgers to use assignment rows
- Do not build cash/bank book yet
- Do not build tax engine yet
- Acceptance criteria:
  - supplier and subcontractor project relationship becomes formal
  - project-ledger and contract documents are project-specific
  - existing bill and payment flows still work
- Migration risk: low to medium
- Testing:
  - create assignment
  - attach docs
  - create bill from assignment
  - ensure reports and vendor screens remain project-scoped

### Phase 2

- Build cash/bank accounts, transactions, account transfer, cheque lifecycle
- Do not build final reconciliation
- Acceptance criteria:
  - every payment and collection posts to an account
  - cash/bank book works
  - cheque states are trackable
- Migration risk: medium
- Testing:
  - payment and collection account posting
  - transfer posting
  - cheque issue, clear, bounce

### Phase 3

- Build tax deduction and retention architecture
- Do not build service charge posting yet
- Acceptance criteria:
  - bill can hold retention and tax deductions
  - net payable and tax payable are visible
  - retention report works
- Migration risk: medium
- Testing:
  - bill with retention and VAT/TDS
  - payment and later retention release

### Phase 4

- Build service charge entries and phase finance truth tables
- Do not build final reconciliation yet
- Acceptance criteria:
  - service charge can be computed and reported
  - phase finance shows cost, payable, retention, tax, and service charge clearly
- Migration risk: medium
- Testing:
  - phase override
  - included or excluded from buyer demand

### Phase 5

- Build report completion and export sources from proper ledgers
- Do not build inventory yet
- Acceptance criteria:
  - project cost report
  - cash/bank book
  - supplier and subcontractor ledgers
  - retention and tax reports
- Migration risk: low
- Testing:
  - PDF/Excel output accuracy
  - totals match dashboard and ledgers

### Phase 6

- Build final reconciliation
- Do not build SaaS billing or buyer portal
- Acceptance criteria:
  - final project settlement per buyer/unit/share
  - final due or refund report
- Migration risk: medium to high
- Testing:
  - multiple unit ownership
  - advance carry-forward
  - final adjustment generation

## 15. Immediate Next Build Prompt

Use this as the next coding prompt for Phase 1 only:

> Act as a senior construction ERP finance engineer and Next.js plus Prisma architect.  
> Work on `feat/erp-v1`.  
> Do not build cash or bank accounts, tax engine, retention release, service charge posting, final reconciliation, SaaS billing, buyer portal, SMS, mobile, or AI.  
> Implement Phase 1 from `REAL_WORLD_FINANCE_ARCHITECTURE.md` only:
> 1. Add `ProjectSupplier` and `ProjectSubcontractor` models with one clean migration.
> 2. Create project supplier assignment pages and project subcontractor contract pages.
> 3. Support project-specific agreement, rate sheet, and contract uploads using the existing document system.
> 4. Update supplier and subcontractor vendor screens, bill forms, and ledgers to use project assignment rows instead of inferring project relationship only from bills.
> 5. Preserve current bill, payment, and report behavior while making the project contract layer formal.
> 6. Update docs, run `npx prisma generate`, `npm run build`, and `npm run db:seed`, then stop.

# Accounting Hardening Plan

Branch: `feat/erp-v1`

## Scope

This pass hardens the existing project-first accounting foundation without adding SaaS billing, buyer portal, SMS, mobile app, AI, or decorative UI work.

## 1. Demand to Collection Allocation

- Current status: FIFO allocation exists by splitting one receipt into multiple collection rows.
- What works: buyer/project collections save, demand statuses update, overpayment is recorded as an unallocated collection.
- Audit risk: allocation is inferable from `collections.demandId`, but not stored as a formal allocation ledger.
- Schema support: added `CollectionAllocation` to preserve collection-to-demand allocation rows.
- Required fixes: create allocation rows transactionally, calculate paid/due from allocation rows with fallback to legacy collection rows, exclude reversed collections.
- Priority: P0.

## 2. Reversal and Adjustment

- Current status: approved records can be changed by future routes unless guarded.
- What works: audit logs exist and are best-effort.
- Audit risk: no explicit reversal metadata.
- Schema support: added reversal fields to collections, expenses, supplier bills, and supplier payments.
- Required fixes: add reversal endpoints for collections and expenses first; document supplier/subcontractor reversal UI as next step.
- Priority: P0 for collections/expenses, P1 for supplier/subcontractor UI.

## 3. Expense Accounting

- Current status: single and bulk expenses save with status, supplier mode, local shop fields, and optional vouchers.
- What works: transactional bulk expense row creation; voucher creation follows main save.
- Audit risk: reports previously summed all expenses without status or reversal filters.
- Schema support: existing status plus new reversal metadata.
- Required fixes: approved/paid/partially-paid expenses affect final finance totals; pending and missing-voucher counts remain visible.
- Priority: P0.

## 4. Supplier Bills and Payments

- Current status: supplier bills support line items and payments reduce payable.
- What works: project/phase-scoped payable, paid/due status update, supplier/subcontractor split by supplier type.
- Audit risk: line total could silently override header total; cheque state was not captured.
- Schema support: supplier payment status and cheque status fields added.
- Required fixes: enforce bill line total equals header total, validate phase lock, capture cheque state.
- Priority: P0.

## 5. Subcontractor Accounting

- Current status: subcontractors are represented as `Supplier` with `LABOUR_CONTRACTOR`, separated in UX/reporting.
- What works: bills/payments can be filtered as subcontractor payables.
- Audit risk: dedicated subcontractor accounting tables do not exist yet.
- Schema support: short-term support through supplier/payable tables.
- Required fixes: keep financial summaries separated; document dedicated subcontractor ledger tables as future.
- Priority: P1.

## 6. Phase Surplus, Deficit, and Carry Forward

- Current status: phase pages show income/expense balance.
- What works: project phases already carry sequence/order.
- Audit risk: no carry-forward calculation or audit-lock metadata.
- Schema support: phase audit lock fields added; carry-forward remains computed.
- Required fixes: compute phase-wise balance/carry-forward in finance helper and display in finance hub.
- Priority: P0.

## 7. Finance Hub

- Current status: project finance hub shows core totals and links.
- What works: project-scoped money area exists.
- Audit risk: totals did not separate approved/pending expenses or buyer advance.
- Schema support: sufficient after allocation/reversal migration.
- Required fixes: show total demanded, collected, buyer receivable, buyer advance, approved expense, pending expense, payables, phase balance.
- Priority: P0.

## 8. Buyer Project Ledger

- Current status: buyer detail page shows demands, collections, units, and documents.
- What works: ledger is project-scoped.
- Audit risk: paid amount came from collection rows only, not a formal allocation table.
- Schema support: added collection allocation rows.
- Required fixes: show allocated payments and unallocated advance; avoid global balances.
- Priority: P0.

## 9. Accounting Reports

- Current status: Top Sheet and report shells exist with tenant branding.
- What works: Relax Tower Top Sheet matches seed totals.
- Audit risk: reports need status/reversal filters and export remains mostly disabled.
- Schema support: enough for status-aware reporting.
- Required fixes: update Top Sheet to exclude reversed/cancelled records while preserving seed totals.
- Priority: P0.

## 10. Audit Lock

- Current status: no lock field.
- What works: phase/project scoping is enforced.
- Audit risk: locked phases cannot be protected.
- Schema support: phase audit lock fields added.
- Required fixes: block phase-scoped writes when `auditLockedAt` is set; add lock API foundation.
- Priority: P0.

## 11. Approval Workflow

- Current status: expenses have statuses; auto-approval depends on role.
- What works: field staff entries become pending.
- Audit risk: complete approval UI is not universal.
- Schema support: current statuses plus reversal fields.
- Required fixes: keep final reports to approved/paid/partially-paid financial records; document broader approvals as next step.
- Priority: P1.

## 12. Validation and Precision

- Current status: most forms validate required fields and positive amounts.
- What works: zod validation exists in key APIs.
- Audit risk: phase/project membership, over-allocation, cheque state, and line totals need stronger checks.
- Schema support: sufficient.
- Required fixes: validate phase belongs to project, locked phases, line totals, collection allocations, positive amounts, and safe dates.
- Priority: P0.

## 13. Documents and Vouchers

- Current status: documents can link to expense/supplier bill/project/buyer/unit/phase.
- What works: voucher upload for bulk expense; missing voucher count exists.
- Audit risk: receipt/proof links for collection and demand notices remain future.
- Schema support: no collection/demand document links yet.
- Required fixes: keep missing-voucher tracking for accounting documents and document collection/demand proof gap.
- Priority: P1.

## 14. UX for Accounting

- Current status: finance pages are usable and project-first.
- What works: finance hub, reports, buyer ledger, expense/payable pages.
- Audit risk: users need clearer audit-safe labels.
- Required fixes: add phase-balance table and explicit pending/advance labels; avoid debit/credit language for normal users.
- Priority: P1.

## Implementation Order

1. Add allocation/reversal/audit-lock schema and one clean migration.
2. Harden collection create/allocation and demand paid/due calculations.
3. Add collection and expense reversal API foundations.
4. Harden expense/supplier/payable validation and lock checks.
5. Update finance helper, finance hub, buyer ledger, and Top Sheet filters.
6. Update documentation and run generate, build, seed, migrate reset, seed.

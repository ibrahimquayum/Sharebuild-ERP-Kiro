# Project Vendor Contract Phase 1

**Date:** 2026-05-22  
**Branch:** `feat/erp-v1`

## Scope

This phase formalizes project-scoped supplier and subcontractor assignments without building cash/bank accounts, VAT/AIT/TDS, retention, or final reconciliation yet.

## What The Previous Schema Already Supported

- Company-level `Supplier` master records.
- Project-scoped `SupplierPayable` bills.
- `SupplierBillItem` line items.
- `SupplierPayment` payment ledger rows.
- `Document` links to project, phase, expense, and payable.
- Project finance summary and report foundations.
- Best-effort audit logging and permission helpers.

## What Was Missing Before This Phase

- No formal project supplier contract/assignment layer.
- No formal project subcontractor contract/assignment layer.
- No place to store project-specific terms, opening balance, contract dates, contract amount, or extra work outside bill notes.
- No way to attach contract/rate-sheet/agreement files to a project vendor assignment directly.
- Project vendors were inferred from bills instead of being first-class project records.
- Bills were not linked back to a project assignment record.

## Schema Changes Required

Added in one clean migration:

- `ProjectVendorStatus` enum
- `ProjectSupplier`
- `ProjectSubcontractor`
- `SupplierPayable.projectSupplierId`
- `SupplierPayable.projectSubcontractorId`
- `Document.projectSupplierId`
- `Document.projectSubcontractorId`

Backfill included:

- Existing supplier payables create project supplier assignments.
- Existing subcontractor payables create project subcontractor assignments.
- Existing payables are linked to the new assignment layer.

## Accounting Rules Used

- Supplier bill = project cost + supplier payable.
- Supplier payment = payable reduction only, not a second project expense.
- Subcontractor bill = project cost + subcontractor payable.
- Subcontractor payment = payable reduction only, not a second project expense.
- Direct expense remains separate from vendor bills.
- Project cost = direct expense + supplier bills + subcontractor bills - reversed/cancelled records.

## Routes, Pages, And APIs Added Or Updated

### Project supplier assignment

- `/projects/[id]/suppliers`
- `/projects/[id]/suppliers/new`
- `/projects/[id]/suppliers/[projectSupplierId]`
- `/projects/[id]/suppliers/[projectSupplierId]/edit`
- `GET/POST /api/projects/[id]/suppliers`
- `GET/PATCH /api/projects/[id]/suppliers/[projectSupplierId]`

### Project subcontractor assignment

- `/projects/[id]/subcontractors`
- `/projects/[id]/subcontractors/new`
- `/projects/[id]/subcontractors/[projectSubcontractorId]`
- `/projects/[id]/subcontractors/[projectSubcontractorId]/edit`
- `GET/POST /api/projects/[id]/subcontractors`
- `GET/PATCH /api/projects/[id]/subcontractors/[projectSubcontractorId]`

### Bill linkage and documents

- `/projects/[id]/vendors`
- `/projects/[id]/payables/new`
- `/projects/[id]/subcontractors/bills/new`
- `/projects/[id]/reports/supplier-ledger`
- `/projects/[id]/reports/subcontractor-ledger`
- `/projects/[id]/documents/upload`
- `POST /api/suppliers/payables`
- `POST /api/documents`

## Project Supplier Behavior

- Select an existing company supplier or create a new company supplier in project flow.
- Save project-specific terms:
  - material category
  - payment terms
  - credit days
  - opening balance
  - contract number/date
  - start/end date
  - notes
- Upload:
  - contract/agreement
  - rate sheet
  - quotation
- Bills can link directly to the project supplier assignment.

## Project Subcontractor Behavior

- Select an existing company subcontractor/service provider or create a new one in project flow.
- Save project-specific contract fields:
  - work type
  - assigned phase
  - contract amount
  - extra work amount
  - payment terms
  - contract number/date
  - start date
  - deadline
  - notes
- Upload:
  - contract/agreement
  - measurement basis
  - work schedule/deadline paper
- Bills can link directly to the project subcontractor assignment.

## Ledger Cleanup Applied

- Supplier ledger is now grouped by `ProjectSupplier`.
- Subcontractor ledger is now grouped by `ProjectSubcontractor`.
- Finance summary separates:
  - direct expense
  - supplier bill cost
  - subcontractor bill cost
  - supplier payable
  - subcontractor payable
- Payments no longer inflate project cost.

## Known Gaps After Phase 1

- No cash/bank account master yet.
- No cheque lifecycle ledger yet.
- No VAT/AIT/TDS fields yet.
- No retention/security workflow yet.
- No final reconciliation yet.
- Subcontractor progress certification is still represented through `SupplierPayable`.
- Contract document upload works, but verification workflow is still basic.

## Testing Plan

1. `npx prisma generate`
2. `npm run build`
3. `npm run db:seed`
4. `npx prisma migrate reset --force --skip-seed`
5. `npm run db:seed`

Manual checks:

- Create project supplier assignment from project.
- Create project subcontractor assignment from project.
- Upload supplier contract/rate-sheet files.
- Upload subcontractor agreement/measurement files.
- Create supplier bill linked to project supplier.
- Create subcontractor bill linked to project subcontractor.
- Confirm finance hub shows assignment counts and project cost split.
- Confirm supplier ledger and subcontractor ledger open and show assignment-aware totals.

## Next Phase

Next safest phase: **Cash/Bank account architecture and cheque lifecycle**.

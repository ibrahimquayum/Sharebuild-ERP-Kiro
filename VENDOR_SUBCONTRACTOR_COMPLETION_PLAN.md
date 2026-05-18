# Vendor and Subcontractor Completion Plan

Date: 2026-05-18  
Branch: `feat/erp-v1`

## Current Supplier Status

- Company supplier master exists through `Supplier`.
- Project supplier bills exist through `SupplierPayable`.
- Supplier bill lines exist through `SupplierBillItem`.
- Supplier payments exist through `SupplierPayment`.
- Supplier documents can link through `Document.payableId`.
- Project supplier bills are now filtered away from labour contractors and service providers.

## Current Subcontractor Status

- Subcontractors are represented by `Supplier` rows with `LABOUR_CONTRACTOR` or `SERVICE_PROVIDER`.
- Project subcontractor bills use `SupplierPayable` internally.
- The UI now has separated subcontractor bill list/create/detail paths, but still shares the payable detail route internally.
- Dedicated subcontractor accounting tables are not present yet.

## Missing Create/Edit/Detail Pages

- Missing before this pass:
  - project-scoped supplier create flow at `/projects/[id]/suppliers/new`
  - project-scoped subcontractor create flow at `/projects/[id]/subcontractors/new`
  - subcontractor bill detail alias at `/projects/[id]/subcontractors/bills/[billId]`
- Existing:
  - company supplier create/edit/detail
  - supplier bill detail/reverse
  - subcontractor bill list/create through shared payable detail

## Missing Uploads

- Supplier bill documents can be attached after saving, but the bill form needs invoice/voucher upload during create.
- Subcontractor bill form needs measurement sheet, agreement, and invoice/voucher upload during create.
- Existing document schema supports this through `Document.payableId`, so no schema change is required.

## Missing Invoice Fields

- Supplier bill has bill/invoice number and line items.
- Subcontractor bill has bill/invoice number and work type stored in notes/line item description.
- Bulk expense now exposes bill/voucher number in the row UI.
- Payment method for initial paid amount needs to be recorded through an initial `SupplierPayment` row during bill create.

## Missing Project Supplier Relationship

- There is no separate project-vendor assignment table.
- A supplier is considered used in a project when a project-scoped payable/expense exists for that supplier.
- Project-local create flows can create/reuse the company master supplier and redirect directly into the project bill flow.

## Missing Project Subcontractor Relationship

- There is no separate project-subcontractor assignment table.
- A subcontractor is considered used in a project when a project-scoped subcontractor payable exists.
- Project-local create flow will create/reuse the company master record and redirect into subcontractor bill creation.

## Schema Gaps

- Dedicated project vendor assignment table: future.
- Dedicated subcontractor bill/contract tables: future.
- Same-form document upload can be implemented with current document schema.
- Dynamic permission editing remains code-level for now.

## Exact Implementation Plan

1. Add project supplier create page and reusable project vendor create form.
2. Add project subcontractor create page using the same component but subcontractor labels and supplier types.
3. Improve `/projects/[id]/vendors` with clear add supplier/add subcontractor actions and ledger/bill links.
4. Let supplier bill form link to/add newly created suppliers and upload invoice/voucher during create.
5. Let subcontractor bill form link to/add newly created subcontractors and upload measurement/agreement/invoice files during create.
6. Update payable creation API to create an initial payment row when a paid amount is entered with payment metadata.
7. Add a subcontractor bill detail route alias that reuses the payable detail behavior through redirect.
8. Update finance hub quick links with add supplier/add subcontractor actions.
9. Update documentation and manual checklist.
10. Run Prisma generate, build, and seed before commit/push.

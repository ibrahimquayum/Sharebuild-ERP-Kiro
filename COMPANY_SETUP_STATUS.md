# Company Setup Status

**Branch:** `feat/erp-v1`

## Completed

| Area | Route | Backend |
|------|-------|---------|
| Company settings | `/company/settings` | `PUT /api/company/settings`, `Company`, `CompanySetting`, audit log |
| Contacts / Buyers master | `/company/contacts`, `/company/contacts/[id]` | Existing `Buyer` model and `/api/buyers` |
| Suppliers master | `/company/suppliers`, `/company/suppliers/[id]`, `/company/suppliers/[id]/edit` | `Supplier`, `/api/suppliers`, `PUT /api/suppliers/[id]` |
| Subcontractors master | `/company/subcontractors` | Uses `Supplier` with labour/service supplier types |
| Users / Staff | `/company/users` | `POST /api/company/users`, `User`, optional `ProjectStaffAssignment` |
| Company reports | `/company/reports` | Links existing report routes |
| Audit | `/company/audit` | Reads `AuditLog` |
| Project setup | `/projects/new`, `/projects/[id]/settings`, `/projects/[id]/edit` | `POST /api/projects`, `PUT /api/projects/[id]` |

## Schema Changes

Yes. One migration was added:

```text
prisma/migrations/0002_project_setup_fields/migration.sql
```

It adds project setup fields to `Project`: land size, residential floors, units per floor, total planned units, parking/common utility note, default service charge percentage, and notes.

## Read-Only Setup References

These routes exist and intentionally do not fake persistence because the schema does not yet have editable master tables:

- `/company/materials`
- `/company/categories`
- `/company/payment-methods`

Current support:
- Expense categories and payment methods are Prisma enums.
- Materials exist as project material purchase line items, not a company material master.

## Remaining Gaps

- Add first-class editable master tables for materials, material categories, work categories, and payment methods when the product needs admin-managed setup.
- Add edit forms for contacts/users if needed; create/list/detail basics are in place.
- Expand supplier/subcontractor work type beyond the current `SupplierType` enum if finer categories are required.

## Recommended Next Step

Build project unit setup and project-buyer assignment flows, because those sit directly after project setup and before demand/collection accuracy.

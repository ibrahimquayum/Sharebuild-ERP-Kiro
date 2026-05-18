# Company Setup Status

**Branch:** `feat/erp-v1`

## Implemented

| Area | Route | Persistence |
| --- | --- | --- |
| Company profile and branding | `/company/settings` | `Company`, `CompanySetting`, audit log |
| Company logo upload | `/company/settings` | Local file under `public/uploads/[companyId]/branding`, `Company.logoUrl` |
| Report footer note | `/company/settings` | `CompanySetting.reportFooterNote` |
| Contacts / Buyers master | `/company/contacts`, `/company/contacts/[id]`, `/company/contacts/new` | `Buyer` |
| Suppliers master | `/company/suppliers`, `/company/suppliers/[id]`, `/company/suppliers/[id]/edit`, `/company/suppliers/new` | `Supplier` |
| Subcontractors master | `/company/subcontractors` | `Supplier` records with labour/service type |
| Users and roles | `/company/users` | `User`, optional `ProjectStaffAssignment` |
| Company reports | `/company/reports` | Links report areas |
| Audit | `/company/audit` | `AuditLog` |

## Setup References / Schema Gaps

These pages intentionally do not fake editable persistence:

- `/company/materials`
- `/company/categories`
- `/company/payment-methods`

Current schema support:

- Expense categories are Prisma enum values.
- Payment methods are Prisma enum values.
- Materials exist as project material purchase items, not company-level material masters.

## Project Foundation Connected To Company Setup

- Project creation and settings save under the current company.
- Project units, buyers, documents, demands, finance, reports, and audit are project-scoped.
- Tenant/company branding is used by project report headers.
- Sharebuild remains the platform shell identity.

## Schema Changes

Yes:

- `0002_project_setup_fields` added project setup fields.
- `0003_product_foundation` added roles, document metadata/scope/status, unit ownership payer metadata, and document relations.

## Remaining Gaps

- Editable material master table.
- Editable category master tables.
- Editable payment-method settings table.
- Dynamic database-backed role/permission editor.
- Cloud object storage for company logos and documents. Current upload storage is local disk.
- Local shop/person metadata is supported on project expenses, but local shops are not company-level supplier masters unless entered as suppliers.

## Recommended Next Step

Finish export-grade report endpoints and payment allocation/reversal logic before building portals or advanced accounting.

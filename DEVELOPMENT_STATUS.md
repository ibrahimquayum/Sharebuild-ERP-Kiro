# Development Status - Sharebuild ERP

**Last updated:** May 18, 2026
**Branch:** `feat/erp-v1`

## Current State

Sharebuild ERP now has a buildable project-first foundation. Sharebuild remains the platform brand, while tenant company branding is loaded from Company Settings for report/print surfaces.

This pass added the required `PRODUCT_MODULE_AUDIT.md` and tightened the foundation without changing schema or seed totals.

## Verified

| Check | Status | Notes |
| --- | --- | --- |
| Prisma Client | Pass | `npx prisma generate` |
| Production build | Pass | `npm run build` |
| Migration reset | Pass | `npx prisma migrate reset --force --skip-seed` |
| Seed | Pass | `npm run db:seed` |
| Project create/edit save | Pass | Authenticated API create returned 201 and update returned 200 |
| Top Sheet totals | Pass | Income 100,143,800 / Expense 104,659,890.40 / Balance -4,516,090.40 |
| Product foundation build | Pass | `npm run build` after save-flow and bulk/document fixes |

## Implemented In This Pass

- Clean global sidebar: Dashboard, Projects, Company Setup, Reports, Audit.
- Project workspace sidebar reorganized into Overview, Setup, Finance, Work, Documents, Reports, Audit, Settings.
- Project units foundation:
  - `/projects/[id]/units`
  - `/projects/[id]/units/new`
  - `/projects/[id]/units/[unitId]`
  - `POST /api/projects/[id]/units`
  - `PUT /api/projects/[id]/units/[unitId]`
  - `POST /api/projects/[id]/units/bulk`
  - Bulk generation from floor/unit plan using existing `Unit` persistence.
- Buyer ownership foundation:
  - Project-scoped Buyers & Ownership page.
  - Unit ownership share.
  - Co-owner support through multiple `UnitBuyer` rows.
  - Payer flag for payer-vs-owner foundation.
  - Project buyer detail/ledger route.
  - Ownership share validation now prevents a unit from exceeding 100% owner share.
- Document foundation:
  - Project document library.
  - Project document upload route.
  - Document scope/category/title/sort/status metadata.
  - Project, buyer, unit, phase, expense, and bill document relations.
  - Multi-file upload now saves every selected PDF/image/document with sort order.
- Finance foundation:
  - `/projects/[id]/finance`
  - Project-scoped finance summary and links to daily money pages.
- Demand foundation:
  - `/projects/[id]/demands/new`
  - `POST /api/projects/[id]/demands`
  - Equal amount demand generation for selected buyer/unit ownership rows.
- Reports foundation:
  - Branded report header.
  - Print action.
  - Disabled PDF/Excel buttons until real export endpoints exist.
  - Report entry routes for Top Sheet, buyer statement, unit statement, phase summary, collection report, expense report, supplier ledger, subcontractor ledger, due report, and audit report.
- Permission foundation:
  - Central permission config in `src/lib/permissions.ts`.
  - Practical guards added to new project/unit/buyer/document/demand APIs.
- Project audit page now reads `AuditLog`.
- Company settings now includes report footer note.
- Company settings now supports local logo upload, preview, remove, registration/trade license, and TIN/VAT fields using existing company columns.
- Audit logging is best-effort on common save flows, so an audit failure no longer falsely marks the main save as failed.

## Schema Changes

No new schema change was added in the May 18 stabilization pass.

Existing schema changes remain:

```text
prisma/migrations/0002_project_setup_fields/migration.sql
prisma/migrations/0003_product_foundation/migration.sql
```

It adds:

- Project setup fields and company branding fields used by the settings form.
- New user roles for the permission foundation.
- Additional unit type/status values.
- `DocumentScope` and `DocumentStatus`.
- Document metadata and relations for unit, phase, payable, and uploadedBy.
- `UnitBuyer.isPayer`, `UnitBuyer.relationship`, and `UnitBuyer.notes`.

## Still Incomplete / Placeholder

- PDF and Excel exports are not implemented yet; buttons are intentionally disabled.
- Most non-Top-Sheet report pages are branded print-ready foundations, not full report engines.
- Materials, categories, and payment methods are still documented schema gaps.
- Full dynamic permission editing UI/database tables are not built; permissions are code-configured.
- Subcontractor bill creation is still not fully separated from supplier payable internals.
- Payment allocation against demands is basic; deeper allocation/reversal logic is a future accounting step.
- File upload remains local disk under `public/uploads/[companyId]`.
- Local shop / one-time vendor purchasing is not modeled as a dedicated flow yet.

## Next Recommended Build Step

Implement real report export endpoints and finish demand/payment allocation logic before adding advanced accounting or external portals.

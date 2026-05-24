# Security / Dependency / API Guard Pass

**Date:** May 25, 2026  
**Branch:** `feat/erp-v1`

## Scope

This pass focused on the last pre-SaaS production hardening items that were still open after the legacy route/report polish work:

- safe dependency review and non-breaking upgrades
- exhaustive `src/app/api` nested guard conversion for the highest-risk surfaces
- project-only user security smoke coverage
- document/export scope enforcement review
- production hardening checklist for deployment readiness

## Dependency Audit Result

## Safe upgrades applied

- `next` `14.2.4` -> `14.2.35`
- `next-auth` `4.24.7` -> `4.24.14`
- `eslint-config-next` `14.2.4` -> `14.2.35`
- `package-lock.json` refreshed with `npm install`

## Packages reviewed

- `next`
- `next-auth`
- `postcss`
- `prisma` / `@prisma/client`
- `react` / `react-dom`
- `jszip`
- upload/export supporting packages already present in the app

## Current `npm audit` findings after safe upgrades

### Still open

- `next`
  - high-severity advisory chain remains
  - `npm audit` only offers a breaking jump to `next@16.2.6`
- `postcss`
  - advisory is transitively reported through `next`
  - same breaking `next@16.x` path would be required
- `next-auth` / `uuid`
  - advisory remains on the latest 4.x line currently in use here
  - `npm audit` only suggests a breaking change path and does not offer a safe 4.x fix
- `glob`
  - dev-tooling advisory via `eslint-config-next`
  - `npm audit` only offers a breaking jump to `eslint-config-next@16.2.6`

### Why these were not force-fixed

- This branch is a Next.js 14 production branch and should not take a framework-major jump as a side effect of a hardening pass.
- `npm audit fix --force` would move core runtime or tooling packages across breaking major versions without app-level migration work.
- The safe outcome for this pass is: upgrade within the current supported line, reduce obvious config exposure, document the remaining advisories, and leave the major-upgrade review as a planned next step.

## Dependency risk summary

- `next`: highest remaining dependency risk because advisories are on the framework/runtime itself.
- `next-auth`: moderate risk remains through `uuid`; mitigated in practice by controlled credentials flow and internal app use, but still needs upstream-safe resolution or replacement strategy later.
- `postcss`: currently tied to the framework upgrade path.
- `glob`: development-only tooling risk, not production runtime.
- `jszip`: reviewed and kept. No additional advisory surfaced in this pass.
- `prisma` / `react`: no new actionable audit finding in this pass.

## Hardening changes made

- [next.config.js](C:/Projects/Sharebuild-ERP/next.config.js)
  - disabled `X-Powered-By`
  - removed the earlier wildcard image remote pattern configuration so the app does not advertise a broad remote image surface

## Safe upgrade plan

1. Stay on `next@14.2.35` and `next-auth@4.24.14` for this branch freeze.
2. Keep `npm audit` documented instead of forcing a breaking upgrade.
3. Plan a separate framework review branch for:
   - Next.js 15/16 migration feasibility
   - NextAuth replacement or upgrade path review
   - full regression pass on auth, uploads, reports, and print/export pages
4. Re-run `npm audit` after each future framework/auth review step.

## Exhaustive API Guard Audit Result

## Result summary

High-risk APIs under `src/app/api` were audited and the remaining legacy/nested weak points were converted to the centralized access-control helpers or equivalent shared permission checks.

### Guard expectations now enforced

- authenticated user required
- company scope enforced
- project scope enforced where a project or phase is involved
- project assignment enforced for project-only users
- module/action permission enforced for reads and writes
- unauthorized reads return 403/401 JSON via shared helpers
- unauthorized writes return 403/401 JSON via shared helpers
- project-only users cannot mutate company-wide admin data

## APIs fixed in this pass

### Project nested CRUD

- [src/app/api/projects/[id]/units/route.ts](C:/Projects/Sharebuild-ERP/src/app/api/projects/[id]/units/route.ts)
- [src/app/api/projects/[id]/units/[unitId]/route.ts](C:/Projects/Sharebuild-ERP/src/app/api/projects/[id]/units/[unitId]/route.ts)
- [src/app/api/projects/[id]/units/bulk/route.ts](C:/Projects/Sharebuild-ERP/src/app/api/projects/[id]/units/bulk/route.ts)
- [src/app/api/projects/[id]/buyers/route.ts](C:/Projects/Sharebuild-ERP/src/app/api/projects/[id]/buyers/route.ts)
- [src/app/api/projects/[id]/suppliers/route.ts](C:/Projects/Sharebuild-ERP/src/app/api/projects/[id]/suppliers/route.ts)
- [src/app/api/projects/[id]/suppliers/[projectSupplierId]/route.ts](C:/Projects/Sharebuild-ERP/src/app/api/projects/[id]/suppliers/[projectSupplierId]/route.ts)
- [src/app/api/projects/[id]/subcontractors/route.ts](C:/Projects/Sharebuild-ERP/src/app/api/projects/[id]/subcontractors/route.ts)
- [src/app/api/projects/[id]/subcontractors/[projectSubcontractorId]/route.ts](C:/Projects/Sharebuild-ERP/src/app/api/projects/[id]/subcontractors/[projectSubcontractorId]/route.ts)
- [src/app/api/projects/[id]/expenses/bulk/route.ts](C:/Projects/Sharebuild-ERP/src/app/api/projects/[id]/expenses/bulk/route.ts)

### Report/export APIs

- [src/app/api/projects/[id]/reports/top-sheet/excel/route.ts](C:/Projects/Sharebuild-ERP/src/app/api/projects/[id]/reports/top-sheet/excel/route.ts)
- [src/app/api/projects/[id]/reports/cash-bank-book/excel/route.ts](C:/Projects/Sharebuild-ERP/src/app/api/projects/[id]/reports/cash-bank-book/excel/route.ts)
- [src/app/api/projects/[id]/reports/cheque-register/excel/route.ts](C:/Projects/Sharebuild-ERP/src/app/api/projects/[id]/reports/cheque-register/excel/route.ts)
- [src/app/api/projects/[id]/reports/expenses/excel/route.ts](C:/Projects/Sharebuild-ERP/src/app/api/projects/[id]/reports/expenses/excel/route.ts)
- [src/app/api/projects/[id]/reports/tax-deductions/excel/route.ts](C:/Projects/Sharebuild-ERP/src/app/api/projects/[id]/reports/tax-deductions/excel/route.ts)
- [src/app/api/projects/[id]/reports/retention/excel/route.ts](C:/Projects/Sharebuild-ERP/src/app/api/projects/[id]/reports/retention/excel/route.ts)
- [src/app/api/projects/[id]/reports/service-charge/excel/route.ts](C:/Projects/Sharebuild-ERP/src/app/api/projects/[id]/reports/service-charge/excel/route.ts)
- [src/app/api/projects/[id]/reports/final-reconciliation/excel/route.ts](C:/Projects/Sharebuild-ERP/src/app/api/projects/[id]/reports/final-reconciliation/excel/route.ts)
- [src/app/api/reports/top-sheet/route.ts](C:/Projects/Sharebuild-ERP/src/app/api/reports/top-sheet/route.ts)

### Company/global write and finance-sensitive APIs

- [src/app/api/company/settings/route.ts](C:/Projects/Sharebuild-ERP/src/app/api/company/settings/route.ts)
- [src/app/api/suppliers/[id]/route.ts](C:/Projects/Sharebuild-ERP/src/app/api/suppliers/[id]/route.ts)
- [src/app/api/collections/[id]/reverse/route.ts](C:/Projects/Sharebuild-ERP/src/app/api/collections/[id]/reverse/route.ts)
- [src/app/api/expenses/[id]/approve/route.ts](C:/Projects/Sharebuild-ERP/src/app/api/expenses/[id]/approve/route.ts)
- [src/app/api/expenses/[id]/reject/route.ts](C:/Projects/Sharebuild-ERP/src/app/api/expenses/[id]/reject/route.ts)
- [src/app/api/expenses/[id]/reverse/route.ts](C:/Projects/Sharebuild-ERP/src/app/api/expenses/[id]/reverse/route.ts)

### Buyer/document/payable nested scope fixes

- [src/app/api/buyers/[id]/route.ts](C:/Projects/Sharebuild-ERP/src/app/api/buyers/[id]/route.ts)
  - project-only users now only see buyer-linked nested data from assigned projects
- [src/app/api/documents/route.ts](C:/Projects/Sharebuild-ERP/src/app/api/documents/route.ts)
  - GET and POST now enforce company scope, project scope, linked-entity checks, and upload extension allowlists
- [src/app/api/suppliers/payables/route.ts](C:/Projects/Sharebuild-ERP/src/app/api/suppliers/payables/route.ts)
- [src/app/api/suppliers/payables/[id]/payments/route.ts](C:/Projects/Sharebuild-ERP/src/app/api/suppliers/payables/[id]/payments/route.ts)
- [src/app/api/suppliers/payables/[id]/reverse/route.ts](C:/Projects/Sharebuild-ERP/src/app/api/suppliers/payables/[id]/reverse/route.ts)
- [src/app/api/suppliers/payables/[id]/retention-release/route.ts](C:/Projects/Sharebuild-ERP/src/app/api/suppliers/payables/[id]/retention-release/route.ts)
- [src/app/api/suppliers/payables/[id]/payments/[paymentId]/reverse/route.ts](C:/Projects/Sharebuild-ERP/src/app/api/suppliers/payables/[id]/payments/[paymentId]/reverse/route.ts)

## Remaining APIs for future review

- The major `src/app/api` risk areas are now converted, but some lower-risk GET surfaces should still be normalized onto the same helper style for consistency.
- Older page routes under `src/app/(app)` still deserve a follow-up helper normalization pass, even where behavior is already correct.
- Local file serving still depends on public-path storage, which is acceptable for this local phase but not ideal for multi-tenant production.

## Project-only user security smoke result

Local seeded credentials used:

- admin: `admin@relaxdevelopers.com` / `admin123`
- project-only engineer: `engineer@relaxdevelopers.com` / `engineer123`

## Verified

- engineer can access assigned project:
  - `/projects/project-relax-tower` -> 200
- engineer cannot access unassigned project:
  - `/projects/project-madina-garden` -> redirected to `/access-denied`
- engineer cannot access company admin pages:
  - `/company/users` -> redirected to `/access-denied`
  - `/company/roles` -> redirected to `/access-denied`
- engineer cannot call protected company write APIs:
  - `POST /api/company/users` -> 403
- engineer cannot export protected project report workbook without permission:
  - `GET /api/projects/project-relax-tower/reports/complete-project/xlsx` -> 403
- engineer cannot approve finance actions without permission:
  - `POST /api/expenses/[id]/approve` -> 403
- admin can access company users/roles and can export the complete-project workbook

## Document security status

### Confirmed

- document list is company-scoped
- project-only visibility is restricted to assigned projects
- buyer-linked documents are filtered back to assigned projects for project-only users
- uploads validate MIME plus extension allowlists
- disallowed/unsafe extensions are blocked
- project-only users cannot upload unattached global/company documents
- linked project/buyer/unit/payable scope is checked before document creation

### Remaining production note

- files are still stored locally under `public/uploads/[companyId]/...`
- this is acceptable for local/dev and small single-tenant hosting, but multi-tenant SaaS should move to private object storage plus signed access patterns

## Export security status

### Confirmed

- Complete Project Report XLSX endpoint requires report export permission and project scope
- project-only users are blocked from unauthorized workbook export
- workbook/export APIs now run through project-aware permission checks
- report action labels are now honest:
  - workbook only where real XLSX exists
  - CSV only where implemented
  - PDF means browser Print / Save as PDF unless a server PDF exists
- no cross-project data appeared in the verified workbook path

### Remaining

- only Complete Project Report currently has native XLSX
- server-side PDF remains intentionally out of scope for this pass

## Production security checklist

- [x] `NEXTAUTH_SECRET` must be set outside demo defaults before production
- [x] `DATABASE_URL` must point to managed PostgreSQL
- [x] HTTPS is required before production login use
- [x] `X-Powered-By` disabled
- [x] broad `next/image` remote source configuration removed
- [x] auth/permission checks enforced on audited high-risk APIs
- [x] project-only user smoke coverage completed
- [x] upload extension restrictions enforced
- [ ] move uploads out of `public/uploads` for true multi-tenant production
- [ ] add backup/restore policy for PostgreSQL and uploaded files
- [ ] add hosting guidance that cPanel/shared hosting is not the target deployment model
- [ ] finish dependency major-upgrade review for unresolved `npm audit` findings
- [ ] finish page/helper normalization across older app routes

## Validation run

- `npm install`
- `npm audit`
- `npx prisma validate`
- `npx prisma generate`
- `npm run build`
- `npm run db:seed`

## Seed verification

- Income `100,143,800`
- Expense `104,659,890.40`
- Balance `-4,516,090.40`

## SaaS readiness

SaaS readiness can start from a product-workflow perspective, but production onboarding should wait for one more deliberate platform pass covering:

- framework/auth major-upgrade strategy for unresolved advisories
- private object storage and backup policy
- final deployment checklist and hosting model confirmation

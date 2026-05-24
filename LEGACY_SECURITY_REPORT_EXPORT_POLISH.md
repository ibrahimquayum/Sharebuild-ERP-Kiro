# Legacy Security / Report Export Polish

**Date:** May 24, 2026  
**Branch:** `feat/erp-v1`

## Risky Legacy Routes Reviewed

- `/buyers`, `/buyers/new`
- `/collections`, `/collections/new`
- `/expenses`, `/expenses/new`
- `/suppliers`, `/suppliers/new`
- `/phases`, `/phases/new`
- `/demands`, `/demands/new`
- `/materials`, `/materials/new`
- legacy global report/export routes

## Fixes Made

- Added server-wrapper guards to legacy client-only create forms:
  - `/buyers/new`
  - `/collections/new`
  - `/expenses/new`
  - `/suppliers/new`
  - `/phases/new`
- Added company-wide server guards to legacy global daily-work/list placeholders:
  - `/phases`
  - `/demands`
  - `/demands/new`
  - `/materials`
  - `/materials/new`
- Kept project daily work inside `/projects/[id]/*`; project-only users are redirected to `/access-denied` from legacy global pages.
- Preserved legacy warning UX on global daily-work pages that remain for admin/management fallback use.

## API Security Fixes Made

- Added `assertApiPhasePermission` for phase-derived project scope checks.
- Added `apiAccessError` for consistent 401/403 JSON responses.
- Hardened legacy/global APIs with persisted role permissions plus project assignment checks:
  - `GET/POST /api/buyers`
  - `GET/POST /api/collections`
  - `GET/POST /api/expenses`
  - `GET/POST /api/suppliers`
  - `GET/POST /api/phases`
  - `GET/PATCH/DELETE /api/phases/[id]`
  - `POST /api/phases/[id]/audit-lock`
  - `GET/POST /api/projects`
  - `PUT /api/projects/[id]`
- Report export hardening:
  - Complete Project Report CSV export now uses `assertApiProjectPermission(..., reports, export)`.
  - Complete Project Report page now uses `getScopedProject`.
  - Added native XLSX export at `/api/projects/[id]/reports/complete-project/xlsx`.

## Report / Export Polish

- Reports index now displays the requested groups:
  - Core Reports
  - Buyer Reports
  - Finance Reports
  - Vendor Reports
  - Compliance / Audit
- Each report card now explicitly marks:
  - Print-ready
  - CSV export
  - Excel workbook
  - PDF
  - Coming next
- Complete Project Report now exposes:
  - browser Print / Save as PDF
  - native XLSX workbook
  - CSV export
- Server PDF remains intentionally unimplemented and is not claimed.
- Print CSS now sets A4 page size and hides app shell/sidebar/header in print.

## Demand Notice Polish

- Demand batch print now includes per-buyer Demand Notice / Bill blocks with:
  - company branding
  - project and buyer information
  - unit
  - phase
  - base phase cost
  - service charge
  - adjustment
  - carry-forward / previous balance included
  - amount payable
  - due date
  - payment instruction
  - signatures

## Project-Only QA

Local seed credentials:

- Admin: `admin@relaxdevelopers.com` / `admin123`
- Project-only engineer: `engineer@relaxdevelopers.com` / `engineer123`

Expected project-only behavior after this pass:

- Can access assigned project workspace.
- Cannot access unassigned project URLs.
- Cannot access company settings/users/accounts.
- Cannot access global legacy daily-work pages.
- Cannot call hardened legacy write APIs without module permission and project assignment.

## Validation

- `npx prisma validate` passed.
- `npx prisma generate` passed.
- `npm run build` passed.
- `npm run db:seed` passed.
- `npm audit --omit=dev --audit-level=critical` still reports existing Next.js critical advisories and NextAuth/uuid/PostCSS moderate advisories; fixing them requires framework/auth dependency upgrades outside this hardening scope.
- Relax Tower seed totals preserved:
  - Income `100,143,800`
  - Expense `104,659,890.40`
  - Balance `-4,516,090.40`

## Known Remaining Risks

- The high-risk nested API helper conversion has now been completed in the follow-up dependency/API guard pass, but older app pages still deserve helper normalization for consistency.
- Server-side PDF generation remains future work.
- Most report pages are print-ready foundations; only selected reports have real CSV exports, and only Complete Project Report has native XLSX workbook export.
- `jszip` was added for lightweight workbook packaging; `npm audit` still reports existing Next.js, NextAuth/uuid, PostCSS, and dev-tooling advisories that need a separate framework/auth upgrade review rather than an automatic breaking upgrade.
- Local uploads still live under `public/uploads/[companyId]`; private object storage remains the production-grade next step for multi-tenant deployment.

## SaaS Readiness

SaaS readiness can start after the final dependency/security review is closed, local uploads are replaced with production-grade private storage, and the unresolved framework/auth advisories get a dedicated major-upgrade review. Billing, buyer portal, SMS/mobile, and AI remain intentionally untouched.

## Professional Report Overhaul Follow-Up - May 25, 2026

- The reporting shell introduced in this pass is now fully professionalized in `PROFESSIONAL_REPORT_SYSTEM_OVERHAUL.md`.
- Complete Project Report now distinguishes historical imported collections from issued system demand and unallocated advance, which removes the misleading `Total Demand = 0 / Buyer Advance = total collection` presentation problem on Relax Tower seed data.
- Demand Notice / Bill print now uses the same document system and no longer shows the old generic report-style back navigation label.
- Complete Project Report workbook export now uses `exceljs` and includes the explicit Top Sheet grand total row in addition to the required sheet set.

# Access, Reporting, And Billing Completion Plan

## Current Access-Control Risks

- Company-scoped authentication exists, but most pages still trust `companyId` alone.
- Project-assigned users can currently open any project in the same company if they know the URL.
- Sidebar visibility is static and does not reflect project assignment or module-level permissions.
- Many APIs still use the legacy static role matrix only and do not verify project assignment.
- Company-level pages such as users, settings, accounts, suppliers, and reports are visible without consistent module/action checks.
- Report/export routes are not consistently guarded by `export` or `auditAccess`.

## Current Report-System Gaps

- Report index is still a flat list and mixes "ready" and "foundation" pages without clear grouping.
- Shared report layout exists only partially; most reports still compose their own structure ad hoc.
- Complete Project Report is useful but not yet framed as the main professional reporting surface.
- CSV export exists, but native workbook export is not yet available.
- Print surfaces are better than the app pages, but sectioning, signatures, and grouped navigation still need consistency.

## Current Service-Charge Billing Gaps

- Service charge ledger exists, but phase demand issuance does not yet create a clear billing batch/header.
- Buyer demand rows do not currently expose base-cost, service-charge, carry-forward, and adjustment portions separately.
- There is no demand-batch level reference for billing/notice generation.
- Demand notices are not yet a professional print surface.

## Schema Changes Needed

- Add dynamic company roles and permission rows:
  - `CompanyRole`
  - `RolePermission`
- Add role linkage on `User`:
  - `companyRoleId`
- Add demand-batch layer:
  - `DemandBatch`
  - `Demand.demandBatchId`
  - `Demand.baseAmount`
  - `Demand.serviceChargeAmount`
  - `Demand.adjustmentAmount`
  - `Demand.carryForwardAmount`
- Reuse existing `ProjectStaffAssignment` for project access instead of introducing a duplicate assignment model.

## Route / API Risk Areas

- `/dashboard`
- `/projects`
- `/projects/[id]` workspace layout
- `/company/settings`
- `/company/users`
- `/company/accounts`
- `/company/cheques`
- `/projects/[id]/finance/*`
- `/projects/[id]/reports/*`
- `/api/projects/[id]/demands`
- `/api/projects/[id]/service-charge`
- `/api/projects/[id]/final-reconciliation`
- report export routes

## Implementation Plan

### 1. Access-Control Foundation

- Finish schema support for dynamic roles and demand batches.
- Add one clean migration for this pass only.
- Seed default company roles and permission rows for Relax Developers.
- Build a shared access helper that combines:
  - authenticated user
  - company scoping
  - company role permissions
  - active project assignment

### 2. Enforce Permissions

- Enforce at:
  - global sidebar
  - project sidebar
  - page layouts
  - high-risk APIs
  - report/export actions
- Add a clean `/access-denied` page.

### 3. User / Role Management UI

- Add company role management:
  - list
  - create
  - detail
  - edit
- Complete user detail/edit:
  - role assignment
  - project assignment
  - active status
  - permission summary

### 4. Professional Reporting Engine

- Add reusable report shell components:
  - page layout
  - toolbar
  - section
  - summary cards
  - signature block
  - print styles
- Redesign report index into grouped categories.
- Upgrade Complete Project Report to use the common report shell.

### 5. Phase Billing / Service Charge Alignment

- Add `DemandBatch` create/list/detail/print workflow.
- Issue demands from a batch with:
  - base amount
  - service charge amount
  - adjustment
  - carry-forward
  - total billable amount
- Link demand rows to the batch and preserve project-scoped buyer billing.

### 6. QA And Verification

- Validate schema and Prisma Client.
- Run build and seed.
- Run authenticated route smoke checks for:
  - admin
  - project-only user
- Verify Relax Tower Top Sheet totals remain exact.

## QA Checklist

- [x] Project-only user can open assigned project but not another project URL.
- [x] Project-only user cannot access company-wide settings/users/accounts without permission.
- [x] Sidebar hides modules the current user cannot access.
- [x] Unauthorized pages show Access Denied instead of leaking data.
- [x] Unauthorized APIs return 403 with no data exposure on the new role/account/user endpoints.
- [x] `/company/users` and `/company/roles` work end to end.
- [x] Demand batch creation works.
- [x] Demand batch print page works.
- [x] Service charge is visible inside phase billing/batch summary.
- [x] Complete Project Report opens with professional section layout.
- [x] Top Sheet totals remain:
  - Income `100,143,800`
  - Expense `104,659,890.40`
  - Balance `-4,516,090.40`

## Completion Update - May 24, 2026

- Added one clean migration:
  - `20260524051702_access_reporting_billing_completion`
- Added dynamic company role and permission persistence:
  - `CompanyRole`
  - `RolePermission`
  - `User.companyRoleId`
- Added project billing persistence:
  - `DemandBatch`
  - `Demand.demandBatchId`
  - `Demand.baseAmount`
  - `Demand.serviceChargeAmount`
  - `Demand.adjustmentAmount`
  - `Demand.carryForwardAmount`
- Added project/company access helper layer in `src/lib/access-control.ts`.
- Added `/access-denied` page and enforced it on:
  - company users / roles / settings / accounts
  - company account APIs
  - project demand batch, service charge, and final reconciliation APIs
  - legacy company-wide buyers / collections / expenses / suppliers pages
- Added complete user profile and role management UI:
  - `/company/users/*`
  - `/company/roles/*`
- Added demand-batch billing workflow:
  - `/projects/[id]/demands/batches`
  - `/projects/[id]/demands/batches/new`
  - `/projects/[id]/demands/batches/[batchId]`
  - `/projects/[id]/demands/batches/[batchId]/print`
- Added one extra seeded project, `Madina Garden`, strictly for access-control QA so project-only users can be verified against a real unauthorized project URL.
- Browser-style QA confirmed:
  - admin can access company/user/reporting surfaces
  - project-only engineer is redirected from company-wide routes
  - project-only engineer is blocked from `/projects/project-madina-garden/*`
  - service charge calculate/approve works
  - demand batch issuance with service charge works
  - final reconciliation posting creates traceable `FINAL_RECONCILIATION` demands

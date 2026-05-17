# Project Workspace Refactor — Stage 1
## What changed, what's new, what's kept, how to test

**Branch:** `feat/erp-v1`  
**Stage:** Stage 1 of the project-first architecture refactor  
**Date:** May 2026

---

## Core principle applied

> Every real business relationship, financial record, and daily action belongs to a **project**.  
> Company-level data (contacts, suppliers, users) exists only for reuse and identity — not for daily work.

Before this refactor, the app had a flat module-first structure:
`Buyers → Collections → Expenses → Suppliers` all as global lists.

After this refactor, everything starts from:
`Projects → [select a project] → Project Workspace → [work here]`

---

## What changed

### 1. Package / build
- Added `autoprefixer: ^10.4.19` to `devDependencies` (was missing, causing potential PostCSS warnings)

### 2. Prisma schema changes
| Model | Change |
|-------|--------|
| `SupplierPayable` | Added `projectId` (required, FK to projects) |
| `SupplierPayable` | Added `phaseId` (optional, FK to phases) |
| `SupplierPayable` | Added `billItems` relation to `SupplierBillItem` |
| `SupplierBillItem` | New model — line items on a supplier bill |
| `ProjectStaffRole` | New enum — 7 project-level staff roles |
| `ProjectStaffAssignment` | New model — user assigned to a project with a role |
| `Project` | Added `supplierPayables` and `staffAssignments` back-relations |
| `Phase` | Added `supplierPayables` back-relation |
| `User` | Added `staffAssignments` back-relation |

Migration file: `prisma/migrations/20260517000001_project_first_refactor/migration.sql`

### 3. New components
| File | Purpose |
|------|---------|
| `src/components/layout/project-workspace-sidebar.tsx` | Project-scoped sidebar with workspace tabs, back link to /projects |
| `src/components/layout/project-workspace-header.tsx` | Workspace header showing project name and user menu |

### 4. New route: project workspace layout
`src/app/(app)/projects/[id]/layout.tsx` — wraps all `/projects/[id]/*` routes with the workspace sidebar and header. Verifies the project belongs to the logged-in user's company.

---

## New routes added

All new routes are under `/projects/[id]/` and are **project-scoped** — all data is filtered by the project in the URL.

| Route | Page | What it shows |
|-------|------|--------------|
| `/projects/[id]` | Overview (enhanced) | KPI cards, quick actions, phase snapshot, buyers snapshot |
| `/projects/[id]/phases` | Phase Board | Kanban-style phase cards with financials per card |
| `/projects/[id]/buyers` | Project Buyers | Buyers in this project only, with project-specific paid amount |
| `/projects/[id]/collections` | Collections | Payments received in this project only |
| `/projects/[id]/collections/new` | Record Payment | Form — buyer/phase dropdowns scoped to this project |
| `/projects/[id]/expenses` | Expenses | Expenses incurred in this project only |
| `/projects/[id]/expenses/new` | Add Expense | Form — phase dropdown scoped to this project |
| `/projects/[id]/payables` | Supplier Payables | Bills for this project only, with phase column |
| `/projects/[id]/payables/new` | Record Bill | Form — supplier from company master, phase from this project |
| `/projects/[id]/due-followup` | Due Follow-up | Buyers with outstanding demand balances in this project |
| `/projects/[id]/demands` | Demand Notices | All demands issued for phases in this project |
| `/projects/[id]/documents` | Documents | Stub page (full implementation next stage) |
| `/projects/[id]/reports/top-sheet` | Top Sheet | Full Top Sheet scoped to this project, no project selector needed |

---

## Old routes kept (legacy — not deleted)

All existing routes continue to work. They now show an amber notice banner directing users to the project workspace for daily work.

| Route | Status | Notice shown? |
|-------|--------|--------------|
| `/buyers` | ✅ Working | ✅ Yes — "Use project workspace for project-specific balances" |
| `/buyers/[id]` | ✅ Working | No |
| `/buyers/new` | ✅ Working | No |
| `/buyers/dues` | ✅ Working | No |
| `/collections` | ✅ Working | ✅ Yes |
| `/collections/new` | ✅ Working | No |
| `/expenses` | ✅ Working | ✅ Yes |
| `/expenses/new` | ✅ Working | No |
| `/expenses/approvals` | ✅ Working | No |
| `/suppliers` | ✅ Working | No |
| `/suppliers/payables` | ✅ Working | No |
| `/suppliers/payables/new` | ✅ Working | ✅ Yes + now has project selector (required) |
| `/phases` | ✅ Working | No |
| `/phases/[id]` | ✅ Working | No |
| `/reports/top-sheet` | ✅ Working | No |
| `/dashboard` | ✅ Working | No |

---

## API changes

| Route | Change |
|-------|--------|
| `POST /api/suppliers/payables` | Now **requires** `projectId` in request body. Optional `phaseId`. Validates both belong to user's company. |
| `GET /api/suppliers/payables` | Now accepts `?projectId=` query param for filtering. |
| `POST /api/suppliers/payables/[id]/payments` | Now writes `projectId` to audit log. |

---

## What is still missing (Stage 2 and beyond)

| Missing | Priority | Notes |
|---------|----------|-------|
| Phase status change UI (within project workspace) | High | Phase cards link to global `/phases/[id]` for now |
| Drag-and-drop phase board | Low | Cards are static in columns for now |
| Bulk demand issuance form | High | `/projects/[id]/demands/new` still uses global stub |
| Project workspace demands form (project-scoped) | High | Existing `/demands/new` is global |
| Documents tab full implementation | Medium | Stub page only — upload works via individual expenses |
| `/projects/[id]/phases/[phaseId]` (workspace-scoped phase detail) | Medium | Currently links to global `/phases/[id]` |
| ProjectStaffAssignment UI (assign staff to project) | Medium | Model and migration ready, no UI yet |
| SupplierBillItem UI (multi-line bills) | Medium | Model ready, form not yet updated |
| Audit lock enforcement (check `isAuditLocked` before edits) | High | Schema supports it conceptually but field not added yet |
| Company accounting roll-up page | Future Stage | After all projects are correctly data-entered |
| Buyer portal | Future Stage | Architecture defined, not built |

---

## How to run the migration

The migration SQL is at:
```
prisma/migrations/20260517000001_project_first_refactor/migration.sql
```

**On a fresh install** (no existing data):
```bash
npx prisma migrate dev --name project_first_refactor
npm run db:seed
```

**On an existing dev database with no SupplierPayable rows** (most devs):
```bash
npx prisma migrate dev --name project_first_refactor
```

**If you have existing SupplierPayable rows:**
The migration backfills `projectId` from linked expenses. If any rows cannot be backfilled, they are deleted. Review the migration SQL before running.

---

## How to test the project workspace

1. Run `npm run dev`
2. Log in: `admin@relaxdevelopers.com` / `admin123`
3. Click **Projects** in the sidebar
4. Click **Relax Tower**
5. You should see the **Project Workspace** — a new layout with:
   - A narrower left sidebar showing workspace-only tabs
   - Project name ("Relax Tower") in the header
   - A "← All Projects" back link at the top of the sidebar
6. Navigate through all tabs and verify each loads project-scoped data

See `MANUAL_TEST_CHECKLIST.md` for detailed test cases.

---

## Next recommended build stage

**Stage 2: Project Workspace Completion**

1. Add `/projects/[id]/phases/[phaseId]` — phase detail inside workspace context
2. Add `/projects/[id]/demands/new` — project-scoped demand issuance form (with bulk issue to all buyers)
3. Wire phase status change to a dropdown in the phase card (update via API, no drag-drop yet)
4. Add `SupplierBillItem` line-item entry to the payables/new form
5. Add basic audit log viewer to `/projects/[id]/audit`

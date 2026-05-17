# Development Status — Sharebuild ERP
**Last updated:** May 2026  
**Branch:** `feat/erp-v1`  
**PR:** https://github.com/ibrahimquayum/Sharebuild-ERP/pull/1

---

## Quick summary

| Check | Status | Notes |
|-------|--------|-------|
| App runs (dev server) | ✅ Expected yes | Requires local `npm install` + PostgreSQL |
| Build passes | ✅ Expected yes | TypeScript clean, autoprefixer now in devDeps |
| Seed works | ✅ Fixed | Excel-accurate Top Sheet data |
| Login / logout | ✅ Done | NextAuth credentials |
| Protected routes | ✅ Done | Redirect to /login |
| Top Sheet matches Excel | ✅ Verified | Income 100,143,800 / Expense 104,659,890.40 |
| All sidebar links work | ✅ Fixed | No 404 links |
| **Project workspace** | ✅ Stage 1 done | `/projects/[id]/*` workspace with scoped data |
| **Phase board (cards)** | ✅ Done | Kanban columns, financial card per phase |
| **Project-scoped buyers** | ✅ Done | Balances scoped per project |
| **Project-scoped collections** | ✅ Done | Record payment form scoped to project |
| **Project-scoped expenses** | ✅ Done | Add expense form scoped to project |
| **Project-scoped payables** | ✅ Done | Supplier bills now require projectId |
| **Project-scoped due follow-up** | ✅ Done | Per-project buyer due dashboard |
| **Project-scoped Top Sheet** | ✅ Done | No project selector needed inside workspace |
| **Legacy routes** | ✅ Kept | All old routes work + amber notice banners |

---

## Architecture: Project-First (Stage 1 complete)

The app now follows a project-first architecture:

```
Company Dashboard (/dashboard)
  ↓
Projects List (/projects)
  ↓
Project Workspace (/projects/[id])
  ├── Overview          — KPIs, quick actions, phase snapshot
  ├── Phase Board       — phase cards by status column
  ├── Buyers            — project-specific buyers + balances
  ├── Collections       — payments received IN this project
  ├── Expenses          — costs incurred IN this project
  ├── Supplier Payables — bills for this project (+ phase)
  ├── Demands           — demand notices for this project
  ├── Due Follow-up     — buyer dues IN this project
  ├── Documents         — (stub — full in Stage 2)
  └── Top Sheet         — project-scoped financial summary

Company Master Data (legacy routes, still working)
  /buyers, /suppliers, /phases, /collections, /expenses, /reports/top-sheet
```

---

## Schema changes (Stage 1)

| Model | Change |
|-------|--------|
| `SupplierPayable` | Added `projectId` (required FK) |
| `SupplierPayable` | Added `phaseId` (optional FK) |
| `SupplierBillItem` | New model (line items on supplier bill) |
| `ProjectStaffRole` | New enum (7 project roles) |
| `ProjectStaffAssignment` | New model (user→project with role) |
| Migration | `prisma/migrations/20260517000001_project_first_refactor/migration.sql` |

---

## Completed features

### Infrastructure
- [x] Next.js 14 App Router, TypeScript, Prisma 5, PostgreSQL, NextAuth
- [x] Multi-tenant: Company → Project → Phase
- [x] autoprefixer added to devDependencies (build fix)
- [x] Bangla Unicode support (nameBn fields, bn font class)
- [x] Tailwind CSS + Radix UI component set

### Project Workspace (new in Stage 1)
- [x] Project workspace layout with scoped sidebar + header
- [x] Project overview: KPI cards, quick action buttons, phase snapshot
- [x] Phase board: kanban columns, financial cards per phase
- [x] Project buyers: scoped list with project-specific paid amount
- [x] Project collections: filtered by projectId from URL
- [x] Project expenses: filtered by projectId from URL
- [x] Project payables: bills scoped to this project + phase
- [x] Project due follow-up: buyer dues per project only
- [x] Project demands: demand notices for this project's phases
- [x] Project top sheet: full report, no project selector needed
- [x] Project documents: stub page (upload works via expense 📎)

### Project-scoped forms (new in Stage 1)
- [x] `/projects/[id]/collections/new` — buyer + phase dropdowns scoped to project
- [x] `/projects/[id]/expenses/new` — phase dropdown scoped to project
- [x] `/projects/[id]/payables/new` — supplier from company master, phase from project

### Data-entry forms (from previous work)
- [x] Add Buyer — `/buyers/new` — saves to DB, audit log
- [x] Add Phase — `/phases/new` — saves to DB, audit log, auto-name
- [x] Record Payment (global) — `/collections/new` — saves to DB
- [x] Add Expense (global) — `/expenses/new` — saves to DB, auto-calc
- [x] Add Supplier — `/suppliers/new` — saves to DB
- [x] Add Supplier Bill — `/suppliers/payables/new` — now requires project
- [x] Record Supplier Payment — `/suppliers/payables/[id]/pay` — atomic balance update
- [x] Upload Voucher — `/expenses/[id]/upload` — local disk, JPG/PNG/PDF

### API routes
- [x] `GET/POST /api/projects`
- [x] `GET/PATCH/DELETE /api/phases/[id]`
- [x] `GET/POST /api/phases` (accepts `?projectId=` filter)
- [x] `GET/POST /api/collections` (accepts `?phaseId=`, `?buyerId=`)
- [x] `GET/POST /api/expenses` (accepts `?phaseId=`, `?status=`)
- [x] `POST /api/expenses/[id]/approve` — with audit log
- [x] `POST /api/expenses/[id]/reject` — with audit log
- [x] `GET/POST /api/buyers` (accepts `?projectId=` filter — **key for scoping**)
- [x] `GET/PATCH /api/buyers/[id]`
- [x] `GET/POST /api/suppliers`
- [x] `GET/POST /api/suppliers/payables` — now requires `projectId` in POST
- [x] `GET/POST /api/suppliers/payables/[id]/payments`
- [x] `GET/POST /api/documents`
- [x] `GET /api/reports/top-sheet`

### Read-only list pages (all still working)
- [x] `/dashboard` — company-wide KPI summary
- [x] `/projects` — project cards
- [x] `/phases` — global phase list with financials
- [x] `/phases/[id]` — phase detail (income+expense ledger)
- [x] `/buyers` — company-wide buyer list (with legacy notice)
- [x] `/buyers/[id]` — buyer profile with payment history
- [x] `/buyers/dues` — global due dashboard
- [x] `/collections` — global collections list (with legacy notice)
- [x] `/expenses` — global expense list (with legacy notice)
- [x] `/expenses/approvals` — pending approvals with Approve/Reject
- [x] `/suppliers` — supplier list
- [x] `/suppliers/payables` — payables list with Pay Now
- [x] `/reports/top-sheet` — global top sheet
- [x] `/reports/phase-summary` — phase summary
- [x] `/settings` — company info, team, role permissions
- [x] `/login` — auth

### Audit log coverage
| Entity | CREATE | UPDATE | APPROVE/REJECT |
|--------|--------|--------|----------------|
| Buyer | ✅ | ❌ | — |
| Phase | ✅ | ❌ | — |
| Collection | ✅ | — | — |
| Expense | ✅ | — | ✅ |
| Supplier | ✅ | — | — |
| SupplierPayable | ✅ (with projectId) | — | — |
| SupplierPayment | ✅ (with projectId) | — | — |

---

## Missing features (Stage 2 scope)

| Feature | Priority | Notes |
|---------|----------|-------|
| Phase detail inside project workspace | High | Currently links to global `/phases/[id]` |
| Phase status change form (dropdown on card) | High | Cards are read-only now |
| Project-scoped demand issuance form | High | Needs bulk issue to all project buyers |
| SupplierBillItem UI (multi-line bills) | Medium | Model and schema ready |
| ProjectStaffAssignment UI | Medium | Model and migration ready |
| Audit lock enforcement | High | `isAuditLocked` check before edits |
| Audit log viewer page | Medium | `audit_logs` table exists and is populated |
| Documents tab full implementation | Medium | Stub page only |
| Company accounting roll-up dashboard | Future | After all project data is correct |
| PDF export (Top Sheet, buyer statement) | Medium | Print CSS exists |
| User management UI | Medium | Users can be created via seed |
| Buyer portal (read-only cross-project view) | Future | Architecture defined |

---

## Known issues

1. **SupplierPayable migration on existing DBs** — If any existing SupplierPayable rows exist without a projectId, the migration backfills from linked expenses or deletes them. Safe on fresh installs (no payable rows in seed).

2. **Phase board is static** — Phase cards are in columns but cannot be dragged. Status change requires visiting the phase detail page.

3. **Project workspace demands form** — The "Issue Demand" button in `/projects/[id]/demands` links to global `/demands/new` which does not pre-fill the project. Stage 2 will add a project-scoped demand form.

4. **Buyer due calculation without demands** — The due follow-up page calculates due as `totalDemanded - totalPaid`. If no demands have been issued, due shows ৳ 0 even if payments are expected. Issue demands first.

5. **File upload is local disk only** — `/public/uploads/[companyId]/`. Replace with S3/R2 before production deployment.

---

## How to run locally

See [LOCAL_TESTING_GUIDE.md](./LOCAL_TESTING_GUIDE.md)

```bash
npm install
cp .env.example .env       # set DATABASE_URL + NEXTAUTH_SECRET
npx prisma migrate dev --name init
npm run db:seed
npm run dev
```

Open: http://localhost:3000  
Login: `admin@relaxdevelopers.com` / `admin123`

**After Stage 1 migration (if upgrading existing DB):**
```bash
npx prisma migrate dev --name project_first_refactor
```

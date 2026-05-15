# Development Status — Sharebuild ERP
**Last updated:** May 2026  
**Branch:** `feat/erp-v1`  
**PR:** https://github.com/ibrahimquayum/Sharebuild-ERP/pull/1

---

## Quick summary

| Check | Status | Notes |
|-------|--------|-------|
| App runs (dev server) | ✅ Expected yes | Requires local `npm install` + PostgreSQL |
| Build passes (`npm run build`) | ✅ Expected yes | Static analysis clean |
| Seed works | ✅ Fixed | Full Excel data, idempotent re-runs |
| Login works | ✅ Implemented | NextAuth credentials provider |
| Protected routes | ✅ Implemented | App layout redirects to /login |
| Top Sheet matches Excel | ✅ Fixed in seed | Income 100,143,800 / Expense 104,659,890.40 |
| All sidebar links work | ✅ Fixed | "Coming Soon" pages for unbuilt forms |
| Approval workflow | ✅ Fixed | Converted from broken HTML form to fetch-based client component |
| TypeScript strict errors | ✅ Fixed | Unused imports removed, React.ReactNode typed correctly |

---

## Completed features

### Infrastructure
- [x] Next.js 14 App Router with TypeScript
- [x] Prisma ORM with full schema (20+ models)
- [x] PostgreSQL database with proper migrations
- [x] NextAuth.js JWT session authentication
- [x] Role-based access structure (COMPANY_ADMIN, MANAGER, ACCOUNTANT, SITE_ENGINEER, VIEWER)
- [x] Multi-tenant Company → Project hierarchy
- [x] Audit log table (AuditLog model) — write implemented on expense create/approve/reject
- [x] Tailwind CSS design system with Radix UI components
- [x] Bangla Unicode support throughout (nameBn fields, bn font class)

### Database seed
- [x] Relax Tower company and project
- [x] 22 phases (Piling, Basement, 1st–10th Slab, 8 Gathuni, Half Slab, Finishing Draft)
- [x] 10 sample buyers with project links
- [x] Collections seeded per phase to match Excel Top Sheet income totals
- [x] Itemised expenses for Piling and Basement (from Excel)
- [x] Summary expenses for all other phases (exact totals from Excel)
- [x] Top Sheet total: Income ৳100,143,800 / Expense ৳104,659,890.40 / Balance −৳4,516,090.40

### Pages (read-only views)
- [x] `/dashboard` — KPI cards, project summary, phase list, balance bar
- [x] `/projects` — Project cards grid
- [x] `/projects/[id]` — Project detail with phase financial table
- [x] `/phases` — All phases with income/expense/balance
- [x] `/phases/[id]` — Phase ledger: income side + expense side + category breakdown
- [x] `/buyers` — Buyer list with due balances
- [x] `/buyers/[id]` — Buyer profile, payment history, phase-wise matrix, demands
- [x] `/buyers/dues` — Live due dashboard
- [x] `/collections` — All payment records
- [x] `/expenses` — All expense records with status
- [x] `/expenses/approvals` — Pending approval queue with Approve/Reject buttons
- [x] `/suppliers` — Supplier list with payable summary
- [x] `/suppliers/payables` — Payable tracker with overdue detection
- [x] `/demands` — Demand notices list
- [x] `/materials` — Material purchase log
- [x] `/reports/top-sheet` — Full Top Sheet report (mirrors Excel)
- [x] `/reports/phase-summary` — Phase-wise summary table
- [x] `/settings` — Company info, team members, role permissions reference
- [x] `/login` — Credential login with demo hint

### API routes (REST)
- [x] `GET/POST /api/projects`
- [x] `GET/PATCH/DELETE /api/phases/[id]`
- [x] `GET/POST /api/phases`
- [x] `GET/POST /api/collections`
- [x] `GET/POST /api/expenses`
- [x] `POST /api/expenses/[id]/approve` — with audit log
- [x] `POST /api/expenses/[id]/reject` — with audit log
- [x] `GET/POST /api/buyers`
- [x] `GET/PATCH /api/buyers/[id]`
- [x] `GET/POST /api/suppliers`
- [x] `GET /api/reports/top-sheet`
- [x] `GET/POST /api/auth/[...nextauth]`

---

## Partially completed features

### Approval workflow
- [x] Approve/Reject buttons on expense approvals page (client-side fetch)
- [ ] Email notification on approval/rejection (SMTP not configured yet)
- [ ] Bulk approve

### Audit log
- [x] AuditLog table exists in schema
- [x] Expense create, approve, reject write to audit_logs
- [ ] Collection create does not write audit log (missing)
- [ ] Phase status change does not write audit log (missing)
- [ ] Buyer create/update does not write audit log (missing)
- [ ] No audit log viewer UI page yet

### Supplier payables
- [x] SupplierPayable and SupplierPayment models in schema
- [x] Payables list page (read-only)
- [ ] No bill entry form (Coming Soon page)
- [ ] No payment recording form (Coming Soon page)

### Buyers
- [x] Buyer list, profile, payment history, due dashboard
- [ ] No buyer creation form (Coming Soon page)
- [ ] Late payment allocation (collecting against specific demand) — structure exists, UI missing

---

## Missing features (Phase 1 scope — not yet built)

| Feature | Status | Priority |
|---------|--------|----------|
| New Project form | Coming Soon page | High |
| New Phase form | Coming Soon page | High |
| Add Buyer form | Coming Soon page | High |
| Record Payment (collection) form | Coming Soon page | High |
| Add Expense form | Coming Soon page | High |
| Issue Demand Notice form | Coming Soon page | High |
| Add Supplier form | Coming Soon page | Medium |
| Record Supplier Bill form | Coming Soon page | Medium |
| Supplier payment recording | Missing | Medium |
| PDF export (Top Sheet, buyer statement) | Missing | Medium |
| Audit log viewer page | Missing | Medium |
| Due reminder (email/SMS) | Missing | Low |
| Document/voucher upload | Missing | Low |
| Charts on dashboard | Missing | Low |
| User management (add/edit users) | Missing | Medium |

---

## Known bugs (fixed in this pass)

| # | Bug | Fix Applied |
|---|-----|-------------|
| 1 | `prisma.expense.create` in seed duplicated on re-run | Changed to `deleteMany` then `createMany` pattern |
| 2 | Seed had no collections — Top Sheet income = 0 | Full collections seeded from Excel totals |
| 3 | Seed only had 2 of 21 active phases with expenses | All phases now have expense entries |
| 4 | Approval page used HTML `<form>` POST (broken with session auth) | Replaced with `ApprovalActions` client component using `fetch` |
| 5 | Sidebar links to unbuilt form pages returned 404 | "Coming Soon" placeholder pages added for all |
| 6 | `formatDate` unused import in dashboard page | Removed |
| 7 | `React.ReactNode` used without React import in server components | Changed to `import type { ReactNode }` |
| 8 | `@radix-ui/react-badge` listed in package.json (doesn't exist) | Removed from dependencies |
| 9 | `next.config.js` had experimental `serverActions.allowedOrigins` | Removed (not needed in Next.js 14.2) |
| 10 | Google Fonts `@import` in globals.css blocks offline/slow dev | Replaced with system font stack fallback |

---

## Known limitations

1. **No collection seed per demand** — Collections are seeded as phase-level payments, not linked to specific demand notices. The Demand model exists but no demands are seeded.
2. **Expense breakdown for phases 1–11th** — Only Piling and Basement have itemised expenses. All others have a single summary entry. Real data needs to be entered via forms.
3. **No unit/flat assignment** — Unit model exists, but no units are seeded for Relax Tower.
4. **Gathuni income in seed** — Gathuni income is distributed across the same 10 buyers as slab income. In reality each gathuni phase may have different buyer sets.

---

## How to run locally

See [LOCAL_SETUP.md](./LOCAL_SETUP.md)

**Quick start:**
```bash
npm install
cp .env.example .env   # set DATABASE_URL
npx prisma migrate dev --name init
npm run db:seed
npm run dev
```

Login: `admin@relaxdevelopers.com` / `admin123`

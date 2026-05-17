# Manual Test Checklist - Sharebuild ERP

Use this after:

```bash
npx prisma migrate reset --force --skip-seed
npm run db:seed
npm run dev
```

Login: `admin@relaxdevelopers.com` / `admin123`

## A. Core App

- [ ] `/login` signs in successfully.
- [ ] `/dashboard` opens after login.
- [ ] Protected routes redirect to `/login` after logout.
- [ ] Global sidebar shows Dashboard, Projects, Company Setup, Reports, Audit.
- [ ] Legacy daily-work pages are not primary global menu items.

## B. Project Workspace

- [ ] `/projects` lists Relax Tower.
- [ ] Clicking Relax Tower opens `/projects/project-relax-tower`.
- [ ] Project workspace sidebar replaces the global sidebar.
- [ ] Sidebar groups are Overview, Setup, Finance, Work, Documents, Reports, Audit, Settings.
- [ ] Overview KPI totals match seeded data.
- [ ] Quick actions route to project-scoped pages.

## C. Project Setup

- [ ] `/projects/new` creates a new project and redirects to `/projects/[newProjectId]`.
- [ ] `/projects/[id]/settings` saves profile/planning fields.
- [ ] Financial totals cannot be manually edited.

## D. Units And Ownership

- [ ] `/projects/[id]/units` opens.
- [ ] `/projects/[id]/units/new` creates a unit.
- [ ] `/projects/[id]/units/[unitId]` opens and edits unit fields.
- [ ] `/projects/[id]/buyers` assigns an existing contact to a unit.
- [ ] Ownership share is displayed.
- [ ] Co-owners can be represented by multiple buyer rows on one unit.
- [ ] Payer-differs flag displays clearly.
- [ ] Buyer balances are project-scoped only.

## E. Documents

- [ ] `/projects/[id]/documents` opens.
- [ ] Search and scope filter do not crash.
- [ ] `/projects/[id]/documents/upload` uploads a PDF/image.
- [ ] Document title, category, scope, linked buyer/unit/phase, sort order, uploader, and date display.
- [ ] Uploaded file opens from the document table.

## F. Finance And Demands

- [ ] `/projects/[id]/finance` opens.
- [ ] Finance overview shows demanded, collected, due, expense, supplier payable, subcontractor payable, project balance, missing vouchers, and pending approvals.
- [ ] `/projects/[id]/demands/new` creates demand records for selected buyer/unit rows.
- [ ] `/projects/[id]/demands` shows created demands.
- [ ] `/projects/[id]/collections` remains project-scoped.
- [ ] `/projects/[id]/expenses` remains project-scoped.
- [ ] `/projects/[id]/payables` remains project-scoped.

## G. Reports

- [ ] `/projects/[id]/reports` lists all report foundations.
- [ ] `/projects/[id]/reports/top-sheet` shows tenant branding and correct seeded totals:
  - Income: 100,143,800
  - Expense: 104,659,890.40
  - Balance: -4,516,090.40
- [ ] Print button works on report pages.
- [ ] PDF/Excel buttons are disabled and do not claim export is complete.

## H. Company Setup

- [ ] `/company/settings` saves company profile and report footer note.
- [ ] `/company/contacts` opens.
- [ ] `/company/suppliers` opens.
- [ ] `/company/subcontractors` opens.
- [ ] `/company/materials` opens and documents schema gap.
- [ ] `/company/categories` opens and documents schema gap.
- [ ] `/company/payment-methods` opens and documents schema gap.
- [ ] `/company/users` creates a user with one of the product roles.

## I. Legacy/Fallback Routes

- [ ] `/phases` opens and shows legacy warning.
- [ ] `/collections` opens and shows project-workspace guidance.
- [ ] `/expenses` opens and shows project-workspace guidance.
- [ ] `/buyers` opens as company-wide identity fallback.
- [ ] `/reports/top-sheet` still opens.

## J. Stability

- [ ] No Radix Select empty-value runtime error.
- [ ] No duplicate/random migration folders.
- [ ] `npx prisma generate` passes.
- [ ] `npm run build` passes.
- [ ] `npm run db:seed` passes.

# Final UI + Report Stabilization Pass

## Root causes found

- Project and phase detail routes were not sharing one consistent workspace shell boundary.
- Several dashboard and overview screens were still using pre-service-charge labels like `Total Expense` and `Net Balance`.
- Mojibake strings were present in seeded project metadata and visible UI text.
- Complete Project print output still exposed internal-looking references, repeated methodology notes, oversized empty sections, and a weak final sign-off page.

## Files touched

- `src/components/layout/app-shell.tsx`
- `src/app/(app)/phases/[id]/layout.tsx`
- `src/app/(app)/dashboard/page.tsx`
- `src/app/(app)/projects/page.tsx`
- `src/app/(app)/projects/[id]/page.tsx`
- `src/app/(app)/projects/[id]/phases/page.tsx`
- `src/app/(app)/projects/[id]/finance/service-charge/page.tsx`
- `src/components/layout/project-workspace-sidebar.tsx`
- `src/components/reports/complete-project-print-document.tsx`
- `src/components/reports/print-document.tsx`
- `src/lib/project-cost-report.ts`
- `src/lib/report-controls.ts`
- `src/lib/utils.ts`
- `prisma/seed.ts`

## Fixes made

- Hid the global shell for phase detail routes and added a project workspace layout for `/phases/[id]`.
- Reworked dashboard and project overview KPIs to use corrected collection / construction cost / service charge / billable cost terminology.
- Reduced project overview action chaos by keeping three primary actions visible and moving the rest into `More Actions`.
- Upgraded `/projects` cards with service charge, current phase, unit/buyer counts, collection, billable cost, buyer due, and balance.
- Fixed Madina Garden Bangla seed data and added display-side mojibake normalization for visible Bangla labels.
- Removed raw internal cost-row fallback IDs from client-facing report references.
- Made management report mode compact by default, added compact empty states, added buyer billing summary, corrected service-charge flow wording, and upgraded the signature page.

## Known gaps deferred because of low Codex limit

- I did not rebuild the screen-report route family to match the print document line-for-line.
- I did not do a wider typography/content cleanup across every report/export route.
- I did not do SaaS hardening, dependency/private storage hardening, PDF server generation, or finance architecture rewrites.
- Browser QA was partially blocked by a local runtime `500` on `next start`, even though `next build` passed.

# Implementation Plan: Production Readiness Pass

## Overview

This plan implements the five-area production-readiness/polish pass defined in the design. Work is split into five safe, sequential, independently reviewable top-level tasks (one per requirement). Each task is a small, local change against the existing TypeScript / Next.js 14 codebase; there is no architectural change.

Guardrails (apply to every task, override any tempting refactor):
- No Prisma schema change — **stop and ask first** if any change appears to require one.
- No accounting-aggregation change — **stop and ask first** if any change appears to require one (`project-finance.ts`, `project-cost-report.ts`, `lib/accounting`).
- Do not change `prisma/seed.ts` seed totals.
- Preserve `getEffectiveServiceChargePercent` precedence (phase → project → company → 0) unchanged.
- Supplier bill items remain project cost rows; supplier payments and subcontractor payments are **not** cost rows.
- Preserve existing working routes and UI behavior (backward compatibility).
- `next build` must complete with zero TypeScript errors.

Implementation language: **TypeScript** (existing stack). Property/unit tests use a property-based testing library (fast-check) — do not hand-roll generators.

## Tasks

- [x] 1. Sidebar/layout duplication and missing-sidebar fix
  - [x] 1.1 Extract `isProjectWorkspaceRoute` pure helper and fix the `AppShell` route predicate
    - In `src/components/layout/app-shell.tsx`, add an exported pure helper `isProjectWorkspaceRoute(pathname: string): boolean` that returns `/^\/projects\/[^/]+(\/|$)/.test(pathname)`
    - Replace the current over-matching predicate (which also matches `/phases/[id]`) so the global sidebar is suppressed **only** on genuine project workspace routes
    - Result: `/projects/{id}` and `/projects/{id}/...` render the Project_Workspace_Shell sidebar only; the global `/phases/{id}` route renders the Global_Shell sidebar again; `/dashboard`, `/projects`, `/company/...`, and any non-matching route fall back to the Global_Shell sidebar
    - Preserve all existing navigation links and route targets (no link/target changes)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6; Constraint 9_

  - [ ]* 1.2 Set up the test runner and write unit tests for `isProjectWorkspaceRoute`
    - Add a property-based test runner (fast-check) plus a lightweight test runner compatible with the TypeScript/tsx setup, and a `test` script in `package.json` (single-run, not watch mode)
    - Assert true for `/projects/x`, `/projects/x/finance`, `/projects/x/finance/service-charge`
    - Assert false for `/phases/x`, `/dashboard`, `/projects`, `/company/settings`, `/` and `""`
    - _Requirements: 1.2, 1.3, 1.4, 1.5_

- [ ] 2. Service charge wording cleanup (billed / collected / uncollected)
  - [ ] 2.1 Clean up the LIVE service charge screen presentation
    - In `src/app/(app)/projects/[id]/finance/service-charge/page.tsx`, present service charge as **billed / collected / uncollected**, sourcing values from the existing `getProjectServiceChargeLedger` fields (`billedAmount`, `collectedAmount`, `uncollectedAmount` per phase; `billedTotal`, `collectedTotal`, `uncollectedTotal` for totals) — read defensively with `?? 0`
    - Add a one-line note that service charge is included in buyer demand/billing and collected through normal buyer collection
    - Remove the "Separate manual settlement…" and "Legacy separate service-charge settlement" copy, the "separate settlement"/"operational settlement" language, and any calculate/approve-ledger framing presented as the way to produce official finance totals
    - Format all monetary values via `formatBDT`
    - Do not recompute any amounts; do not modify the `/api/projects/[id]/service-charge` backend actions; do not touch `getEffectiveServiceChargePercent`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7; Constraints 3, 9_

  - [ ] 2.2 Align the orphaned `ServiceChargeActions` component wording
    - In `src/components/projects/service-charge-actions.tsx`, replace the calculate/approve "Service Charge Ledger" and separate/operational-settlement framing with a read-only billed/collected/uncollected presentation consistent with task 2.1 (presentation-only; component is not currently rendered, so keep changes copy/presentation-level and do not introduce a new settlement workflow)
    - _Requirements: 2.1, 2.3, 2.4, 2.7_

  - [ ]* 2.3 Property test for `getEffectiveServiceChargePercent` precedence (regression guard)
    - **Property 1: Effective service-charge percent precedence is preserved**
    - **Validates: Requirements 2.6 (Constraint 3/5)**
    - Over present-or-absent combinations of `companyDefaultPct`, `projectDefaultPct`, `phaseOverridePct`, assert the highest-priority **present** value wins in order phase → project → company, and `0` when all absent (min 100 iterations; tag `Feature: production-readiness-pass, Property 1`)

  - [ ]* 2.4 Render/text assertion for service charge wording
    - Assert the service charge presentation contains "billed", "collected", "uncollected" and contains no "separate settlement" / "operational settlement" text
    - _Requirements: 2.1, 2.4_

- [ ] 3. Financial labels and currency formatting consistency
  - [ ] 3.1 Standardize currency formatting onto `formatBDT` / `formatBDTCompact`
    - Audit overview and report screens for ad-hoc inline currency formatting (literal `Tk `, `৳`, `toLocaleString`, manual `BDT` strings) and replace with `formatBDT` (full precision) or `formatBDTCompact` (KPI tiles)
    - Keep one currency prefix (`Tk `) and one grouping/decimal style (`en-IN`, 0–2 fraction digits) — do not alter `formatBDT`/`formatBDTCompact` logic or rounding
    - Do not change any numeric or aggregation result — labels/formatting only
    - _Requirements: 3.1, 3.2, 3.5; Constraints 8, 10_

  - [ ] 3.2 Make financial wording consistent across overview and reports
    - Use one consistent term for the same concept across overview and reports (e.g. one term for collected income, one for project balance)
    - _Requirements: 3.3_

  - [ ]* 3.3 Property test for `formatBDT` determinism and shape
    - **Property 2: Currency formatting is deterministic and consistently shaped**
    - **Validates: Requirements 3.2, 3.4**
    - For any finite numeric input, assert repeated calls produce the same string, the string begins with the `Tk ` prefix, and uses `en-IN` grouping with 0–2 fraction digits (min 100 iterations; tag `Feature: production-readiness-pass, Property 2`)

- [ ] 4. Complete Project Report cleanup
  - [ ] 4.1 Apply `normalizeDisplayText` uniformly to user-facing text cells
    - In `src/lib/complete-project-report.ts` and `src/components/reports/complete-project-print-document.tsx`, ensure every user-facing text cell (project, buyer, supplier, subcontractor, phase, party, description, cheque party) passes through `normalizeDisplayText`
    - Confirm the normalizer never surfaces replacement/placeholder characters (it already falls back to the original on `U+FFFD`); audit for cells that currently skip normalization
    - _Requirements: 4.1, 4.3_

  - [ ] 4.2 Remove raw internal IDs from visible report content
    - Audit the print document for cuid leakage in **visible** cells; replace any visible internal id with human-meaningful values already in the data (`sourceNo`/`billNo`/`chequeNo`, `unitNo`, party/buyer/phase names)
    - Leave non-visible React `key={row.id}` props unchanged
    - _Requirements: 4.2_

  - [ ] 4.3 Improve print/PDF readability
    - Apply sensible column widths for dense tables, right-align monetary columns via `PrintAmount` (`tabular-nums`), and lean on existing `avoid-break`/`page-break` primitives; add per-row break-avoidance only where a row currently splits across pages
    - Keep the existing service-charge note ("billed through buyer demand and collected through normal buyer collection")
    - Keep all report monetary totals numerically unchanged
    - _Requirements: 4.4, 4.5, 4.6; Constraint 8_

  - [ ]* 4.4 Property test for `normalizeDisplayText` safety/no-op on clean text
    - **Property 3: Display-text normalization is safe and lossless on valid text**
    - **Validates: Requirements 4.1, 4.3**
    - For any already-clean string (valid Bangla / arbitrary Unicode without mojibake markers), assert the input is returned unchanged, and for all inputs the output never contains `U+FFFD` (min 100 iterations; tag `Feature: production-readiness-pass, Property 3`)

- [ ] 5. Final verification
  - [ ] 5.1 Build, seed, and totals verification
    - Run `next build` and confirm zero TypeScript errors
    - Run the seed (`npm run db:seed`) and confirm it completes without error and produces Relax Tower Top Sheet totals within ±1.00: Income 100,143,800; Expense 104,659,890.40; Balance -4,516,090.40
    - Confirm Complete Project Report monetary totals are unchanged from before the pass (within ±1.00 per total)
    - Run the targeted unit/property tests added above and confirm they pass
    - If any step fails, report the failing step and the observed value before considering the pass complete (do not run destructive or force git operations; commit/push is user-confirmed separately after verification passes)
    - _Requirements: 5.1, 5.2, 5.3, 5.4; Constraints 1, 2, 11_

## Notes

- Tasks marked with `*` are optional test sub-tasks and can be skipped for a faster MVP; core implementation sub-tasks are never optional.
- Each top-level task is independently reviewable and committable. The user reviews this plan before any code changes; sub-tasks are actionable coding steps only.
- This plan makes no schema change and no accounting-aggregation change. If implementation reveals either is required, stop and ask first.
- Seed totals and Relax Tower Top Sheet totals must not change.
- Supplier bill items remain cost rows; supplier/subcontractor payments are not cost rows.
- Verification (task 5) is the final gate. The actual commit/push happens after verification passes and is user-confirmed separately — the executor must not force-push or run destructive git.
- Property tests use fast-check, run a minimum of 100 iterations, implement exactly one design property each, and are tagged `Feature: production-readiness-pass, Property {number}`.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "2.1", "3.1", "4.1"] },
    { "id": 1, "tasks": ["1.2", "2.2", "3.2", "4.2"] },
    { "id": 2, "tasks": ["2.3", "2.4", "3.3", "4.3", "4.4"] },
    { "id": 3, "tasks": ["5.1"] }
  ]
}
```

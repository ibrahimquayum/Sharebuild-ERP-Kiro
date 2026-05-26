# Service Charge Phase Page Fix

**Date:** May 26, 2026  
**Branch:** `feat/erp-v1`

## Scope

Focused fix for the phase detail page service-charge bug and the side-by-side phase financial layout.

## Root Cause

The phase detail page was reading service charge through helpers that stopped at the phase field too early.

- Project default service charge field:
  - `Project.defaultServiceChargePct`
- Phase override field:
  - `Phase.serviceChargePct`
- Company default service charge:
  - stored in `CompanySetting` with key `defaultServiceChargePct`

### What went wrong

Both `Project.defaultServiceChargePct` and `Phase.serviceChargePct` were nullable columns with a schema default of `0`.

That created two bugs:

1. An untouched phase looked like it had an explicit `0%` override.
2. Different helpers handled `0` differently:
   - some treated `0` as a real override and never fell back to project default
   - another helper treated `0` as missing, which broke the "explicit 0% override is valid" rule

For Relax Tower Piling:

- `Project.defaultServiceChargePct = 5`
- `Phase.serviceChargePct` was effectively saved as `0` by the old schema default
- the phase page helper stopped at phase `0`
- result:
  - `Company Service Charge / Supervision Fee (0.00%)`
  - `Tk 0`
  - `Total Phase Cost = Tk 1,70,41,165.44`

## Project Settings Save Status

Project settings already saved and reloaded the project default correctly.

- Project settings page reads:
  - `project.defaultServiceChargePct`
- Project settings form submits:
  - `defaultServiceChargePct`
- Project update API persists:
  - `defaultServiceChargePct`

So the main bug was not project settings persistence. The bug was fallback interpretation inside phase/report helpers.

## Fix Applied

## 1. Central fallback helper

Added:

- `src/lib/service-charge.ts`

Key helper:

- `getEffectiveServiceChargePercent({ companyDefaultPct, projectDefaultPct, phaseOverridePct })`

Rules now:

- if phase override is not `null`/`undefined`, use phase override
- else use project default
- else use company default
- else use `0`

Important:

- `0` is treated as a valid explicit override
- only `null` / `undefined` mean "not set"

## 2. Schema correction

Added one clean migration:

- `prisma/migrations/20260525191553_service_charge_defaults_nullable/migration.sql`

Changes:

- removed schema default `0` from:
  - `Project.defaultServiceChargePct`
  - `Phase.serviceChargePct`
- normalized old schema-default zero values to `NULL`

This lets fallback logic distinguish:

- explicit `0%`
- unset value that should inherit project/company default

## 3. Helper alignment

Corrected service-charge fallback in:

- `src/lib/project-cost-report.ts`
- `src/lib/project-finance.ts`
- `src/lib/complete-project-report.ts`

These now use the same effective service charge logic for:

- phase detail page
- unified project cost rows
- complete project report
- print route
- XLSX workbook
- phase summary report
- expense / project cost reporting data

## 4. Phase page layout correction

Updated:

- `src/app/(app)/phases/[id]/page.tsx`

Restored the intended mental model:

- left: `Income / Collections`
- right: `Expenses / Project Cost`

Main corrections:

- right-side panel now shows actual expense/project cost rows
- abstract source-summary rows were moved out of the main panel
- service charge now appears in the expense footer only:
  - `Subtotal Construction Cost`
  - `Company Service Charge / Supervision Fee (X%)`
  - `Total Phase Cost`
- bottom summary now reinforces:
  - `Total Collection`
  - `Total Phase Cost`
  - `Phase Balance`

## Verified Piling Result

After the fix, Relax Tower Piling shows:

- Construction Cost: `Tk 1,70,41,165.44`
- Company Service Charge / Supervision Fee (5%): `Tk 8,52,058.27`
- Total Phase Cost: `Tk 1,78,93,223.71`
- Total Collection: `Tk 1,35,00,000`
- Phase Balance: `-Tk 43,93,223.71`

## Totals Affected

Phase-billable totals now consistently include service charge on the corrected surfaces.

Historical Top Sheet totals remain unchanged:

- Income: `100,143,800`
- Expense: `104,659,890.40`
- Balance: `-4,516,090.40`

## Reports / Exports Affected

Corrected service-charge fallback now feeds:

- phase detail page
- Complete Project Report screen
- Complete Project Report print route
- Complete Project Report XLSX data
- phase summary report data
- expense / project cost report data

## Follow-up Update - Finance Flow Integrity Pass

This focused fix was later extended by the finance-flow audit pass:

- `/projects/[id]/phases` now also uses the corrected billable phase cost and real phase balance.
- phase summary and complete project report surfaces now distinguish:
  - phase balance
  - cumulative carry-out
- service charge is now treated as demand-linked billing flow by default rather than a separate operational settlement process.

## Known Gaps

- Browser download is not supported by the Codex in-app browser, so workbook verification in this pass was done through the shared report data/helper layer plus prior workbook route coverage.
- Server-generated PDF remains future scope.

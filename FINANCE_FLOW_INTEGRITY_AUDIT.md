# Finance Flow Integrity Audit

**Date:** May 26, 2026  
**Branch:** `feat/erp-v1`

## Scope

Focused audit and correction pass for service-charge behavior, phase finance consistency, and the buyer-demand billing flow.

## Audit Findings

### 1. Why every project looked like `5%`

The bad behavior came from more than one place:

1. Earlier schema defaults treated nullable service-charge fields as `0`, which made untouched phases look like explicit `0%` overrides.
2. Seed data was masking fallback behavior:
   - Relax Tower default = `5`
   - Madina Demo had also been seeded at `5`
   - Madina Garden had also been seeded at `5`
   - some seeded phases were written with explicit `5`
3. Company settings form submission dropped explicit `0%` because the browser form only posted truthy values.
4. Some views were reading the shared fallback correctly, while other finance/report surfaces were still drifting through older summary helpers.

### 2. Service charge workflow mismatch

The app had both:

- a correct billing concept: service charge inside `DemandBatch` / buyer demand
- and a conflicting operational concept: separate manual service-charge settlement

That settlement flow does not match the intended construction-company process.

Normal business flow should be:

`phase cost -> demand batch -> buyer demand -> buyer collection -> allocation -> service charge income reporting`

Not:

`phase cost -> separate service-charge settlement page`

### 3. Phase balance drift

`getProjectPhaseBalances()` was mixing two meanings:

- per-phase balance
- cumulative carry-forward

That made some list/report surfaces show cumulative carry-out where the user expected a real phase balance.

## Source of Truth Fields

- Project default service charge:
  - `Project.defaultServiceChargePct`
- Phase override:
  - `Phase.serviceChargePct`
- Company default:
  - `CompanySetting.key = defaultServiceChargePct`
- Persisted service-charge ledger:
  - `ServiceChargeEntry`
- Demand/billing service-charge fields:
  - `DemandBatch.serviceChargeEntryId`
  - `DemandBatch.serviceChargeAmount`
  - `Demand.serviceChargeAmount`

## Correct Effective Service Charge Rule

`phase override` if explicitly set  
else `project default`  
else `company default`  
else `0`

Important:

- `null` / `undefined` mean not set
- `0` means explicit `0%`

## Fixes Made

### 1. Project-specific percentage matrix is now real

Seed and helper verification now confirm:

- Relax Tower = `5%`
- Madina Demo Complete Project = `7.5%`
- Madina Demo `1st Slab` override = `3%`
- Madina Garden = `0%`

### 2. Shared fallback helper remains the only percentage resolver

Used through:

- `src/lib/service-charge.ts`
- `src/lib/project-finance.ts`
- `src/lib/project-cost-report.ts`
- `src/lib/complete-project-report.ts`
- demand-batch phase selection

### 3. Company settings now preserves explicit `0%`

Updated:

- `src/components/company/company-settings-form.tsx`

Explicit `0` is now submitted instead of being silently dropped.

### 4. Service charge settlement flow is deprecated operationally

Updated:

- `src/app/api/projects/[id]/service-charge/route.ts`
- `src/app/(app)/projects/[id]/finance/service-charge/page.tsx`
- `src/app/(app)/projects/[id]/reports/service-charge/page.tsx`
- export/report surfaces that consume the same ledger

Result:

- separate settlement is no longer the normal workflow
- `/projects/[id]/finance/service-charge` is now a summary/reporting page
- settlement API action returns a deprecation error
- legacy separate-settlement records remain visible for audit continuity

### 5. Demand/billing flow now carries service charge clearly

Updated:

- `src/app/(app)/projects/[id]/demands/batches/new/page.tsx`
- `src/components/projects/demand-batch-form.tsx`
- `src/app/(app)/projects/[id]/demands/batches/[batchId]/page.tsx`
- `src/app/(app)/projects/[id]/demands/batches/[batchId]/print/page.tsx`

Result:

- effective phase percent is shown from the shared fallback logic
- service charge stays inside the demand amount
- demand/bill screens show base portion, service-charge portion, and total

### 6. Phase balance vs carry-out is now separated

Updated:

- `src/lib/project-finance.ts`
- `src/app/(app)/projects/[id]/phases/page.tsx`
- `src/app/(app)/projects/[id]/reports/phase-summary/page.tsx`
- `src/app/(app)/projects/[id]/reports/complete-project/page.tsx`
- `src/app/api/projects/[id]/reports/complete-project/excel/route.ts`
- `src/lib/complete-project-report.ts`

Result:

- `balance` = true per-phase surplus/deficit
- `carryOut` = cumulative carry-forward only
- phase list uses phase balance again
- phase summary report uses phase balance again
- Top Sheet row balance remains historical `income - expense` and preserves Relax Tower totals

## Service Charge Report Behavior

The service charge report now shows:

- phase
- construction cost
- service charge %
- calculated amount
- billed in demand
- collected
- uncollected
- legacy separate settlement visibility if any

This is now a reporting/audit surface, not a daily operational settlement workflow.

## Other Conceptual Issues Found

### Fixed in this pass

1. Separate service-charge settlement being treated as normal workflow.
2. Project/company `0%` persistence gap in company settings.
3. Phase balance vs carry-forward overloading in shared summary helpers.
4. Seed matrix not exercising project-specific service-charge behavior.

### Deferred but documented

1. `ServiceChargeEntry` still exists as a persisted ledger because approved/calculated snapshots and legacy records already rely on it.
   - This is acceptable as long as it remains demand-linked or legacy-only.
2. `ADJUSTMENT` exists in unified reporting types, but there is still no dedicated end-user adjustment workflow.
   - Current reports support the concept; operational UI for adjustments is still limited.
3. Final reconciliation still has its own settlement/refund nuance for surplus credit lines.
   - That is separate from service charge and remains future refinement.

## Verification Summary

- `npx prisma validate` passed
- `npx prisma generate` passed
- `npm run build` passed
- `npm run db:seed` passed

Verified by helper/data checks:

- Relax Tower Piling uses `5%`
- Madina Demo normal phases use `7.5%`
- Madina Demo override phase uses `3%`
- Madina Garden uses `0%`
- demand batches include service-charge portions
- service-charge report/export surfaces use the same numbers
- phase list/report surfaces use real phase balance while finance carry-forward views still keep cumulative carry

Relax Tower totals preserved exactly:

- Income = `100,143,800`
- Expense = `104,659,890.40`
- Balance = `-4,516,090.40`

## Known Gaps

- Full authenticated browser automation was not available in this session, so the matrix was verified through the shared Prisma-backed helpers and build/seed output rather than end-to-end browser scripting.
- Service charge remains visible as a ledger/reporting concept because historical and approved snapshot rows already exist.
- Separate legacy service-charge settlement records are preserved, not deleted.
## 2026-05-27 Stabilization Note

- Dashboard, project overview, and project list wording now distinguish:
  - `Actual Construction Cost`
  - `Company Service Charge / Supervision Fee`
  - `Total Billable Cost`
  - `Project Balance = Total Collection - Total Billable Cost`
- Service charge reporting wording was corrected away from normal-flow `UNSETTLED` language toward billed/collected/uncollected flow language.
- Client-facing report cost references no longer fall back to raw internal IDs.

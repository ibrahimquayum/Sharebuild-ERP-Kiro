## Ownership Seed + Finance QA Phase

### Current Seed Status
- Relax Tower now seeds realistic ownership data while preserving the original Top Sheet totals:
  - Income: `100,143,800`
  - Expense: `104,659,890.40`
  - Balance: `-4,516,090.40`
- Seed now creates:
  - 54 apartment units
  - 50 project buyers
  - 56 ownership rows
  - several two-unit buyers
  - two co-owned unit scenarios for reconciliation testing
- Final reconciliation preview is no longer blocked by missing ownership in the seeded project.

### Current Seed Limitations
- Seeded buyers and ownership are realistic enough for reconciliation QA, but the baseline seed does not leave a posted reconciliation behind. After QA, the database is re-seeded back to a clean baseline.
- Sample document metadata/file rows are still skipped intentionally. Placeholder file records would make browser QA look healthier than it really is.
- Relax Tower seed currently produces a deficit scenario, so surplus refund-credit settlement is implemented in code but not exercised by default seed totals.

### Realistic Seed Design
- Residential stack:
  - 9 residential floors
  - 6 apartment units per floor
  - 54 total apartment units
- Unit numbering stays sortable and project-friendly.
- Ownership mix:
  - most units are single-owned
  - some buyers own multiple units
  - at least two units are co-owned
  - co-owner shares always total 100%
- Seed logic is idempotent and recreates project units/ownership cleanly without duplicating rows.

### QA Flow Executed
1. Seed realistic Relax Tower units and ownership.
2. Open service charge page in browser and confirm phase-wise 5% previews render.
3. Calculate service charge entries.
4. Approve service charge entries.
5. Settle one approved service charge entry to a company account.
6. Open final reconciliation preview and confirm buyer-by-buyer distribution appears.
7. Post final reconciliation successfully.
8. Confirm posted reconciliation shows generated demand count and posted lines.
9. Confirm generated final reconciliation demands appear in `/projects/[id]/demands`.
10. Re-seed the database to restore a clean baseline after QA.

### Service Charge Settlement Design
- Service charge remains company income, not project material or labour cost.
- Settlement status now supports practical operator states:
  - `UNSETTLED`
  - `INCLUDED_IN_DEMAND`
  - `SETTLED`
- Separate settlement records:
  - receiving account
  - payment method
  - reference
  - settled timestamp
  - audit log
- Included-in-demand service charge is explicitly marked so it is not settled twice.

### Refund / Credit Settlement Design
- Posted surplus reconciliation lines support durable settlement outcomes:
  - `OPEN_CREDIT`
  - `KEPT_AS_ADVANCE`
  - `REFUNDED`
  - `ADJUSTED`
- Refunded surplus credit can create treasury outflow metadata against an account and payment method.
- Relax Tower seed does not naturally hit this path because the seeded project finishes in deficit, not surplus.

### Route Smoke Results
- Authenticated browser smoke passed for:
  - `/dashboard`
  - `/projects`
  - `/projects/project-relax-tower`
  - `/projects/project-relax-tower/finance`
  - `/projects/project-relax-tower/units`
  - `/projects/project-relax-tower/buyers`
  - `/projects/project-relax-tower/finance/service-charge`
  - `/projects/project-relax-tower/finance/final-reconciliation`
  - `/projects/project-relax-tower/finance/cash-bank`
  - `/projects/project-relax-tower/finance/cheques`
  - `/projects/project-relax-tower/collections/new`
  - `/projects/project-relax-tower/expenses/new`
  - `/projects/project-relax-tower/expenses/bulk`
  - `/projects/project-relax-tower/payables/new`
  - `/projects/project-relax-tower/reports/top-sheet`
  - `/projects/project-relax-tower/reports/service-charge`
  - `/projects/project-relax-tower/reports/final-reconciliation`
  - `/projects/project-relax-tower/reports/cash-bank-book`
  - `/projects/project-relax-tower/reports/cheque-register`
  - `/projects/project-relax-tower/reports/tax-deductions`
  - `/projects/project-relax-tower/reports/retention`
  - `/company/settings`
  - `/company/accounts`
  - `/company/cheques`
  - `/company/suppliers`
  - `/company/subcontractors`

### Known Risks
- Service charge affects final deficit math, so finance hub, service charge report, final reconciliation, and Top Sheet support pages must continue to use the same helper formulas.
- Surplus credit/refund settlement is present but still needs a seed or fixture scenario that exercises it automatically.
- Reconciliation posting is now traceable in the demand list, but collection-against-final-demand still depends on the existing collection allocation workflow rather than a special reconciliation collector UI.

### Implementation Checklist
- [x] Inspect current service charge and reconciliation settlement support
- [x] Add one clean migration only if settlement metadata is still missing
- [x] Seed 54 units and realistic ownership rows without changing Excel totals
- [x] Add service charge settlement behavior and status visibility
- [x] Add surplus credit / refund settlement behavior and status visibility
- [x] Update finance hub, buyer ledger, and reports for consistent formulas
- [x] Run build, seed, and authenticated browser / route QA
- [x] Update finance completion and manual QA documentation

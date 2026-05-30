# Requirements Document

## Introduction

This spec defines a tightly scoped production-readiness pass for the Kiro build of Sharebuild ERP, a project-first construction/land-share ERP (Next.js 14 App Router + RSC, Prisma 5, NextAuth, Tailwind, Radix UI). The currently implemented code is the source of truth.

The goal is to fix a small number of concrete production-quality issues without redesigning the system:

1. Sidebar/layout consistency — eliminate duplicate sidebars and the one route that renders with no sidebar.
2. Service charge wording — present service charge as billed / collected / uncollected and remove the deprecated "calculate/approve ledger" and "separate settlement" language.
3. Financial labels and currency formatting consistency — make currency rendering and financial wording internally consistent and clear.
4. Complete Project Report display quality — remove mojibake/broken Bangla, avoid raw internal IDs in the user-facing report, and improve print/PDF readability.
5. Final verification — confirm the build succeeds, the seed runs, and Relax Tower historical totals are unchanged.

This is a polish/cleanup pass. It must not change accounting aggregation logic, the service charge effective-percent hierarchy, the Prisma schema, or the seeded Relax Tower totals. Existing working routes and UI must keep working (backward compatibility).

A separate spec at `.kiro/specs/project-workspace-refactor/` is partially stale and is loose reference only. It must not be followed literally (it proposes Money/Vendors navigation and "new" routes that already exist as Setup/Finance/Work groups).

## Glossary

- **System**: The Sharebuild ERP application (Next.js App Router web application).
- **Global_Shell**: The application-level layout `AppShell` (`src/components/layout/app-shell.tsx`) wrapping non-project routes with the global `Sidebar` (`src/components/layout/sidebar.tsx`).
- **Project_Workspace_Shell**: The project layout `src/app/(app)/projects/[id]/layout.tsx` rendering `ProjectWorkspaceSidebar` + `ProjectWorkspaceHeader`.
- **Global_Phase_Route**: The route `src/app/(app)/phases/[id]/page.tsx`, a phase detail page that lives under the `(app)` group but outside the project workspace layout.
- **Sidebar**: Any primary left navigation (`Sidebar` or `ProjectWorkspaceSidebar`).
- **Currency_Formatter**: The currency formatting helpers in `src/lib/utils.ts` (`formatBDT`, `formatBDTCompact`).
- **Service_Charge_Component**: `src/components/projects/service-charge-actions.tsx`.
- **Effective_Percent_Resolver**: `getEffectiveServiceChargePercent` in `src/lib/service-charge.ts`, resolving phase override → project default → company default → 0.
- **Service_Charge_Ledger**: The service charge data produced in `src/lib/project-finance.ts` exposing per-phase `billedAmount`, `collectedAmount`, `uncollectedAmount`.
- **Complete_Project_Report**: The report data builder `src/lib/complete-project-report.ts` and its print view `src/components/reports/complete-project-print-document.tsx`.
- **Display_Text_Normalizer**: `normalizeDisplayText` in `src/lib/utils.ts`, a heuristic that attempts to repair mojibake text.
- **Internal_ID**: A database identifier such as a cuid that is not meaningful to end users.
- **Top_Sheet_Totals**: Relax Tower seeded historical totals anchored in `prisma/seed.ts`: Income 100,143,800; Expense 104,659,890.40; Balance -4,516,090.40.
- **Accounting_Aggregation**: The core cost/income aggregation logic in `src/lib/project-finance.ts`, `src/lib/project-cost-report.ts`, and `src/lib/accounting`.

## Constraints (Hard Guardrails)

These constraints apply to every requirement in this document.

1. THE System SHALL preserve Top_Sheet_Totals (Income 100,143,800; Expense 104,659,890.40; Balance -4,516,090.40) with a tolerance of ±1.00 for each total.
2. THE System SHALL keep `prisma/seed.ts` seed totals unchanged.
3. THE System SHALL preserve the Effective_Percent_Resolver hierarchy (phase override → project default → company default → 0) without modification.
4. THE System SHALL keep supplier bill items as project cost rows.
5. THE System SHALL keep supplier payments excluded from project cost rows.
6. THE System SHALL keep subcontractor payments excluded from project cost rows.
7. WHERE a change appears to require a Prisma schema change, THE System SHALL stop and request explicit confirmation before proceeding.
8. WHERE a change appears to require modifying Accounting_Aggregation, THE System SHALL stop and request explicit confirmation before proceeding.
9. THE System SHALL preserve existing working routes and UI behavior (backward compatibility).
10. WHEN `next build` is run, THE System SHALL complete with zero TypeScript errors.

## Requirements

### Requirement 1: Sidebar and Layout Consistency

**User Story:** As an ERP user, I want exactly one correct sidebar on every page, so that navigation is consistent and no page appears broken or sidebar-less.

This requirement maps to implementation task 1 (sidebar/layout duplication and missing-sidebar fix).

#### Acceptance Criteria

1. WHEN a user views any route under the `(app)` group, THE System SHALL render exactly one Sidebar.
2. WHEN a user views the Global_Phase_Route, THE System SHALL render exactly one Sidebar rather than no Sidebar.
3. WHILE a user is on a project workspace route matching `/projects/{id}` or `/projects/{id}/...`, THE System SHALL render the Project_Workspace_Shell Sidebar and SHALL NOT render the Global_Shell Sidebar.
4. WHILE a user is on a non-project route (for example `/dashboard`, `/projects`, `/company/...`), THE System SHALL render the Global_Shell Sidebar.
5. IF a route does not match the project workspace shell, THEN THE System SHALL render the Global_Shell Sidebar so that no route is left without a Sidebar.
6. THE System SHALL preserve all existing navigation links and route targets present before this change.

### Requirement 2: Service Charge Wording Cleanup

**User Story:** As a finance user, I want service charge presented as billed, collected, and uncollected, so that I understand it as part of buyer billing and not as a separate settlement workflow.

This requirement maps to implementation task 2 (service charge wording cleanup).

#### Acceptance Criteria

1. THE Service_Charge_Component SHALL present service charge using the wording billed, collected, and uncollected.
2. THE Service_Charge_Component SHALL state that service charge is included in buyer demand/billing.
3. THE Service_Charge_Component SHALL NOT present a Calculate/Approve ledger workflow as the way to produce official finance totals.
4. THE Service_Charge_Component SHALL NOT reference a "separate settlement" or "operational settlement" workflow.
5. WHEN service charge amounts are displayed, THE Service_Charge_Component SHALL source billed, collected, and uncollected values from the Service_Charge_Ledger fields `billedAmount`, `collectedAmount`, and `uncollectedAmount`.
6. THE System SHALL preserve the Effective_Percent_Resolver hierarchy (phase override → project default → company default → 0) unchanged.
7. THE System SHALL NOT introduce a new service charge settlement workflow.

### Requirement 3: Financial Labels and Currency Formatting Consistency

**User Story:** As a finance user, I want consistent currency formatting and financial wording across overview and reports, so that figures are clear and unambiguous.

This requirement maps to implementation task 3 (financial labels and currency formatting consistency).

#### Acceptance Criteria

1. WHEN a monetary value is displayed in overview or reports, THE System SHALL format it through the Currency_Formatter rather than ad hoc inline formatting.
2. THE Currency_Formatter SHALL apply one consistent currency prefix and one consistent grouping/decimal style across all monetary values.
3. THE System SHALL use consistent financial wording for the same concept across overview and reports (for example, the same term for collected income and the same term for project balance).
4. FOR ALL monetary values formatted by the Currency_Formatter, formatting the same numeric input SHALL produce the same output string (deterministic formatting).
5. THE System SHALL keep Accounting_Aggregation results numerically unchanged while adjusting labels and formatting.

### Requirement 4: Complete Project Report Display Quality

**User Story:** As a manager presenting the Complete Project Report, I want clean text, no raw internal identifiers, and readable print output, so that the report is presentable to clients and stakeholders.

This requirement maps to implementation task 4 (Complete Project Report cleanup).

#### Acceptance Criteria

1. WHEN the Complete_Project_Report is rendered for print or PDF, THE System SHALL display project, buyer, supplier, and phase text without mojibake or broken Bangla characters where the underlying source data is valid.
2. THE Complete_Project_Report SHALL NOT display Internal_ID values (such as cuids) in user-facing report content.
3. WHERE a row currently relies on the fragile Display_Text_Normalizer heuristic, THE System SHALL present readable text and SHALL avoid showing replacement/placeholder characters to the user.
4. WHEN the Complete_Project_Report is printed, THE System SHALL produce readable layout (legible column widths, consistent monetary alignment, and page breaks that do not split a row across pages where avoidable).
5. THE System SHALL keep all report monetary totals numerically unchanged from the current implementation.
6. THE Complete_Project_Report SHALL continue to describe service charge as billed through buyer demand and collected through normal buyer collection.

### Requirement 5: Final Verification

**User Story:** As a release owner, I want a final verification that the build, seed, and historical totals are intact, so that I can ship this pass with confidence.

This requirement maps to implementation task 5 (final verification).

#### Acceptance Criteria

1. WHEN `next build` is run after all changes, THE System SHALL complete with zero TypeScript errors.
2. WHEN the seed is run after all changes, THE System SHALL complete without error and SHALL produce Relax Tower Top_Sheet_Totals (Income 100,143,800; Expense 104,659,890.40; Balance -4,516,090.40) within a tolerance of ±1.00 per total.
3. WHEN the Complete_Project_Report totals are reviewed after all changes, THE System SHALL report the same monetary totals as before this pass (within ±1.00 per total).
4. IF any verification step fails, THEN THE System SHALL report the failing step and the observed value before the pass is considered complete.

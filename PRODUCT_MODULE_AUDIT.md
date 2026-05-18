# Product Module Audit - Sharebuild ERP

**Date:** May 18, 2026  
**Branch:** `feat/erp-v1`  
**Audit basis:** Current local code after `cbd88b7 fix: stabilize project create and settings save`.

## Summary

Sharebuild ERP has a real project-first foundation: project workspace routing exists, company setup exists, Relax Tower seed totals are protected, and most daily work routes now live under `/projects/[id]`. The product is not yet complete enough for external audit-grade operations because several modules are foundations rather than full workflows: report exports, material/category/payment method masters, advanced payment allocation, dynamic permissions, local shop purchasing, and separated subcontractor accounting still need deeper implementation.

Current highest-risk gaps are save-flow consistency, document upload completeness, ownership validation, demand allocation math, company logo upload, and bulk unit generation. These can be improved without changing schema.

## Module Findings

| # | Module | Current status | What works | Broken / UI-only / missing | Files and routes | Priority |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Company Settings / Branding | Partial real backend | `/company/settings` saves `Company` and `CompanySetting`; report branding reads tenant company | Logo is URL/path only; no upload/preview/remove pipeline; audit failure can make save look failed; registration/TIN fields not surfaced | `src/app/(app)/company/settings/page.tsx`, `src/app/api/company/settings/route.ts`, `src/components/company/company-settings-form.tsx`, `src/lib/branding.ts` | P0 |
| 2 | Users & Roles | Foundation | `/company/users` creates users and code-level roles exist | No dynamic permission editor; project assignment UI is basic; no approval limits | `src/app/(app)/company/users/page.tsx`, `src/app/api/company/users/route.ts`, `src/lib/permissions.ts` | P2 |
| 3 | Contacts / Buyers Master | Real master data | `/company/contacts` and buyer APIs persist `Buyer`; detail shows project membership | No advanced duplicate detection; global identity is not a full CRM | `src/app/(app)/company/contacts/*`, `src/app/api/buyers/*` | P2 |
| 4 | Project Setup | Real backend | `/projects/new`, `/projects/[id]/settings`, and `/projects/[id]/edit` save project profile under company | Land/building is mostly project fields; no dedicated `Land` editor despite schema | `src/app/(app)/projects/new/page.tsx`, `src/app/api/projects/*`, `src/components/projects/project-form.tsx` | P1 |
| 5 | Units & Ownership | Real but incomplete | Units list/create/edit/detail persist; `UnitBuyer` represents co-ownership and payer flag | No bulk unit generation; no ownership total validation yet; linked parking is not modeled | `src/app/(app)/projects/[id]/units/*`, `src/app/api/projects/[id]/units/*`, `src/components/projects/unit-form.tsx` | P0 |
| 6 | Project Buyers | Real project-scoped relation | `/projects/[id]/buyers` assigns contacts to units and creates `ProjectBuyer` | Assignment is one buyer/unit at a time; no batch co-owner UI; share total can exceed 100 before validation fix | `src/app/(app)/projects/[id]/buyers/*`, `src/app/api/projects/[id]/buyers/route.ts`, `src/components/projects/ownership-form.tsx` | P0 |
| 7 | Buyer Documents | Real document relation | Documents can link to buyer and show from buyer detail | Upload is single-file only; category list is generic; verification workflow is basic | `src/app/(app)/projects/[id]/documents/*`, `src/app/api/documents/route.ts` | P1 |
| 8 | Project Documents | Real document relation | Project document library, search/filter/sort metadata, upload route | Single-file upload only; no bulk category assignment; no verification assignment workflow | `src/app/(app)/projects/[id]/documents/page.tsx`, `src/components/projects/document-upload-form.tsx` | P1 |
| 9 | Phase Documents | Real relation in schema | Document can link to phase | No phase page document panel beyond project document library | `Document.phaseId`, `/projects/[id]/documents/upload` | P2 |
| 10 | Expense / Voucher Documents | Real relation in schema | Expense upload route exists and `Document.expenseId` exists | Bulk expense vouchers are not implemented; approval context is limited | `src/app/(app)/expenses/[id]/upload/page.tsx`, `src/app/api/documents/route.ts` | P2 |
| 11 | Supplier Bill Documents | Real relation in schema | `Document.payableId` can link supplier bill/payable | No dedicated bill document panel; subcontractor bill uses same payable internals | `Document.payableId`, `src/app/api/documents/route.ts` | P2 |
| 12 | Subcontractor Bill Documents | Partial via supplier payable | Scope enum includes subcontractor bill | No dedicated subcontractor bill document relation/table; uses payable semantics | `DocumentScope.SUBCONTRACTOR_BILL`, `SupplierPayable` | P2 |
| 13 | Phases | Real and project-scoped | Project phase list and board exist; legacy route warns | Phase progress/document/deep costing is not complete | `src/app/(app)/projects/[id]/phases/*`, `src/app/api/phases/*` | P2 |
| 14 | Demands & Due | Partial real backend | Demand records can be created for selected ownership rows | Amount currently applied per allocation row, not clearly per-unit/share; carry-forward/final reconciliation is not complete | `src/app/(app)/projects/[id]/demands/*`, `src/app/api/projects/[id]/demands/route.ts`, `src/components/projects/demand-form.tsx` | P0 |
| 15 | Collections | Existing real project finance | Project-scoped collections pages exist and seed totals are accurate | Demand allocation/reversal and approval workflow are not mature | `src/app/(app)/projects/[id]/collections/*`, `src/app/api/collections/route.ts` | P2 |
| 16 | Expenses | Existing real project finance | Project-scoped expenses and approvals exist; seed totals are accurate | Bulk expense entry is not complete; voucher/document workflow is basic | `src/app/(app)/projects/[id]/expenses/*`, `src/app/api/expenses/*` | P2 |
| 17 | Suppliers | Real master data | `/company/suppliers` persists `Supplier` | Material-type UX is basic; no formal supplier ledger engine yet | `src/app/(app)/company/suppliers/*`, `src/app/api/suppliers/*` | P2 |
| 18 | Supplier Bills / Payments | Partial real backend | Project payables and payments persist with `SupplierPayable` and `SupplierPayment` | Bill line items are in schema but not used in create UI; no local shop support | `src/app/(app)/projects/[id]/payables/*`, `src/app/api/suppliers/payables/*` | P1 |
| 19 | Local Shop / Emergency Purchases | Missing | Cash/no-supplier expense can be represented loosely by expenses | No one-time vendor/shop fields or "save as supplier" flow | Expenses and supplier payable routes | P2 |
| 20 | Subcontractors | Partial via supplier model | `/company/subcontractors` and project subcontractor pages filter supplier/vendor type | No dedicated subcontractor model; semantics rely on `SupplierType.LABOUR_CONTRACTOR` | `src/app/(app)/company/subcontractors/page.tsx`, `src/app/(app)/projects/[id]/subcontractors/*` | P2 |
| 21 | Subcontractor Bills / Payments | Partial via payable model | Project subcontractor bill pages exist | Payments are not fully separated from supplier payments; measurement sheets/contract progress are not first-class | `src/app/(app)/projects/[id]/subcontractors/bills/*`, `SupplierPayable` | P2 |
| 22 | Project Finance Hub | Foundation | `/projects/[id]/finance` groups money work and shows summary metrics | Missing voucher/pending approval counts depend on available data; no cash/bank ledger | `src/app/(app)/projects/[id]/finance/page.tsx`, `src/lib/project-finance.ts` | P1 |
| 23 | Reports | Foundation | Separate `/projects/[id]/reports` and report pages exist; Top Sheet remains accurate | Most reports are print-ready shells, not complete calculation engines | `src/app/(app)/projects/[id]/reports/*`, `src/components/projects/report-foundation-page.tsx` | P1 |
| 24 | PDF / Excel / Print Export | Print only | Print button exists and export buttons are disabled honestly | No real PDF or Excel endpoints; exports must not be claimed complete | `src/components/shared/report-actions.tsx` | P1 |
| 25 | Audit Logs | Real table, inconsistent use | Project audit page reads `AuditLog`; several APIs write audit entries | Some flows write audit inline, so audit failure can falsely fail save; no full audit report filtering | `src/app/(app)/projects/[id]/audit/page.tsx`, route handlers | P0 |
| 26 | Permissions | Code-level foundation | `src/lib/permissions.ts` defines roles/actions/modules and some APIs guard writes | Menus and routes are not fully permission-aware; no DB permission editor | `src/lib/permissions.ts`, API route guards | P1 |
| 27 | Menus / Navigation | Mostly corrected | Global sidebar is company/admin; project sidebar groups daily work | Project sidebar still has some direct Work supplier/subcontractor links; acceptable but could become noisy | `src/components/layout/sidebar.tsx`, `src/components/layout/project-workspace-sidebar.tsx` | P1 |
| 28 | Legacy Routes | Kept as fallback | Legacy pages exist and should show guidance | Must be manually checked for warning coverage | `src/app/(app)/phases`, `collections`, `expenses`, `buyers` | P2 |
| 29 | Seed / Relax Tower Data | Verified in previous commit | Seed totals target Income 100,143,800 / Expense 104,659,890.40 / Balance -4,516,090.40 | Any migration or finance change must preserve these totals | `prisma/seed.ts`, `src/app/api/reports/top-sheet/route.ts` | P0 |
| 30 | Overall UX Consistency | Improved foundation | Shared headers/cards/forms/tables are used across new pages | Some pages still use older compact layouts; no full design-system hardening pass | `src/components/shared/*`, app routes | P2 |

## Recommended Fix Priority

1. Stabilize save responses and audit logging so successful database writes cannot show false failure.
2. Add real company logo upload/preview/remove using existing `Company.logoUrl`.
3. Add bulk unit generation using existing `Unit` model.
4. Enforce ownership share validation per unit.
5. Adjust demand creation to calculate per-unit demand by ownership share.
6. Support multi-file document upload and safe audit logging.
7. Keep PDF/Excel exports disabled until real endpoints exist.
8. Document remaining schema gaps instead of faking persistence.

## Corrections Applied After Audit

- Company settings save now uses a consistent success response and best-effort audit logging.
- Company logo upload, preview, and removal now persist through existing `Company.logoUrl`.
- Common create/update flows now avoid false failures caused by audit-log errors.
- Project units now support bulk generation through existing `Unit` persistence.
- Buyer/unit assignment now validates ownership share so owner/co-owner rows cannot exceed 100% for a unit.
- Demand creation now treats the entered amount as a per-unit demand and splits it by ownership share.
- Document upload now supports multiple files in one submission and saves every document record.
- No new Prisma migration was required for these corrections.

## Schema Recommendation

No schema change is required for the immediate stabilization pass. Current schema can support logo path storage, bulk unit creation, ownership validation, demand share-splitting, and multi-file document persistence. Future phases should consider dedicated tables for material masters, payment methods, dynamic permissions, local shops, subcontractor bills, and report export jobs.

# Product Finishing Plan

Date: 2026-05-18  
Branch: `feat/erp-v1`

## Current State Summary

Sharebuild ERP has the project-first foundation, accounting hardening, reversal pages, report shells, CSV exports, document upload, units, ownership, bulk expenses, demands, collections, and supplier payable foundations in place. The remaining finishing work is mostly about turning backend-ready modules into complete, consistent UX and removing places where supplier, subcontractor, document, and report behavior still feels unfinished.

No schema change is planned for this pass. Existing `Supplier`, `SupplierPayable`, `SupplierPayment`, `SupplierBillItem`, and `Document` models can support the highest-priority separation and upload flows.

## Module Completion Matrix

| Module | Current Status | Missing UI / Backend | Permission / Report Gaps | Fix In This Pass | Priority |
| --- | --- | --- | --- | --- | --- |
| Company Profile / Branding | Saves tenant profile and branding fields. Reports use tenant header components. | Logo removal and deeper receipt/PDF integration remain partial. | Dynamic permission editing is still code-level. | Document remaining gaps only. | Medium |
| Users & Roles | Company users page and central permission config exist. | Dynamic role editor is not complete. | DB-backed permission matrix not built. | Keep code-level foundation documented. | Medium |
| Contacts / Buyers | Master contacts and project buyer pages exist. | Some advanced payer override UX remains future. | Export and detailed permission hiding incomplete. | Document gap. | Medium |
| Project Setup | Project create/edit/settings exist and save. | Land/building split can be richer later. | Audit best-effort only. | Keep stable. | High |
| Units & Ownership | Unit list/create/detail and ownership foundation exist. | Advanced parking link and bulk preview can improve. | Reports by unit still basic. | Document gap. | Medium |
| Documents | Project-scoped multi-upload exists with scope/category/sort/filter. | Upload page did not prefill payable/expense scope from query. Metadata edit/detail remains basic. | Verification workflow is partial. | Add query-prefill support for payable/expense upload links. | High |
| Expenses / Bulk Expenses | Bulk expense API and voucher upload exist. | Bulk table stores bill number but did not expose the field consistently. | Approval workflow partial beyond status. | Add visible bill/voucher number field in bulk rows. | High |
| Supplier Bills / Payments | Supplier bills, line items, detail, payment list, reversal foundations exist. | Supplier list still included subcontractor payables. Invoice upload is through document upload, not same form. | Supplier ledger export remains basic. | Filter supplier payables/payments to material/vendor types and add document upload link from detail. | Critical |
| Subcontractor Bills / Payments | Backing data exists through supplier payable types. List exists. | New subcontractor bill page was placeholder and overview said Coming Next. | Ledger/export still basic; dedicated schema is future. | Build real subcontractor bill form, clean labels, add list/detail links, separate payment view. | Critical |
| Finance Hub | Project finance hub exists with accounting summaries. | Some deep drilldowns still route to shared payables detail. | Export/audit permissions basic. | Keep stable. | High |
| Reports / Exports | Branded report layout, complete project report, Top Sheet CSV export exist. | Server PDF is not built; browser print is supported. Some exports remain disabled/CSV. | Export permission is code-level. | Document status honestly. | High |
| Menus / Navigation | Project-first and company setup menus exist. | Some legacy/admin fallback routes remain directly accessible. | Role-specific menu hiding is basic. | Keep stable; no redesign in this pass. | Medium |
| Legacy Routes | Legacy routes have warnings or remain fallback. | Full admin-only gating is not complete. | Permission guard can be stricter later. | Document gap. | Low |

## Exact Fix Tasks

1. Replace the subcontractor bill placeholder route with a real form backed by `SupplierPayable`.
2. Keep subcontractor UX separate by filtering supplier bill/payment pages away from `LABOUR_CONTRACTOR` and `SERVICE_PROVIDER`.
3. Improve subcontractor bill list/overview with action links and remove “Coming Next” workaround language.
4. Add direct document upload support for bill-linked documents by passing `payableId` and `scope` through the document upload form.
5. Add a visible bill/invoice/voucher number field to bulk expense rows.
6. Update documentation to mark what is complete, partial, and intentionally deferred.
7. Run Prisma generate, build, and seed. Commit and push only after all pass.

## Known Remaining Gaps After This Pass

- Dedicated subcontractor accounting tables remain future work; current storage uses `Supplier`/`SupplierPayable` with contractor/service supplier types.
- Same-form bill invoice upload is not implemented; users attach invoices from the bill detail via the project document uploader.
- Server-generated PDF exports are not implemented; reports are print/PDF-ready through browser print and CSV exports exist where implemented.
- Dynamic permission management remains a future DB-backed module; current permissions are centralized in code.

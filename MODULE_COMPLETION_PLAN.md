# Module Completion Plan - Sharebuild ERP

**Date:** May 18, 2026  
**Branch:** `feat/erp-v1`

## Product Direction

Sharebuild remains the SaaS/platform identity. Tenant company branding belongs on operational documents, reports, receipts, statements, print views, and future exports. Daily work stays inside the project workspace; company pages stay master/admin focused.

## Module Plan

| Module | Current status | Works / saves to DB | Broken / UI-only / missing | Exact implementation tasks | Priority |
| --- | --- | --- | --- | --- | --- |
| Bulk expense / field engineer flow | Missing dedicated bulk route | Single expense create saves `Expense`; approvals exist | No bulk rows, no local shop fields, no row voucher upload, no payment method on expense | Add one clean migration for expense payment/local shop metadata; add `/projects/[id]/expenses/bulk`; add `POST /api/projects/[id]/expenses/bulk`; transaction-create rows; optional voucher documents; link from expenses/finance | P0 |
| Unit generation / ownership | Real foundation | Units and ownership save; bulk generation exists | No preview table; co-owner UI is one row at a time; no parking link model | Add preview in bulk unit form; preserve duplicate rejection; document parking-link schema gap; keep ownership validation | P1 |
| Demand to collection allocation | Partial | Demand create saves; collections save | Collection does not allocate FIFO or update demand statuses | Add demand GET endpoint; update collection API to FIFO allocate unpaid demands and update status; show unpaid demand summary in collection form | P0 |
| Supplier / local shop flow | Partial | Supplier bills/payments persist; `SupplierBillItem` schema exists | Supplier bill UI does not create line items; local shop is not first-class | Add line items to supplier bill API/UI; keep local shop as expense metadata, not supplier bill fake | P1 |
| Subcontractor flow | Partial via supplier/payable | Subcontractor pages use labour-contractor suppliers | Dedicated subcontractor accounting table missing; payment UI shares payable internals | Keep separate UX labels; document schema gap; avoid mixing supplier language in docs | P2 |
| Documents | Real foundation | Multi-upload documents save; scopes and links exist | No document panels on every detail surface; no verification action UI | Add voucher creation from bulk expenses; document remaining panel gaps | P1 |
| Project finance hub | Foundation | Summary and links work | Missing cash/bank movement; carry-forward is conceptual | Add bulk expense link and ensure missing voucher/pending approval counts surface | P1 |
| Reports / exports | Foundation | Branded print pages and Top Sheet work | PDF/Excel disabled; most reports are shells | Keep disabled honestly; document export as next step | P2 |
| Permissions | Code-level foundation | Central `can()` matrix and some API guards | Menus not fully permission-aware; no DB editor | Add guards to new bulk expense API; document dynamic permission gap | P1 |
| UI consistency | Improved | Shared cards/forms/stat components | Some old pages remain compact/legacy | Use existing card/form/table patterns for new work; avoid redesign | P2 |
| Save/error handling | Improved | Audit best-effort helper exists | Some flows still need better response parsing | Use best-effort audit in new APIs; return useful validation messages | P0 |

## This Pass

1. Implement bulk expense entry with local shop metadata and vouchers.
2. Implement FIFO collection allocation against unpaid demands.
3. Implement supplier bill line-item creation.
4. Improve bulk unit generation with a preview.
5. Update documentation and verification.

## Deferred Intentionally

- SaaS billing/onboarding.
- Buyer portal.
- SMS/WhatsApp/mobile app.
- Full inventory reconciliation.
- Dedicated subcontractor accounting tables.
- Dynamic database-backed permission editor.
- Real PDF/Excel export endpoints.

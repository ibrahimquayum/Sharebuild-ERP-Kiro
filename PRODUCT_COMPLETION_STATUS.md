# Product Completion Status - Sharebuild ERP

**Branch:** `feat/erp-v1`  
**Scope:** Core project-first ERP foundation

## Product Rules Preserved

- Sharebuild is the SaaS/platform brand.
- Tenant company branding is separate and appears in report foundations.
- Daily work lives inside the project workspace.
- Company setup is for master/admin data.
- Buyer, unit, document, finance, report, and audit views are project-scoped where daily work happens.

## Completed Foundation

### Product Audit

- `PRODUCT_MODULE_AUDIT.md` now records the current state of 30 product modules, including real persistence, UI-only areas, missing schema pieces, report/export gaps, and fix priority.

### Project Save Stability

- `/projects/new` create API now returns useful validation/server errors.
- `/projects/[id]/settings` update API now returns useful validation/server errors.
- Project save no longer depends on audit log success; audit failures are logged without rolling back the project.

### Menu And UX

- Global sidebar is company/admin focused.
- Project workspace sidebar is grouped by workflow:
  - Overview
  - Setup
  - Finance
  - Work
  - Documents
  - Reports
  - Audit
  - Settings

### Units And Ownership

- Unit list, create, and detail/edit pages exist.
- Bulk unit generation now persists units through `POST /api/projects/[id]/units/bulk`.
- Bulk unit generation now includes a client-side preview before save and still rejects duplicates on the server.
- Buyer/unit assignment persists through `ProjectBuyer` and `UnitBuyer`.
- Ownership share, co-owner rows, payer flag, and relationship metadata are stored.
- Ownership share validation prevents owner/co-owner rows for one unit from exceeding 100%.
- Buyer financials are shown in project context only.

### Documents

- Document scope/category/title/sort/status fields exist.
- Documents can link to project, buyer, unit, phase, expense, and supplier/subcontractor bill records.
- Project document library and upload page exist.
- Upload now accepts multiple files in one submission and saves each file to local storage and the database.

### Finance

- Project finance overview exists.
- Collections, expenses, supplier bills, supplier payments, subcontractor bills, subcontractor payment links, demands, due, and project balance are organized from the project finance area.
- Bulk expense entry exists at `/projects/[id]/expenses/bulk` with local shop/cash expense support, payment method, missing voucher indicators, and optional voucher upload per row.
- Collection creation now allocates buyer payments FIFO against unpaid project/phase demands and updates demand status.
- Supplier bill creation supports line items using existing `SupplierBillItem` persistence.

### Reports

- Reports are separate from Finance.
- Top Sheet remains live and accurate.
- Other report pages have branded print-ready foundations.
- PDF/Excel buttons are disabled until real export endpoints are implemented.

### Branding

- Company Settings stores tenant branding and report footer note.
- Company Settings supports local logo upload, logo preview, logo removal, registration/trade license, and TIN/VAT fields.
- Project report header displays tenant/company identity.
- Sharebuild remains the system/platform identity.

### Permissions

- Central code-level permission matrix exists.
- New product APIs apply basic permission guards.
- Future dynamic permission editing remains a schema/UI gap.

### Save Stability

- Common create/update flows use best-effort audit logging, so a failed audit entry does not turn a successful business save into a false UI failure.
- Company settings returns a consistent success envelope and clearer validation/server messages.
- Demand creation calculates demand from a per-unit amount and splits by ownership share.

## Known Incomplete Areas

- Real PDF export.
- Real Excel export.
- Full buyer statement/unit statement/ledger report calculations.
- Demand payment allocation and reversal workflow.
- Manual collection allocation and reversal workflow.
- Dedicated subcontractor bill/payment model beyond supplier payable filtering.
- Editable materials/categories/payment-method master tables.
- Cloud object storage for uploads.
- Dynamic database-backed permissions.
- Dedicated local shop / one-time vendor purchase flow.
- Local shop flow is implemented for expenses, but not yet for supplier payable bills.
- Full carry-forward/final reconciliation accounting.

## Next Safest Build Step

Build the accountant-facing reversal/adjustment UI and expand supplier/subcontractor ledgers before real PDF/Excel exports, buyer portals, SaaS billing, SMS/WhatsApp, or mobile apps.

## Accounting Hardening Added

- Durable collection allocation ledger exists through `CollectionAllocation`.
- FIFO and single-demand collection allocation now write allocation rows in addition to the compatibility `Collection.demandId`.
- API-level manual allocation is supported for collection create when callers pass allocation rows.
- Demand paid/due calculations now prefer allocation rows and fall back to legacy collection links.
- Collection and expense reversal APIs preserve the original record and store reversal reason, user, and timestamp.
- Phase audit-lock fields and API foundation exist.
- Locked phases block project accounting writes in demand, collection, expense, bulk expense, supplier bill, and supplier payment routes.
- Project finance now separates:
  - total demanded
  - total collected
  - buyer receivable
  - buyer advance
  - approved expense
  - pending expense
  - supplier payable
  - subcontractor payable
  - phase carry-forward
- Top Sheet and finance totals exclude reversed records and keep Relax Tower seed totals exact.
- Supplier bill line totals must match the bill total.
- Supplier payments capture cheque/payment status metadata.

## Accounting Gaps Remaining

- Full reversal/adjustment UI is still pending.
- Supplier/subcontractor payment reversal endpoints and UI remain pending.
- Dedicated subcontractor accounting tables remain a future schema improvement.
- Final project reconciliation is still a documented next step.
- Real PDF/Excel exports remain disabled foundations.

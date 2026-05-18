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

Implement real reporting/export endpoints and finish demand-to-collection allocation before adding buyer portals, SaaS billing, SMS/WhatsApp, mobile apps, or advanced accounting.

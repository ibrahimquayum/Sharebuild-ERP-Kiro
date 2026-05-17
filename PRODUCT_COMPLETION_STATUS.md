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
- Buyer/unit assignment persists through `ProjectBuyer` and `UnitBuyer`.
- Ownership share, co-owner rows, payer flag, and relationship metadata are stored.
- Buyer financials are shown in project context only.

### Documents

- Document scope/category/title/sort/status fields exist.
- Documents can link to project, buyer, unit, phase, expense, and supplier/subcontractor bill records.
- Project document library and upload page exist.

### Finance

- Project finance overview exists.
- Collections, expenses, supplier bills, supplier payments, subcontractor bills, subcontractor payment links, demands, due, and project balance are organized from the project finance area.

### Reports

- Reports are separate from Finance.
- Top Sheet remains live and accurate.
- Other report pages have branded print-ready foundations.
- PDF/Excel buttons are disabled until real export endpoints are implemented.

### Branding

- Company Settings stores tenant branding and report footer note.
- Project report header displays tenant/company identity.
- Sharebuild remains the system/platform identity.

### Permissions

- Central code-level permission matrix exists.
- New product APIs apply basic permission guards.
- Future dynamic permission editing remains a schema/UI gap.

## Known Incomplete Areas

- Real PDF export.
- Real Excel export.
- Full buyer statement/unit statement/ledger report calculations.
- Demand payment allocation and reversal workflow.
- Dedicated subcontractor bill/payment model beyond supplier payable filtering.
- Editable materials/categories/payment-method master tables.
- Cloud object storage for uploads.
- Dynamic database-backed permissions.

## Next Safest Build Step

Implement real reporting/export endpoints and finish demand-to-collection allocation before adding buyer portals, SaaS billing, SMS/WhatsApp, mobile apps, or advanced accounting.

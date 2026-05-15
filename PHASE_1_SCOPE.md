# Phase 1 Scope — Sharebuild ERP
**Target: First fully working version (v1.0)**

Phase 1 is the minimum version that replaces the Excel workbook for day-to-day use.  
A user should be able to: set up a project, enter phases, register buyers, collect payments, record expenses, track dues, and view the Top Sheet — all from the browser.

---

## Phase 1 Feature List

### 1. Company & Auth ✅ Done
- [x] Company profile (name, Bangla name, address, phone)
- [x] Admin user login with email + password
- [x] JWT session with role stored in token
- [x] Protected routes — redirect to /login if not authenticated
- [x] Logout
- [ ] **TODO:** Change password page
- [ ] **TODO:** Invite/add team members

### 2. User Roles ✅ Done (schema + enforcement)
- [x] COMPANY_ADMIN — full access
- [x] MANAGER — can approve expenses
- [x] ACCOUNTANT — can approve expenses, view all reports
- [x] SITE_ENGINEER — can submit expenses, view phases
- [x] VIEWER — read-only
- [ ] **TODO:** Role management UI (assign roles to users)

### 3. Project Setup ✅ Schema done, form needed
- [x] Project model with name (English + Bangla), address, phone, floors
- [x] Project list page
- [x] Project detail page with phase summary table
- [ ] **TODO:** New project form at `/projects/new`

### 4. Phase Setup ✅ Schema done, form needed
- [x] Phase types: Piling, Basement, Slab (per floor), Gathuni (per floor), Half Slab, Sanitary, Finishing, Custom
- [x] Phase statuses: Draft → Active → Approved → Included in Summary / Excluded / Cancelled / Duplicate
- [x] Phase detail page (income + expense ledger side by side)
- [x] Phase list with financial summary
- [ ] **TODO:** New phase form at `/phases/new`
- [ ] **TODO:** Edit phase status (inline action)

### 5. Buyer / Contact Setup ✅ Schema done, form needed
- [x] Buyer model: name (EN+BN), father name, NID, phone(s), address
- [x] Buyer list page with due balance
- [x] Buyer profile page with payment history + phase matrix
- [ ] **TODO:** Add buyer form at `/buyers/new`
- [ ] **TODO:** Edit buyer form

### 6. Phase Demand Notices ✅ Schema done, UI needed
- [x] Demand model: title, amount, due date, status, linked to buyer + phase + unit
- [x] Demand list page
- [ ] **TODO:** Issue demand notice form at `/demands/new`
- [ ] **TODO:** Auto-update demand status when payment received (PARTIALLY_PAID → FULLY_PAID)

### 7. Payment Collection ✅ Schema + API done, form needed
- [x] Collection model: buyer, phase, amount, method (Cash/Cheque/Bank/bKash), receipt no, cheque details
- [x] Collections list page
- [x] `POST /api/collections` API route
- [ ] **TODO:** Record payment form at `/collections/new`
- [ ] **TODO:** Auto-allocate payment to open demands for that buyer/phase

### 8. Payment Allocation ⚠️ Structure exists, logic missing
- [x] Collection can be linked to a Demand via `demandId`
- [ ] **TODO:** When a collection is created, auto-match it to the oldest unpaid demand for that buyer+phase
- [ ] **TODO:** Update demand status automatically

### 9. Daily Expense Entry ✅ Schema + API done, form needed
- [x] Expense model: category, description (EN+BN), amount, qty, unit, unit price, bill no, status
- [x] ExpenseCategory enum (28 categories covering all Excel expense types)
- [x] Expense list page
- [x] `POST /api/expenses` — auto-approves for admin/manager
- [x] Approval queue with Approve/Reject buttons
- [ ] **TODO:** Add expense form at `/expenses/new`
- [ ] **TODO:** Bulk expense entry (multiple items in one bill)

### 10. Supplier Profile ✅ Schema done, form needed
- [x] Supplier model: name, type (material/labour/equipment/service/consultant), phone, bank details
- [x] Supplier list page
- [x] `POST /api/suppliers` API route
- [ ] **TODO:** Add supplier form at `/suppliers/new`

### 11. Supplier Bill & Payment ✅ Schema done, forms needed
- [x] SupplierPayable model: bill no, bill date, total, paid, due, due date, status
- [x] SupplierPayment model: payment method, cheque no, cheque date, bank, reference
- [x] Payables list page with overdue detection
- [ ] **TODO:** Record supplier bill form at `/suppliers/payables/new`
- [ ] **TODO:** Record supplier payment form
- [ ] **TODO:** Mark payable as paid when full payment is recorded

### 12. Due List ✅ Done
- [x] `/buyers/dues` — live due dashboard with total outstanding, overdue count, cleared count
- [x] Buyer-wise due statement with demand vs collected comparison
- [ ] **TODO:** Filter by project
- [ ] **TODO:** Export to Excel/PDF

### 13. Top Sheet Report ✅ Done
- [x] `/reports/top-sheet` — mirrors Excel Top Sheet exactly
- [x] Slab phases separated from Gathuni phases
- [x] Sub-totals for each group
- [x] Grand total with surplus/deficit highlighted
- [x] JSON API at `/api/reports/top-sheet`
- [ ] **TODO:** Print/PDF export button
- [ ] **TODO:** Date range filter

### 14. Voucher / Document Upload ⚠️ Schema done, not implemented
- [x] Document model exists in schema (fileName, fileUrl, fileType, fileSize)
- [x] Document can be linked to Project, Buyer, or Expense
- [ ] **TODO:** File upload integration (S3/Cloudflare R2/local)
- [ ] **TODO:** Document attachment UI on expense forms

### 15. Audit Log ⚠️ Partially implemented
- [x] AuditLog table in schema (action, entityType, entityId, oldValues, newValues, userId)
- [x] Expense create → writes to audit_log
- [x] Expense approve/reject → writes to audit_log
- [x] Collection create → writes to audit_log (in API route)
- [ ] **TODO:** Phase status change → write to audit_log
- [ ] **TODO:** Buyer create/update → write to audit_log
- [ ] **TODO:** Audit log viewer page (admin only)

### 16. PDF / Excel Export ⚠️ Not implemented
- [ ] **TODO:** Top Sheet PDF (print-friendly layout exists via @media print CSS)
- [ ] **TODO:** Buyer statement PDF
- [ ] **TODO:** Phase ledger PDF
- [ ] **TODO:** Due list Excel export

---

## Phase 1 Definition of Done

Phase 1 is complete when:

1. ✅ A user can log in and log out
2. ✅ Relax Tower project is visible with correct Top Sheet totals
3. [ ] A user can create a new project from the browser (no manual DB entry)
4. [ ] A user can add phases to a project
5. [ ] A user can register a buyer
6. [ ] A user can issue a demand notice to a buyer
7. [ ] A user can record a buyer payment (collection)
8. [ ] A user can enter a daily expense
9. [ ] A site engineer's expense goes to approval queue; manager can approve or reject
10. [ ] A user can add a supplier and record a bill
11. [ ] The due list updates automatically when payments are received
12. [ ] The Top Sheet shows correct totals from live database
13. [ ] An admin can see all audit entries for expenses and collections

---

## Recommended next task

**Build the data-entry forms.** The schema, API routes, and read-only pages are all in place. The missing piece is the input forms. Implement them in this order:

1. **New Expense form** `/expenses/new` — most used daily action (React Hook Form + Zod, POST to `/api/expenses`)
2. **Record Payment form** `/collections/new` — second most common (buyer selector + phase selector + amount + method)
3. **Add Buyer form** `/buyers/new` — needed before collections
4. **Add Phase form** `/phases/new` — needed before expenses/collections
5. **New Project form** `/projects/new` — one-time per project setup
6. **Issue Demand form** `/demands/new` — before payment allocation
7. **Add Supplier + Bill forms** — for payables tracking

Each form:
- Uses `react-hook-form` + `zod` (already in package.json)
- POSTs to the existing API route
- Redirects to the list/detail page on success
- Shows validation errors inline

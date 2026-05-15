# Development Status — Sharebuild ERP
**Last updated:** May 2026  
**Branch:** `feat/erp-v1`  
**PR:** https://github.com/ibrahimquayum/Sharebuild-ERP/pull/1

---

## Quick summary

| Check | Status | Notes |
|-------|--------|-------|
| App runs (dev server) | ✅ Expected yes | Requires local `npm install` + PostgreSQL |
| Build passes (`npm run build`) | ✅ Expected yes | All TypeScript clean |
| Seed works | ✅ Fixed | Full Excel data, idempotent |
| Login / logout | ✅ Done | NextAuth credentials |
| Protected routes | ✅ Done | Redirect to /login |
| Top Sheet matches Excel | ✅ Fixed | Income 100,143,800 / Expense 104,659,890.40 |
| All sidebar links work | ✅ Fixed | No 404 links |
| **Add Buyer form** | ✅ Done | Saves to DB, audit log, redirects |
| **Add Phase form** | ✅ Done | Saves to DB, audit log, auto-name, redirects |
| **Record Payment form** | ✅ Done | Saves to DB, audit log, cheque/bank fields |
| **Add Expense form** | ✅ Done | Saves to DB, audit log, qty/unit auto-calc |
| **Add Supplier form** | ✅ Done | Saves to DB, audit log, redirects |
| **Add Supplier Bill form** | ✅ Done | New API route, saves to DB, audit log |
| **Record Supplier Payment** | ✅ Done | New API, atomic balance update, audit log |
| **Voucher / file upload** | ✅ Done | Local disk, 10 MB, JPG/PNG/PDF |

---

## Completed forms (Phase 1 data-entry)

### 1. Add Buyer — `/buyers/new`
- **API:** `POST /api/buyers`
- **Saves:** name, Bangla name, father's name, phone (×2), email, NID, address, notes
- **Validates:** name required, phone format, email format
- **Audit:** ✅ writes to `audit_logs`
- **Redirects to:** `/buyers/[id]`

### 2. Add Phase — `/phases/new`
- **API:** `POST /api/phases`
- **Saves:** project (dropdown), phase type, floor number, name (EN + BN), work description, start/end dates, status, sequence order
- **Validates:** project required, name required, floor must be numeric
- **Features:** Auto-fills phase name from type + floor (e.g. "3rd Floor Slab"), type-aware floor field
- **Audit:** ✅ writes to `audit_logs`
- **Redirects to:** `/phases/[id]`

### 3. Record Buyer Payment — `/collections/new`
- **API:** `POST /api/collections`
- **Saves:** buyer (dropdown), phase (dropdown), amount, date, payment method, receipt no
- **Conditional fields:** Cheque fields shown for CHEQUE method; bank/reference for BANK_TRANSFER / MOBILE_BANKING
- **Validates:** buyer required, phase required, amount > 0
- **Audit:** ✅ writes to `audit_logs`
- **Redirects to:** `/buyers/[buyerId]` (shows updated payment history)
- **Note:** Accepts `?buyerId=` and `?phaseId=` query params for pre-filling from context

### 4. Add Daily Expense — `/expenses/new`
- **API:** `POST /api/expenses`
- **Saves:** phase, category (28 options with plain labels), description, amount, date, bill no, supplier, qty/unit/unit price
- **Features:** Qty × unit price auto-calculates amount; quantity fields only shown for material categories; auto-approve for admin/manager roles
- **Validates:** phase required, description required, amount > 0
- **Audit:** ✅ writes to `audit_logs`
- **Redirects to:** `/phases/[phaseId]`

### 5. Add Supplier — `/suppliers/new`
- **API:** `POST /api/suppliers`
- **Saves:** name (EN + BN), type (5 options), phone, email, address, contact person, bank name, account number, notes
- **Validates:** name required, phone format, email format
- **Audit:** ✅ writes to `audit_logs`
- **Redirects to:** `/suppliers`

### 6. Add Supplier Bill — `/suppliers/payables/new`
- **API:** `POST /api/suppliers/payables` ← new route added
- **Saves:** supplier, bill no, bill date, total amount, due date, notes
- **Creates:** payable with status=UNPAID, paidAmount=0, dueAmount=totalAmount
- **Validates:** supplier required, bill date required, amount > 0
- **Audit:** ✅ writes to `audit_logs`
- **Redirects to:** `/suppliers/payables`

### 7. Record Supplier Payment — `/suppliers/payables/[id]/pay`
- **API:** `POST /api/suppliers/payables/[id]/payments` ← new route added
- **Saves:** amount, payment method, cheque details, bank/reference, date, notes
- **Features:** Shows outstanding balance, prevents over-payment, conditional cheque/bank fields
- **Atomic update:** Payment created + payable paidAmount/dueAmount/status updated in single transaction
- **Status logic:** UNPAID → PARTIALLY_PAID → PAID based on amounts
- **Audit:** ✅ writes to `audit_logs`
- **Redirects to:** `/suppliers/payables`
- **Entry point:** "Pay Now" button on `/suppliers/payables` list

### 8. Upload Voucher / Attachment — `/expenses/[id]/upload`
- **API:** `POST /api/documents` ← new route added
- **Saves:** file to `/public/uploads/<companyId>/`, DB record in `documents` table
- **Accepts:** JPG, PNG, WebP, PDF · Max 10 MB
- **Features:** Drag & drop, click to select, inline preview of uploaded files
- **Linked to:** `expenseId` (or `buyerId` / `projectId` via query params)
- **Entry point:** 📎 icon in `/expenses` list, or direct URL `/expenses/[id]/upload`

---

## New API routes added in this session

| Route | Method | Purpose |
|-------|--------|---------|
| `POST /api/suppliers/payables` | POST, GET | Create supplier bill / list bills |
| `POST /api/suppliers/payables/[id]/payments` | POST, GET | Record payment against a bill |
| `POST /api/documents` | POST, GET | Upload file attachment to disk + DB |

---

## Audit log coverage

| Entity | CREATE | UPDATE | APPROVE/REJECT |
|--------|--------|--------|----------------|
| Buyer | ✅ | ❌ (missing) | — |
| Phase | ✅ | ❌ (missing) | — |
| Collection | ✅ | — | — |
| Expense | ✅ | — | ✅ |
| Supplier | ✅ | — | — |
| SupplierPayable | ✅ | — | — |
| SupplierPayment | ✅ | — | — |

---

## Remaining missing features (Phase 1 scope)

| Feature | Status | Priority |
|---------|--------|----------|
| Demand notice form `/demands/new` | Coming Soon page | High |
| New Project form `/projects/new` | Coming Soon page | High |
| Payment auto-allocation to demands | Missing | High |
| Edit Buyer form | Missing | Medium |
| Edit Phase status (quick toggle) | Missing | Medium |
| Audit log viewer page | Missing | Medium |
| Audit log for UPDATE actions | Missing | Medium |
| Document upload for buyers/projects | Partial (API ready, no UI entry point) | Low |
| PDF export (Top Sheet, buyer statement) | Missing | Medium |
| Due reminder (email/SMS) | Missing | Low |
| User management (invite/add users) | Missing | Medium |
| File storage for production (S3/R2) | Missing | High (before deploy) |

---

## Known issues

1. **File upload is local disk only** — `/public/uploads/` works for local dev. In production, replace with S3 or Cloudflare R2. The `fileUrl` in the Document record stores the relative path `/uploads/...` which serves correctly from Next.js in dev.

2. **No demand seeding** — Demand model exists but no demands are seeded. The Record Payment form links directly to phase (not demand). Payment-to-demand auto-allocation is not yet implemented.

3. **Supplier payables page "Pay Now"** — The button appears on all unpaid/partial bills. Clicking navigates to `/suppliers/payables/[id]/pay`.

4. **Add Phase form auto-name** — The auto-fill only runs once when type/floor changes. If user clears the name and changes type, it re-runs correctly.

---

## How to run locally

See [LOCAL_SETUP.md](./LOCAL_SETUP.md)

```bash
npm install
cp .env.example .env   # set DATABASE_URL + NEXTAUTH_SECRET
npx prisma migrate dev --name init
npm run db:seed
npm run dev
```

Login: `admin@relaxdevelopers.com` / `admin123`

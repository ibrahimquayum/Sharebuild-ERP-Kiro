# Manual Test Checklist — Sharebuild ERP
## Step-by-step testing guide (updated for Stage 1 — Project Workspace)

Work through this list top to bottom after running the app.  
**App URL:** http://localhost:3000  
**Login:** `admin@relaxdevelopers.com` / `admin123`

---

## SECTION A — Basic auth (existing tests)

### TEST A-1 — Login

1. Open http://localhost:3000
2. You should be redirected to `/login`
3. Enter email: `admin@relaxdevelopers.com`, password: `admin123`
4. Click **Sign In**

**Expected:** You see the company dashboard with Relax Tower project card.

**Also test — protected route:**
1. Log out (top-right → Sign Out)
2. Go to http://localhost:3000/dashboard directly
3. Expected: redirected to `/login`

✅ Pass / ❌ Fail — Notes: ___________________________

---

## SECTION B — Project Workspace (new Stage 1 tests)

### TEST B-1 — Enter project workspace

1. Log in
2. Click **Projects** in the left sidebar
3. Click the **Relax Tower** card
4. URL should be `/projects/project-relax-tower`

**Expected:**
- The left sidebar CHANGES — it now shows workspace tabs:
  - Overview, Phase Board, Buyers, Collections, Expenses, Supplier Payables, Demands, Due Follow-up, Documents, Top Sheet
- A **"← All Projects"** link appears at the top of the sidebar
- The header shows "Relax Tower" as the project name
- The global sidebar (Dashboard, Phases, Buyers, Suppliers…) is GONE — replaced by the workspace sidebar

✅ Pass / ❌ Fail — Notes: ___________________________

---

### TEST B-2 — Project overview (command center)

While on `/projects/project-relax-tower`:

**Expected:**
- 8 KPI stat cards visible (Total Collection, Total Expense, Net Balance, Supplier Payable, Total Phases, Project Buyers, Pending Approvals, Missing Vouchers)
- Total Collection shows approx **৳ 10.01 Cr** (100,143,800)
- Total Expense shows approx **৳ 10.47 Cr** (104,659,890)
- Net Balance shows approximately **−৳ 45.16 L** (deficit, in red)
- Quick action buttons visible: **Money Received**, **Add Expense**, **Supplier Bill**, **View Dues**, **Top Sheet**
- "Recent Phases" card shows 6 phases from Relax Tower
- "Buyers in This Project" card shows seeded buyers

✅ Pass / ❌ Fail — Notes: ___________________________

---

### TEST B-3 — Phase board

1. Click **Phase Board** in the workspace sidebar
2. URL: `/projects/project-relax-tower/phases`

**Expected:**
- Phase cards displayed in columns: Draft, Active / Running, Approved, In Summary, Excluded, Cancelled
- The "In Summary" column has the most cards (Piling, Basement, 1st–10th floor slabs, Gathuni phases)
- Each card shows: phase name, Bangla name, financial figures (Collected, Expense, Balance)
- "Finishing" phase card appears in the **Draft** column
- Cards show green balance for surplus phases and red for deficit phases
- A note at the bottom: "Phase status is changed in the phase detail page…"

**Click a phase card:**
- You should be taken to `/phases/[id]` (global phase detail — this is expected for Stage 1)

✅ Pass / ❌ Fail — Notes: ___________________________

---

### TEST B-4 — Project buyers (scoped)

1. Click **Buyers** in the workspace sidebar
2. URL: `/projects/project-relax-tower/buyers`

**Expected:**
- Table shows only the **10 seeded buyers** from Relax Tower (Md. Karim Uddin, Nasrin Begum, etc.)
- Global buyers from other projects (if any) are NOT shown
- "Total Paid (This Project)" column shows project-specific amounts
- Blue info box: "These balances are project-specific."

**Verify project-scoped data:**
- The page title says "Relax Tower · 10 buyers registered"
- NOT "All buyers across all projects"

✅ Pass / ❌ Fail — Notes: ___________________________

---

### TEST B-5 — Project collections (scoped)

1. Click **Collections** in the workspace sidebar
2. URL: `/projects/project-relax-tower/collections`

**Expected:**
- Only collections from Relax Tower phases are shown
- Total Collected matches approximately ৳ 10.01 Cr
- Each row shows: Date, Buyer name, Phase name, Amount, Method

**Verify project-scoped heading:**
- "Relax Tower · all buyer payments" shown as subtitle

✅ Pass / ❌ Fail — Notes: ___________________________

---

### TEST B-6 — Record payment INSIDE project

1. Click **Collections** → click **Record Payment** button (top right)
   OR click **Money Received** from the overview page
2. URL: `/projects/project-relax-tower/collections/new`

**Expected:**
- The form does NOT have a project selector
- **Buyer dropdown** shows only the 10 Relax Tower buyers
- **Phase dropdown** shows only phases from Relax Tower (Piling, Basement, etc.)
- No phases from other projects appear

**Fill in and save:**
- Buyer: Md. Karim Uddin
- Phase: Piling
- Amount: 100000
- Method: Cash
- Click **Record Payment**

**Expected:** Redirected to `/projects/project-relax-tower/collections` and the payment appears.

✅ Pass / ❌ Fail — Notes: ___________________________

---

### TEST B-7 — Add expense INSIDE project

1. Click **Expenses** in the workspace sidebar
2. Click **Add Expense** (top right)
3. URL: `/projects/project-relax-tower/expenses/new`

**Expected:**
- **Phase dropdown** shows only Relax Tower phases
- No phases from other projects appear

**Fill in and save:**
- Phase: Piling
- Category: Cement
- Description: Test cement — project workspace
- Amount: 25000
- Date: today
- Click **Save Expense**

**Expected:** Redirected to `/projects/project-relax-tower/expenses` and the expense appears.

✅ Pass / ❌ Fail — Notes: ___________________________

---

### TEST B-8 — Project expenses list (scoped)

1. Click **Expenses** in the workspace sidebar
2. URL: `/projects/project-relax-tower/expenses`

**Expected:**
- Only Relax Tower expenses are shown
- Page title: "Relax Tower · all site costs"
- Total Expense ≈ ৳ 10.47 Cr

✅ Pass / ❌ Fail — Notes: ___________________________

---

### TEST B-9 — Add supplier bill INSIDE project

1. Click **Supplier Payables** in the workspace sidebar
2. Click **Record Bill** (top right)
3. URL: `/projects/project-relax-tower/payables/new`

**Expected:**
- Form shows **Phase dropdown** (project-scoped phases)
- NO project selector — project is already known from URL
- Supplier dropdown shows company-level suppliers

**Fill in and save:**
- Supplier: ABC Cement Traders (or whichever exists)
- Phase: Piling (optional)
- Bill Date: today
- Amount: 75000
- Click **Record Bill**

**Expected:** Redirected to `/projects/project-relax-tower/payables` and the bill appears with this project's bills.

✅ Pass / ❌ Fail — Notes: ___________________________

---

### TEST B-10 — Project payables list (scoped)

1. Click **Supplier Payables** in the workspace sidebar
2. URL: `/projects/project-relax-tower/payables`

**Expected:**
- Only bills belonging to Relax Tower are shown
- Each row shows Phase column (which phase the bill is for)
- **Pay Now** button appears for unpaid bills

✅ Pass / ❌ Fail — Notes: ___________________________

---

### TEST B-11 — Due follow-up (project-scoped)

1. Click **Due Follow-up** in the workspace sidebar
2. URL: `/projects/project-relax-tower/due-followup`

**Expected:**
- Table shows all 10 Relax Tower buyers
- Demanded, Paid, and Due Balance columns shown
- "These balances are project-specific" info box shown
- If no demands have been issued: Demanded = ৳ 0 (this is expected — issue demands first)
- **Record Payment** link for each buyer with a due balance

✅ Pass / ❌ Fail — Notes: ___________________________

---

### TEST B-12 — Project Top Sheet (scoped, no selector)

1. Click **Top Sheet** in the workspace sidebar
2. URL: `/projects/project-relax-tower/reports/top-sheet`

**Expected:**
- Page shows "Relax Tower" header (no project selector dropdown — project is fixed)
- 3 KPI cards: Grand Total Income / Grand Total Expense / Final Balance
- Grand Total Income: **৳ 10,01,43,800** (matches Excel)
- Grand Total Expense: **৳ 10,46,59,890.40** (matches Excel)
- Final Balance: **−৳ 45,16,090.40** (deficit — matches Excel)
- Table shows slab phases and gathuni phases in separate sections

✅ Pass / ❌ Fail — Notes: ___________________________

---

### TEST B-13 — Navigate back to company view

1. While inside the project workspace, click **"← All Projects"** at the top of the workspace sidebar
2. Should go to `/projects`
3. Click **Company Dashboard** at the bottom of the workspace sidebar
4. Should go to `/dashboard`
5. From `/dashboard`, the global sidebar should be visible again (Dashboard, Projects, Phases, etc.)

**Expected:** The global sidebar reappears when you leave the project workspace.

✅ Pass / ❌ Fail — Notes: ___________________________

---

## SECTION C — Legacy routes still work

### TEST C-1 — Legacy buyer list with notice

1. Go to `/buyers` directly (or click Buyers in the global sidebar from outside a project)
2. **Expected:**
   - Page opens and shows all buyers
   - An **amber warning box** appears at the top:
     "Tip: For project-specific buyer balances, use the Project Workspace…"
   - The buyers table still works normally

✅ Pass / ❌ Fail — Notes: ___________________________

---

### TEST C-2 — Legacy collections list with notice

1. Go to `/collections`
2. **Expected:** Page opens with amber notice directing to project workspace

✅ Pass / ❌ Fail — Notes: ___________________________

---

### TEST C-3 — Legacy expenses list with notice

1. Go to `/expenses`
2. **Expected:** Page opens with amber notice directing to project workspace

✅ Pass / ❌ Fail — Notes: ___________________________

---

### TEST C-4 — Legacy supplier bill form now requires project

1. Go to `/suppliers/payables/new`
2. **Expected:**
   - An amber notice: "Record bills from inside the Project Workspace for a better experience"
   - A **Project** dropdown appears (required)
   - Select the project before submitting

✅ Pass / ❌ Fail — Notes: ___________________________

---

### TEST C-5 — Global Top Sheet still works

1. Go to `/reports/top-sheet`
2. **Expected:** The global Top Sheet still loads and shows Relax Tower data

✅ Pass / ❌ Fail — Notes: ___________________________

---

## SECTION D — Previous tests (still valid)

### TEST D-1 — Dashboard loads with correct figures
From `/dashboard`:
- Total Collection ≈ ৳ 10.01 Cr
- Total Expense ≈ ৳ 10.47 Cr
- Net Balance ≈ −৳ 45.16 L (deficit)

✅ Pass / ❌ Fail — Notes: ___________________________

---

### TEST D-2 — Add Buyer (global form still works)
1. Go to `/buyers/new`
2. Add: Full Name: `Test Buyer Two`, Phone: `01712000002`
3. Click **Save Buyer**
4. Expected: redirects to buyer profile

✅ Pass / ❌ Fail — Notes: ___________________________

---

### TEST D-3 — Add Phase (global form still works)
1. Go to `/phases/new`
2. Select project: Relax Tower
3. Type: Floor Slab, Floor: 13
4. Expected: name auto-fills as "13th Floor Slab"
5. Click **Save Phase**

✅ Pass / ❌ Fail — Notes: ___________________________

---

### TEST D-4 — Approval workflow
1. Go to `/expenses/approvals`
2. If pending: Approve and Reject buttons work

✅ Pass / ❌ Fail — Notes: ___________________________

---

### TEST D-5 — Logout
1. Click username (top-right) → Sign Out
2. Expected: redirected to `/login`
3. Try visiting `/dashboard` → expected: redirected to `/login`

✅ Pass / ❌ Fail — Notes: ___________________________

---

## Summary table

| # | Test | Result |
|---|------|--------|
| A-1 | Login + protected routes | |
| B-1 | Enter project workspace | |
| B-2 | Project overview KPIs | |
| B-3 | Phase board (kanban cards) | |
| B-4 | Project buyers scoped | |
| B-5 | Project collections scoped | |
| B-6 | Record payment inside project | |
| B-7 | Add expense inside project | |
| B-8 | Project expenses list | |
| B-9 | Add supplier bill inside project | |
| B-10 | Project payables list | |
| B-11 | Due follow-up scoped | |
| B-12 | Project Top Sheet (no selector) | |
| B-13 | Navigate back to company view | |
| C-1 | Legacy buyer list + notice | |
| C-2 | Legacy collections + notice | |
| C-3 | Legacy expenses + notice | |
| C-4 | Legacy supplier bill + project selector | |
| C-5 | Global Top Sheet still works | |
| D-1 | Dashboard correct figures | |
| D-2 | Add Buyer (global) | |
| D-3 | Add Phase (global) | |
| D-4 | Approvals workflow | |
| D-5 | Logout | |

**All 24 tests passed: YES / NO**

---

## If a test fails

1. Check the cmd/terminal window where `npm run dev` is running for red errors
2. Open browser console (F12 → Console) for client-side errors
3. Check `TROUBLESHOOTING.md` for common fixes
4. For workspace layout issues, check that the migration ran: `npx prisma migrate dev`

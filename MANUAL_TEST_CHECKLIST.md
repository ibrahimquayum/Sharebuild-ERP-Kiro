# Manual Test Checklist — Sharebuild ERP
## Step-by-step testing after local setup

Work through this list top to bottom after running the app.  
Tick each item as you go. If something fails, check TROUBLESHOOTING.md.

**App URL:** http://localhost:3000  
**Login:** admin@relaxdevelopers.com / admin123

---

## TEST 1 — Login

**Steps:**
1. Open http://localhost:3000 in your browser
2. You should be redirected to http://localhost:3000/login
3. Enter email: `admin@relaxdevelopers.com`
4. Enter password: `admin123`
5. Click **Sign In**

**Expected result:**
- You are taken to the dashboard
- The top-left shows "Sharebuild ERP"
- The header shows "Dashboard" and "Admin User"
- The sidebar shows: Dashboard, Projects, Phases, Buyers, Collections, Expenses, Suppliers, Reports, Settings

**Also test — protected route:**
1. Log out (click your name top-right → Sign Out)
2. Try to go to http://localhost:3000/dashboard directly
3. Expected: you are redirected to /login

✅ Pass / ❌ Fail — Notes: ___________________________

---

## TEST 2 — Dashboard

**Steps:**
1. Log in and go to http://localhost:3000/dashboard

**Expected result:**
- 8 stat cards visible: Total Collection, Total Expense, Net Balance, Pending Approvals, Projects, Buyers, Phases, Active Phases
- Total Collection shows approximately **৳ 10.01 Cr** (100,143,800)
- Total Expense shows approximately **৳ 10.47 Cr** (104,659,890)
- Net Balance shows **−৳ 45.16 L** (deficit, shown in red)
- "Relax Tower" project card is visible
- Phase list shows at least 8 phases (Piling, Basement, 1st Floor Slab, etc.)

✅ Pass / ❌ Fail — Notes: ___________________________

---

## TEST 3 — Top Sheet Report

**Steps:**
1. In the sidebar, click **Reports** to expand it
2. Click **Top Sheet**
3. URL should be http://localhost:3000/reports/top-sheet

**Expected result:**
- Page header shows "Relax Tower" project name in both English and Bangla
- Three summary cards at the top:
  - Grand Total Income: **৳ 10,01,43,800** (green)
  - Grand Total Expense: **৳ 10,46,59,890.40** (red)
  - Final Balance: **−৳ 45,16,090.40** (red, shows ⚠️ Deficit)
- Table shows two sections: "Construction / Slab Phases" and "Gathuni / Masonry Phases"
- "Piling" row shows Income: ৳ 1,35,00,000 / Expense: ৳ 1,70,41,165.44
- "Basement" row shows Income: ৳ 2,49,35,000 / Expense: ৳ 1,94,74,035.36
- At least 21 phases listed in total
- Grand Total row at the bottom matches the summary cards

**This is critical — it must match the Excel figures exactly.**

✅ Pass / ❌ Fail — Notes: ___________________________

---

## TEST 4 — Add Buyer

**Steps:**
1. In the sidebar, click **Buyers** → **Add Buyer**
2. URL: http://localhost:3000/buyers/new
3. Fill in the form:
   - Full Name (English): `Test Buyer One`
   - Mobile Number: `01712000001`
   - Leave all other fields empty
4. Click **Save Buyer**

**Expected result:**
- You are redirected to the buyer's profile page (e.g. /buyers/clxxx...)
- The page shows "Test Buyer One"
- Phone number is shown
- "Total Paid" shows ৳ 0
- "Due Balance" shows "Cleared"

**Also test — validation:**
1. Go back to /buyers/new
2. Leave the name field empty
3. Click **Save Buyer**
4. Expected: red error message "Full name is required." appears — form does NOT submit

✅ Pass / ❌ Fail — Notes: ___________________________

---

## TEST 5 — Buyers List

**Steps:**
1. In the sidebar, click **Buyers** → **Buyer List**
2. URL: http://localhost:3000/buyers

**Expected result:**
- At least 10 buyers from the seed data (Md. Karim Uddin, Nasrin Begum, etc.)
- Your new buyer "Test Buyer One" appears at the bottom or alphabetically
- Each row shows Total Paid and Due Balance columns
- Buyers with due balances show the amount in red; cleared buyers show ✅

✅ Pass / ❌ Fail — Notes: ___________________________

---

## TEST 6 — Add Phase

**Steps:**
1. In the sidebar, click **Phases** → **Add Phase**
2. URL: http://localhost:3000/phases/new
3. Fill in the form:
   - Project: select **Relax Tower** from the dropdown
   - Phase Type: **Floor Slab**
   - Floor Number: `12`
   - (Name should auto-fill as "12th Floor Slab")
   - Start Date: today's date
   - Status: **Draft**
4. Click **Save Phase**

**Expected result:**
- You are redirected to the phase detail page
- Phase name shows "12th Floor Slab"
- Income side shows no collections yet
- Expense side shows no expenses yet
- Status badge shows "Draft"

**Also test — auto-name:**
1. Go back to /phases/new
2. Select Phase Type: **Gathuni (Brick Masonry)**
3. Enter Floor Number: `5`
4. The Name field should automatically fill with "Gathuni 5th Floor"

✅ Pass / ❌ Fail — Notes: ___________________________

---

## TEST 7 — Record Buyer Payment

**Steps:**
1. In the sidebar, click **Collections** → **Record Payment**
2. URL: http://localhost:3000/collections/new
3. Fill in the form:
   - Buyer: select **Test Buyer One** from the dropdown
   - Phase: select **Piling** from the dropdown
   - Amount Received: `500000`
   - Date Received: today's date
   - Payment Method: **Cash**
4. Click **Record Payment**

**Expected result:**
- You are redirected to Test Buyer One's profile page
- The payment history table shows one row:
  - Phase: Piling
  - Amount: ৳ 5,00,000
  - Method: CASH
- Total Paid at the bottom: ৳ 5,00,000

**Also test — cheque fields:**
1. Go back to /collections/new
2. Select Payment Method: **Cheque**
3. New fields should appear: Cheque Number, Cheque Date, Bank Name
4. Switch to **Cash** — those fields should disappear

✅ Pass / ❌ Fail — Notes: ___________________________

---

## TEST 8 — Add Daily Expense

**Steps:**
1. In the sidebar, click **Expenses** → **Add Expense**
2. URL: http://localhost:3000/expenses/new
3. Fill in the form:
   - Construction Phase: select **Piling** from the dropdown
   - Expense Category: **Cement**
   - Description: `Cement purchase — test`
   - Quantity: `100`
   - Unit: **bag**
   - Unit Price: `520`
   - (Total Amount should auto-calculate to 52000)
   - Expense Date: today's date
4. Click **Save Expense**

**Expected result:**
- You are redirected to the Piling phase page
- The expense "Cement purchase — test" appears in the Expenses table on the right
- Amount shows ৳ 52,000
- Status shows **Approved** (because you are an admin)

**Also test — auto-calculation:**
1. Go back to /expenses/new
2. Enter Quantity: `50`, Unit Price: `1000`
3. The Amount field should automatically show `50000.00`

**Also test — validation:**
1. Clear the Description field
2. Click **Save Expense**
3. Expected: "Description is required." error appears

✅ Pass / ❌ Fail — Notes: ___________________________

---

## TEST 9 — Add Supplier

**Steps:**
1. In the sidebar, click **Suppliers** → **Add Supplier**  
   (If you don't see "Add Supplier" in the sidebar, go to http://localhost:3000/suppliers/new)
2. Fill in the form:
   - Supplier / Business Name: `ABC Cement Traders`
   - Supplier Type: **Material Supplier (Rod, Cement, Stone…)**
   - Phone Number: `01711999888`
   - Contact Person Name: `Md. Rahim`
3. Click **Save Supplier**

**Expected result:**
- You are redirected to http://localhost:3000/suppliers
- The supplier list shows "ABC Cement Traders"
- Type shows "MATERIAL SUPPLIER"

✅ Pass / ❌ Fail — Notes: ___________________________

---

## TEST 10 — Add Supplier Bill

**Steps:**
1. In the sidebar, click **Suppliers** → **Payables**
2. Click the **Record Bill** button (top right)
3. URL: http://localhost:3000/suppliers/payables/new
4. Fill in the form:
   - Supplier: select **ABC Cement Traders**
   - Bill Number: `INV-TEST-001`
   - Bill Date: today's date
   - Total Bill Amount: `150000`
   - Payment Due By: (leave blank)
5. Click **Record Bill**

**Expected result:**
- You are redirected to the payables list
- "ABC Cement Traders" appears with:
  - Bill No: INV-TEST-001
  - Total: ৳ 1,50,000
  - Paid: ৳ 0
  - Due: ৳ 1,50,000 (in red)
  - Status: **Unpaid**
  - A **Pay Now** button on the right

✅ Pass / ❌ Fail — Notes: ___________________________

---

## TEST 11 — Record Supplier Payment

**Steps:**
1. On the payables list, find the "ABC Cement Traders" row
2. Click the **Pay Now** button
3. URL: http://localhost:3000/suppliers/payables/[id]/pay
4. You should see a blue summary box showing:
   - Total: ৳ 1,50,000 · Paid: ৳ 0 · Outstanding: ৳ 1,50,000
5. Fill in the form:
   - Amount Paid: `50000`
   - Payment Date: today's date
   - Payment Method: **Bank Transfer**
   - Bank / Account: `Sonali Bank`
   - Transaction Reference: `TXN001`
6. Click **Record Payment**

**Expected result:**
- You are redirected to the payables list
- "ABC Cement Traders" now shows:
  - Total: ৳ 1,50,000
  - Paid: ৳ 50,000 (green)
  - Due: ৳ 1,00,000 (red)
  - Status: **Part Paid**

**Click Pay Now again:**
1. Click **Pay Now** on the same row
2. Outstanding should now show ৳ 1,00,000
3. Enter Amount Paid: `100000`
4. Click **Record Payment**
5. Expected: Status changes to **Paid**, due amount shows ✅

**Test over-payment protection:**
1. If the bill still has a balance, click Pay Now
2. Try to enter an amount LARGER than the outstanding balance
3. Expected: error message "Payment amount exceeds outstanding due"

✅ Pass / ❌ Fail — Notes: ___________________________

---

## TEST 12 — Upload Voucher / Attachment

**Steps:**
1. Go to http://localhost:3000/expenses
2. Find the expense "Cement purchase — test"
3. Click the **📎** icon in the last column
4. URL: http://localhost:3000/expenses/[id]/upload
5. Click the dashed box (or drag a file onto it)
6. Select any small JPG, PNG, or PDF file from your computer
7. In the Description field, type: `Test voucher`
8. Click **Upload File**

**Expected result:**
- A green checkmark and file name appear in the dashed box before uploading
- After clicking Upload, the file appears in the "Uploaded in this session" list below
- A "View" link appears — click it to verify the file opens

**Test file type restriction:**
1. Try uploading a `.xlsx` or `.docx` file
2. Expected: error message "File type not allowed. Use JPG, PNG, PDF..."

✅ Pass / ❌ Fail — Notes: ___________________________

---

## TEST 13 — Phase Detail Page

**Steps:**
1. In the sidebar, click **Phases** → **All Phases**
2. Click on **Piling**
3. URL: http://localhost:3000/phases/[id]

**Expected result:**
- Left side shows income collections (at least 10 rows from seed)
- Right side shows expenses (Rod, Cement, Stone, Sand, etc.)
- Bottom shows: Total Income / Total Expense / Phase Balance
- Phase Balance should be approximately **−৳ 3,54,11,165** (deficit — expected from Excel)
- Category breakdown section at bottom shows expense breakdown by type
- Rod/Steel should be the largest expense category

✅ Pass / ❌ Fail — Notes: ___________________________

---

## TEST 14 — Due Dashboard

**Steps:**
1. In the sidebar, click **Buyers** → **Due List**
2. URL: http://localhost:3000/buyers/dues

**Expected result:**
- Page shows total outstanding, buyers with due, overdue count, cleared count
- Table lists all buyers with their Demand vs Paid vs Balance
- If no demands have been issued yet, most buyers may show ৳ 0 demanded

✅ Pass / ❌ Fail — Notes: ___________________________

---

## TEST 15 — Approval Workflow

**Steps:**
1. Go to http://localhost:3000/expenses/approvals

**Expected result:**
- If no pending expenses: page shows "No pending approvals ✅"
- If there are pending expenses: each row has **Approve** and **Reject** buttons

**To create a pending expense:**
1. You would need a non-admin user to submit an expense (site engineer role)
2. For now, this can be verified visually — the buttons are present and functional
   (Approve button turns green and calls the API; page refreshes)

✅ Pass / ❌ Fail — Notes: ___________________________

---

## TEST 16 — Logout

**Steps:**
1. Click your name in the top-right corner of any page
2. Click **Sign Out**

**Expected result:**
- You are redirected to http://localhost:3000/login
- If you try to go to http://localhost:3000/dashboard, you are redirected back to /login

✅ Pass / ❌ Fail — Notes: ___________________________

---

## Summary

| # | Test | Result |
|---|------|--------|
| 1 | Login & protected routes | |
| 2 | Dashboard loads with correct figures | |
| 3 | Top Sheet matches Excel exactly | |
| 4 | Add Buyer + validation | |
| 5 | Buyer list | |
| 6 | Add Phase + auto-name | |
| 7 | Record Payment + cheque fields | |
| 8 | Add Expense + auto-calc + validation | |
| 9 | Add Supplier | |
| 10 | Add Supplier Bill | |
| 11 | Supplier Payment + over-payment guard | |
| 12 | Upload Voucher + file type check | |
| 13 | Phase detail — income/expense ledger | |
| 14 | Due Dashboard | |
| 15 | Approval workflow | |
| 16 | Logout | |

**All 16 tests passed: YES / NO**

---

## If a test fails

1. Write down exactly what happened
2. Check TROUBLESHOOTING.md for a matching error
3. Check the browser console for errors (press F12 → Console tab)
4. Check the cmd window where `npm run dev` is running — it may show a red error

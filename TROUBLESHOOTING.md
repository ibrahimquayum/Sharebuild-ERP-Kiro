# Troubleshooting Guide — Sharebuild ERP
## Common errors on Windows (with fixes)

---

## ERROR 1 — "npm is not recognized as an internal or external command"

**What it looks like:**
```
'npm' is not recognized as an internal or external command,
operable program or batch file.
```

**What it means:** Node.js is not installed, or the cmd window was opened before Node.js was installed.

**Fix:**
1. Close all cmd windows
2. Check if Node.js is installed: open Start Menu, search for "Node.js"
3. If not installed: go to https://nodejs.org and install the LTS version
4. If it IS installed: close cmd and open a **new** cmd window — old windows don't pick up new installations
5. Try `npm --version` again in the new window

---

## ERROR 2 — "git is not recognized as an internal or external command"

**What it looks like:**
```
'git' is not recognized as an internal or external command
```

**Fix:**
1. Close all cmd windows
2. Go to https://git-scm.com/download/win and install Git
3. During installation, on the "Adjusting your PATH" screen, select **"Git from the command line and also from 3rd-party software"**
4. Open a new cmd window and try `git --version` again

---

## ERROR 3 — Database connection failed / "Can't reach database server"

**What it looks like:**
```
Error: Can't reach database server at localhost:5432
```
or
```
PrismaClientInitializationError: Unable to connect to database
```

**Causes and fixes:**

**A — PostgreSQL is not running:**
1. Open Windows Start Menu
2. Search for **"Services"** and open it
3. Scroll down to find **"postgresql-x64-16"** (or similar)
4. Check the Status column — if it says "Stopped", right-click → Start
5. Try the command again

**B — Wrong password in .env:**
1. Open the `.env` file in Notepad
2. Check this line:
   ```
   DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/sharebuild_erp"
   ```
3. Make sure `YOUR_PASSWORD` is the password you chose when installing PostgreSQL
4. Save the file and try again

**C — Database not created:**
1. Open pgAdmin
2. Expand Servers → PostgreSQL
3. If you don't see `sharebuild_erp` under Databases:
   - Right-click Databases → Create → Database
   - Name: `sharebuild_erp`
   - Save

**D — Wrong port:**
1. Open `.env` and check the port in the URL is `5432`
2. If you changed the port during PostgreSQL installation, update `.env` accordingly

---

## ERROR 4 — "Port 3000 is already in use"

**What it looks like:**
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Fix — Option A (restart on a different port):**
```cmd
npx next dev -p 3001
```
Then open http://localhost:3001 instead.

**Fix — Option B (find and kill the process using port 3000):**
1. Open cmd
2. Run:
   ```
   netstat -ano | findstr :3000
   ```
3. Note the PID number at the end (e.g. `12345`)
4. Run:
   ```
   taskkill /PID 12345 /F
   ```
5. Try `npm run dev` again

**Fix — Option C (just restart your computer):**
Restarting Windows will free all ports.

---

## ERROR 5 — Migration failed / Prisma migrate error

---

### ERROR 5A — "relation does not exist" on fresh clone

**What it looks like:**
```
ERROR: relation "supplier_payables" does not exist
```
or
```
ERROR: relation "companies" does not exist
```
or any `ALTER TABLE` error on a table that doesn't exist yet.

**What it means:**
The migration history was broken — there was an incremental migration that assumed
tables already existed, but the baseline creation migration was missing.

**This has been fixed.** The repo now contains a single clean initial migration at
`prisma/migrations/0001_init/migration.sql` that creates all tables from scratch.

**Fix — pull the latest code and re-run:**
```cmd
cd %USERPROFILE%\Desktop\Sharebuild-ERP
git pull
npx prisma migrate reset
npm run db:seed
```

Type `y` when `migrate reset` asks to confirm.

---

### ERROR 5B — "migration already exists" or "drift detected"

**What it looks like:**
```
Drift detected: Your database schema is not in sync with your migration history.
```
or
```
Error: P3006 Migration `0001_init` failed to apply
```

**What it means:**
Your database already has tables (e.g. from a previous `db push`), but the Prisma
migration history table (`_prisma_migrations`) does not know about them.

**Fix — mark the migration as already applied:**
```cmd
npx prisma migrate resolve --applied 0001_init
```

This tells Prisma "the tables are already there, don't run the SQL again, just record
that this migration has been applied." Then continue with:
```cmd
npm run db:seed
npm run dev
```

---

### ERROR 5C — "relation already exists" (tables exist but seed fails)

**What it looks like:**
```
ERROR: relation "companies" already exists
```
when running `npx prisma migrate dev`.

**Fix:**
```cmd
npx prisma migrate reset
```
Type `y` to confirm. This wipes and re-creates all tables, then seeds automatically.

---

### ERROR 5D — General migration failure on a fresh DB

**What it looks like:**
```
Failed to apply migration `0001_init`
Error: ...
```

**Fix — wipe and start clean:**
> ⚠️ This deletes all data. Only safe on a fresh setup.
```cmd
npx prisma migrate reset
```
Type `y` to confirm. Then seed:
```cmd
npm run db:seed
```

---

### ERROR 5E — Prisma client out of sync with schema

**What it looks like:**
```
Error: Cannot find module '.prisma/client'
```
or TypeScript errors mentioning unknown Prisma models.

**Fix:**
```cmd
npm run db:generate
```
This regenerates the Prisma client from the current schema. Then restart `npm run dev`.

---

### Do NOT use `--name` flag on a fresh clone

When the migration already exists in the repo, running:
```cmd
npx prisma migrate dev --name init     ← WRONG on fresh clone
```
...creates a new empty migration file on top of the existing one, which confuses
Prisma. The correct command on a fresh clone is simply:
```cmd
npx prisma migrate dev                  ← CORRECT
```

---

## ERROR 6 — Seed failed

**What it looks like:**
```
Error: Seed failed to complete
```
or
```
PrismaClientKnownRequestError: Unique constraint failed
```

**Fix A — Run it again (it is safe):**
The seed uses `upsert` for most records, so re-running it is safe:
```cmd
npm run db:seed
```

**Fix B — Reset and re-seed if you see duplicate errors:**
```cmd
npx prisma migrate reset
```
Type `y` to confirm. This wipes and re-creates the database, then re-runs the seed automatically.

**Fix C — bcryptjs error:**
```
Cannot find module 'bcryptjs'
```
Run `npm install` again:
```cmd
npm install
```
Then try the seed again.

---

## ERROR 7 — Login not working

**What it looks like:**
- You enter the correct email/password but see "Invalid email or password"
- You are stuck on the login page

**Fix A — Seed was not run:**
The admin user is only created by the seed command. Run:
```cmd
npm run db:seed
```
Then try logging in again.

**Fix B — Wrong credentials:**
The exact credentials are:
- Email: `admin@relaxdevelopers.com` (all lowercase, no spaces)
- Password: `admin123` (no spaces)

**Fix C — NEXTAUTH_SECRET not set:**
1. Open `.env` and check that `NEXTAUTH_SECRET` has a value:
   ```
   NEXTAUTH_SECRET="sharebuild-local-dev-secret-2024"
   ```
2. If this line is missing or empty, add it
3. Stop the app (Ctrl+C) and restart it (`npm run dev`)

**Fix D — Session cookie issue:**
1. Open browser developer tools (F12)
2. Go to Application tab → Cookies → http://localhost:3000
3. Delete all cookies for localhost
4. Refresh and try logging in again

---

## ERROR 8 — "Cannot find module" errors

**What it looks like:**
```
Error: Cannot find module '@/lib/prisma'
```
or
```
Module not found: Can't resolve 'next-auth'
```

**Fix:**
```cmd
npm install
```
Wait for it to finish, then try again.

If still failing:
```cmd
npm install
npm run db:generate
npm run dev
```

---

## ERROR 9 — Prisma Studio / database browser not opening

**What it looks like:**
```
Error: Prisma Studio failed to start
```

**Fix:**
Make sure you are in the project folder and the `.env` is configured:
```cmd
cd %USERPROFILE%\Desktop\Sharebuild-ERP
npm run db:studio
```
Prisma Studio opens at http://localhost:5555 (not 3000).

---

## ERROR 10 — App shows blank page or "500 Internal Server Error"

**What it looks like:**
- White blank page
- "500 — Internal Server Error" message
- "Application error: a client-side exception has occurred"

**Fix:**
1. Look at the cmd window where `npm run dev` is running — there will be a red error message
2. Copy the error message
3. The most common cause is the database not running — see ERROR 3 above
4. If the error says something about a missing table, run:
   ```cmd
   npx prisma db push
   npm run db:seed
   ```

---

## ERROR 11 — Top Sheet shows ৳ 0 for income or expense

**What it looks like:**
- Top Sheet page loads but shows zero values
- Dashboard shows ৳ 0 for everything

**Fix:**
The seed was not run or did not complete successfully. Run:
```cmd
npm run db:seed
```
Look for the verification table at the end:
```
│  Total Income      │ ৳   100,143,800 │ ৳  100,143,800 │  ✅
│  Total Expense     │ ৳ 104,659,890.40 │ ৳ 104,659,890.40 │  ✅
```
If you see ❌ instead of ✅, the seed did not load correctly.

Try resetting:
```cmd
npx prisma migrate reset
```
Then `npm run db:seed` again.

---

## ERROR 12 — File upload fails ("Network error" or "Failed to save")

**What it looks like:**
- You select a file and click Upload, but get an error

**Fix A — File is too large:**
Maximum allowed size is 10 MB. Try a smaller file.

**Fix B — Wrong file type:**
Only JPG, PNG, WebP, and PDF are allowed. Try a different file.

**Fix C — Upload folder missing:**
The app creates the folder automatically, but if it fails:
1. Inside the `Sharebuild-ERP` folder, open `public`
2. Create a folder called `uploads` if it doesn't exist

---

## ERROR 13 — "node_modules not found" or "next: not found"

**What it looks like:**
```
'next' is not recognized as an internal or external command
```
or
```
sh: next: not found
```

**Fix:**
You need to install dependencies first:
```cmd
cd %USERPROFILE%\Desktop\Sharebuild-ERP
npm install
```
Then try `npm run dev` again.

---

## ERROR 14 — Page shows "This page does not exist" or "404"

**What it looks like:**
- A page with "404 — Page Not Found"
- A page with a construction icon saying "Coming Soon"

**This is expected for some pages.** Currently, these pages are not fully built:
- `/projects/new` (new project form)
- `/demands/new` (new demand notice)
- `/buyers/[id]/edit` (edit buyer)

All other main pages should work. If you get 404 on a page that should work (like `/dashboard`), make sure you are logged in.

---

## Still stuck?

1. Check the cmd window — there is almost always a red error message explaining what went wrong
2. Open browser developer tools (F12) → Console tab — look for red error messages
3. Make sure the app is running (`npm run dev` is active in cmd)
4. Make sure PostgreSQL is running (check Windows Services)
5. Make sure the `.env` file exists and has the correct database password

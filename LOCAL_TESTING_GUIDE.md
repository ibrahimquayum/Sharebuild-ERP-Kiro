# Local Testing Guide — Sharebuild ERP
## For Windows PC (Beginner Friendly)

This guide will take you from a fresh Windows computer to a fully running Sharebuild ERP in about 30 minutes.

---

## What you will install

| Tool | What it does |
|------|-------------|
| Node.js | Runs the app (like a web server engine) |
| Git | Downloads the code from GitHub |
| PostgreSQL | The database that stores all data |

---

## Step 1 — Install Node.js

1. Open your browser and go to: **https://nodejs.org**
2. Click the big green button that says **"LTS"** (Long Term Support)
3. Download the `.msi` file (e.g. `node-v20.x.x-x64.msi`)
4. Run the installer — click **Next** on every screen, keep all defaults
5. When asked about "Tools for Native Modules", leave it **unchecked**
6. Click **Install**, then **Finish**

**Verify it worked:**
1. Press `Windows key + R`, type `cmd`, press Enter
2. In the black window, type:
   ```
   node --version
   ```
3. You should see something like `v20.12.0`
4. Also type:
   ```
   npm --version
   ```
5. You should see something like `10.5.0`

If you see a version number, Node.js is installed. ✅

---

## Step 2 — Install Git

1. Go to: **https://git-scm.com/download/win**
2. The download should start automatically (64-bit installer)
3. Run the `.exe` file
4. Click **Next** on every screen — keep all defaults
5. On the screen "Choosing the default editor", you can leave it as Vim or change to Notepad
6. Click **Install**, then **Finish**

**Verify it worked:**
1. Open a new `cmd` window (close the old one first)
2. Type:
   ```
   git --version
   ```
3. You should see something like `git version 2.44.0.windows.1`

If you see a version number, Git is installed. ✅

---

## Step 3 — Install PostgreSQL

1. Go to: **https://www.postgresql.org/download/windows/**
2. Click **"Download the installer"**
3. Download the latest version for Windows x86-64 (e.g. PostgreSQL 16)
4. Run the installer
5. Click **Next** on the first screens
6. When asked for a **password**, type: `admin123`
   - ⚠️ Write this password down — you will need it later
7. Keep the port as **5432** (default)
8. Keep locale as default
9. Click **Next**, then **Install**
10. At the end, when asked to launch "Stack Builder", **uncheck** it and click **Finish**

**Verify it worked:**
1. Press `Windows key`, search for **pgAdmin 4**, open it
2. On the left panel you should see "Servers" → "PostgreSQL 16" (or similar)
3. If it asks for a password, enter: `admin123`

If pgAdmin opens and shows the server, PostgreSQL is installed. ✅

---

## Step 4 — Create the database

Now you need to create a database called `sharebuild_erp`.

**Option A — Using pgAdmin (easier):**
1. In pgAdmin, expand: `Servers` → `PostgreSQL 16`
2. Right-click on **Databases**
3. Click **Create** → **Database...**
4. In the "Database" field, type: `sharebuild_erp`
5. Click **Save**

**Option B — Using command line:**
1. Open `cmd`
2. Type:
   ```
   "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres
   ```
   (Replace `16` with your version number if different)
3. Enter your password: `admin123`
4. Type:
   ```sql
   CREATE DATABASE sharebuild_erp;
   ```
5. Press Enter, then type `\q` and press Enter to exit

Database created. ✅

---

## Step 5 — Download the code (Clone the repo)

1. Open `cmd`
2. Go to a folder where you want to save the project. For example, your Desktop:
   ```
   cd %USERPROFILE%\Desktop
   ```
3. Download the code:
   ```
   git clone https://github.com/ibrahimquayum/Sharebuild-ERP.git
   ```
4. Go into the project folder:
   ```
   cd Sharebuild-ERP
   ```
5. Switch to the correct branch:
   ```
   git checkout feat/erp-v1
   ```

You should now see a folder called `Sharebuild-ERP` on your Desktop. ✅

---

## Step 6 — Create the .env file

The app needs a configuration file called `.env`.

1. Inside the `Sharebuild-ERP` folder, find the file called `.env.example`
2. Copy it and rename the copy to `.env`
   - Right-click `.env.example` → Copy
   - Right-click an empty area → Paste
   - Right-click the copy → Rename → type `.env`
   - If Windows says "Are you sure?", click Yes

3. Open `.env` with Notepad (right-click → Open with → Notepad)
4. You will see this content:
   ```
   DATABASE_URL="postgresql://user:password@localhost:5432/sharebuild_erp"
   NEXTAUTH_URL="http://localhost:3000"
   NEXTAUTH_SECRET="your-secret-key-here-change-in-production"
   ```
5. Change the `DATABASE_URL` line to:
   ```
   DATABASE_URL="postgresql://postgres:admin123@localhost:5432/sharebuild_erp"
   ```
   (Replace `admin123` with whatever password you chose in Step 3)

6. Change the `NEXTAUTH_SECRET` to any random text, for example:
   ```
   NEXTAUTH_SECRET="sharebuild-local-dev-secret-2024"
   ```

7. Save the file (Ctrl+S) and close Notepad

Your `.env` file is ready. ✅

---

## Step 7 — Install dependencies (npm install)

1. In `cmd`, make sure you are inside the project folder:
   ```
   cd %USERPROFILE%\Desktop\Sharebuild-ERP
   ```
2. Run:
   ```
   npm install
   ```
3. This will download all the packages. It may take 2–5 minutes.
4. You will see a lot of text scrolling. Wait until you see something like:
   ```
   added 850 packages in 45s
   ```

If you see "added X packages", the install worked. ✅

---

## Step 8 — Set up the database (Prisma migrate)

This creates all the tables in your PostgreSQL database.

1. In `cmd`, still inside the project folder, run:
   ```
   npx prisma migrate dev
   ```
2. Prisma will apply the committed migrations (`0001_init`, `0002_project_setup_fields`, `0003_product_foundation`, then `0004_expense_field_entry`) automatically.
3. Wait for it to finish. You should see:
   ```
   The following migration(s) have been applied:
   migrations/
     ├─ 0001_init/
     │  └─ migration.sql
    ├─ 0002_project_setup_fields/
    │  └─ migration.sql
    ├─ 0003_product_foundation/
    │  └─ migration.sql
    └─ 0004_expense_field_entry/
       └─ migration.sql

   Your database is now in sync with your schema.
   ```

> ⚠️ **Do NOT add `--name init` or any other name flag** on a fresh clone.
> The migration already exists. Adding a name would create a new empty migration on top of it.

Database tables created. ✅

---

## Step 9 — Load demo data (seed)

This loads the Relax Tower project data into your database.

1. In `cmd`, run:
   ```
   npm run db:seed
   ```
2. Wait for it to finish. You should see:
   ```
   ✅  Top Sheet totals MATCH Excel exactly.
   🌱  Seed complete.
   Login → admin@relaxdevelopers.com  /  admin123
   ```

Demo data loaded. ✅

---

## Step 10 — Start the app

1. In `cmd`, run:
   ```
   npm run dev
   ```
2. Wait until you see:
   ```
   ▲ Next.js 14.x.x
   - Local: http://localhost:3000
   - ready in X ms
   ```
3. **Do not close this cmd window** — it must stay open while you use the app

App is running. ✅

---

## Step 11 — Open the app

1. Open your browser (Chrome, Edge, Firefox)
2. Go to: **http://localhost:3000**
3. You should see the Sharebuild ERP login page

---

## Step 12 — Log in

Use these credentials:

| Field | Value |
|-------|-------|
| Email | `admin@relaxdevelopers.com` |
| Password | `admin123` |

Click **Sign In**.

You should see the dashboard with:
- Relax Tower project
- 22 phases listed
- Total Collection: ৳ 10.01 Cr
- Total Expense: ৳ 10.47 Cr
- Balance: −৳ 45.16 L

Uploaded company logos and project documents are stored locally under:

```text
public/uploads/[companyId]/
```

For production, move uploads to managed object storage before opening the system to external companies.

---

## How to stop the app

Go back to the cmd window and press **Ctrl + C**

---

## How to start the app again next time

You do not need to repeat all the steps. Just do:

1. Open `cmd`
2. Go to the project folder:
   ```
   cd %USERPROFILE%\Desktop\Sharebuild-ERP
   ```
3. Start the app:
   ```
   npm run dev
   ```
4. Open http://localhost:3000 in your browser

---

## Quick reference — all commands in order

```cmd
cd %USERPROFILE%\Desktop
git clone https://github.com/ibrahimquayum/Sharebuild-ERP.git
cd Sharebuild-ERP
git checkout feat/erp-v1
npm install
npx prisma migrate dev
npm run db:seed
npm run dev
```

Then open http://localhost:3000 and login with `admin@relaxdevelopers.com` / `admin123`

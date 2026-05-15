# Local Setup Guide — Sharebuild ERP

This is a **Next.js 14 + Prisma + PostgreSQL** application.  
It is **not** a PHP/Laravel app. Do not use XAMPP, Herd, or any PHP stack.

---

## Requirements

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | 18+ (20 recommended) | [nodejs.org](https://nodejs.org) |
| npm | 9+ | Included with Node.js |
| PostgreSQL | 14+ | Local install or cloud (Neon, Supabase, Railway) |
| Git | Any | [git-scm.com](https://git-scm.com) |

---

## Step 1 — Clone the repository

```bash
git clone https://github.com/ibrahimquayum/Sharebuild-ERP.git
cd Sharebuild-ERP
git checkout feat/erp-v1
```

---

## Step 2 — Install dependencies

```bash
npm install
```

This installs Next.js, Prisma, Radix UI, Tailwind, and all other packages.  
Requires internet access to npmjs.org.

---

## Step 3 — Configure environment

```bash
cp .env.example .env
```

Edit `.env` and set your database URL:

```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/sharebuild_erp"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="change-this-to-a-random-32-char-string"
```

**PostgreSQL: create the database first:**
```sql
CREATE DATABASE sharebuild_erp;
```

---

## Step 4 — Generate Prisma client

```bash
npm run db:generate
```

This reads `prisma/schema.prisma` and generates the TypeScript client.

---

## Step 5 — Run database migration

```bash
npx prisma migrate dev --name init
```

This creates all tables in your PostgreSQL database.  
On first run it will ask for a migration name — type `init`.

Alternative (faster, skips migration history):
```bash
npm run db:push
```

---

## Step 6 — Seed the database

```bash
npm run db:seed
```

This loads:
- Relax Tower project
- 22 construction phases (Piling → 8th Gathuni + Finishing draft)
- 10 sample buyers
- All income collections matching Excel Top Sheet totals
- Itemised expenses for Piling and Basement; summary entries for other phases

**Expected output:**
```
✅  Top Sheet totals MATCH Excel exactly.
  Total Income  : ৳ 100,143,800
  Total Expense : ৳ 104,659,890.40
  Balance       : -৳ 4,516,090.40
```

---

## Step 7 — Start development server

```bash
npm run dev
```

Open: [http://localhost:3000](http://localhost:3000)

**Login credentials:**
- Email: `admin@relaxdevelopers.com`
- Password: `admin123`

---

## Step 8 — Build for production

```bash
npm run build
npm start
```

---

## Common errors and fixes

### Error: `DATABASE_URL not set`
→ Make sure `.env` file exists and has the correct PostgreSQL URL.

### Error: `Can't reach database server`
→ Make sure PostgreSQL is running. On Windows: check Services → PostgreSQL.  
  On Mac: `brew services start postgresql@14`  
  On Linux: `sudo systemctl start postgresql`

### Error: `ECONNREFUSED 127.0.0.1:5432`
→ PostgreSQL is not running, or it's on a different port. Check your PostgreSQL installation.

### Error: `relation "companies" does not exist`
→ You haven't run `npx prisma migrate dev` yet.

### Error: `Cannot find module '@prisma/client'`
→ Run `npm install` then `npm run db:generate`.

### Error: `PrismaClientKnownRequestError: Unique constraint failed`
→ Re-running seed on existing data. The seed uses `deleteMany` for collections/expenses before re-seeding, but company/project/phases use upsert. It should be safe to re-run.  
  If still failing: `npx prisma migrate reset` (wipes database) then re-seed.

### Error: `Module not found: Can't resolve 'bcryptjs'`
→ Run `npm install`.

### Error on Windows: `EPERM` or path errors
→ Run your terminal as Administrator, or use WSL2 (Windows Subsystem for Linux).

### Error: `Invalid environment variables` on Vercel/deployment
→ Add all `.env` variables to your deployment platform's environment settings.

---

## Useful commands

```bash
npm run dev          # Start dev server (hot reload)
npm run build        # Production build
npm run lint         # ESLint check
npm run db:generate  # Regenerate Prisma client after schema changes
npm run db:push      # Push schema changes without migration history
npm run db:migrate   # Create and apply a new migration
npm run db:seed      # Seed the database with Relax Tower data
npm run db:studio    # Open Prisma Studio (visual DB browser)
npx prisma migrate reset  # ⚠️ WIPES database and re-seeds
```

---

## Project structure

```
Sharebuild-ERP/
├── prisma/
│   ├── schema.prisma      ← Database schema (all models)
│   └── seed.ts            ← Seed with Relax Tower data
├── src/
│   ├── app/
│   │   ├── (app)/         ← Protected pages (require login)
│   │   ├── (auth)/login/  ← Login page
│   │   └── api/           ← REST API routes
│   ├── components/
│   │   ├── layout/        ← Sidebar, Header
│   │   ├── shared/        ← StatCard, DataTable, PageHeader
│   │   └── ui/            ← Button, Card, Badge, Input, etc.
│   └── lib/
│       ├── auth.ts         ← NextAuth config
│       ├── prisma.ts       ← Prisma singleton
│       └── utils.ts        ← formatBDT, cn, etc.
├── .env.example
├── next.config.js
├── tailwind.config.ts
└── tsconfig.json
```

---

## Technology stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript 5 |
| Database ORM | Prisma 5 |
| Database | PostgreSQL 14+ |
| Auth | NextAuth.js 4 |
| UI | Tailwind CSS + Radix UI (shadcn pattern) |
| Forms | React Hook Form + Zod validation |
| Icons | Lucide React |
| Hosting | Vercel (recommended) or any Node.js host |

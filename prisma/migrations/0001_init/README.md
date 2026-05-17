# Migration 0001_init

This is the **baseline initial migration** for Sharebuild ERP.

It creates the complete database schema from scratch in a single migration.

## What it creates

- 16 PostgreSQL enums (UserRole, PhaseType, ExpenseCategory, etc.)
- 24 tables (companies, projects, phases, buyers, collections, expenses, supplier_payables, etc.)
- 73 foreign key constraints

## Why one migration instead of many

This project did not have a proper initial migration when it was first scaffolded.
The previous migration (`20260517000001_project_first_refactor`) was an incremental
ALTER TABLE migration that assumed the base tables already existed — they did not.

This single `0001_init` migration replaces that broken setup.

## How to apply

```bash
npx prisma migrate dev
```

On a fresh database this creates all tables in the correct order.
After this, run the seed:

```bash
npm run db:seed
```

## Checksum note

Prisma tracks this migration in the `_prisma_migrations` table. If you need to
re-apply on a database that already has the tables (e.g. after a manual db push),
run:

```bash
npx prisma migrate resolve --applied 0001_init
```

This marks the migration as applied without running the SQL again.

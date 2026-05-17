-- Migration: project_first_refactor
-- Adds projectId + phaseId to supplier_payables
-- Adds supplier_bill_items table
-- Adds ProjectStaffRole enum
-- Adds project_staff_assignments table

-- Step 1: Add ProjectStaffRole enum
CREATE TYPE "ProjectStaffRole" AS ENUM (
  'PROJECT_MANAGER',
  'SITE_ENGINEER',
  'SITE_SUPERVISOR',
  'ACCOUNTS_OFFICER',
  'COLLECTION_OFFICER',
  'DOCUMENT_OFFICER',
  'AUDITOR'
);

-- Step 2: Add projectId (nullable first to avoid NOT NULL violation on existing rows)
ALTER TABLE "supplier_payables" ADD COLUMN "projectId" TEXT;
ALTER TABLE "supplier_payables" ADD COLUMN "phaseId" TEXT;

-- Step 3: Backfill projectId for any existing supplier_payable rows.
-- Look up through expenses linked to the payable, or leave NULL and let the
-- app constraint be added only after backfill below.
-- (In a fresh dev DB with no supplier_payable rows this is a no-op.)
UPDATE "supplier_payables" sp
SET "projectId" = (
  SELECT ph."projectId"
  FROM "expenses" e
  JOIN "phases" ph ON ph.id = e."phaseId"
  WHERE e."payableId" = sp.id
  LIMIT 1
)
WHERE sp."projectId" IS NULL;

-- Step 4: Delete any supplier_payables still missing a projectId (orphaned rows).
DELETE FROM "supplier_payables" WHERE "projectId" IS NULL;

-- Step 5: Make projectId NOT NULL now that all rows have it (or were deleted)
ALTER TABLE "supplier_payables" ALTER COLUMN "projectId" SET NOT NULL;

-- Step 6: Add foreign key constraints
ALTER TABLE "supplier_payables"
  ADD CONSTRAINT "supplier_payables_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "supplier_payables"
  ADD CONSTRAINT "supplier_payables_phaseId_fkey"
  FOREIGN KEY ("phaseId") REFERENCES "phases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Step 7: Create supplier_bill_items table
CREATE TABLE "supplier_bill_items" (
  "id"          TEXT NOT NULL,
  "payableId"   TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "category"    "ExpenseCategory" NOT NULL DEFAULT 'OTHER',
  "quantity"    DECIMAL(65,30),
  "unit"        TEXT,
  "unitPrice"   DECIMAL(65,30),
  "amount"      DECIMAL(65,30) NOT NULL,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "supplier_bill_items_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "supplier_bill_items"
  ADD CONSTRAINT "supplier_bill_items_payableId_fkey"
  FOREIGN KEY ("payableId") REFERENCES "supplier_payables"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 8: Create project_staff_assignments table
CREATE TABLE "project_staff_assignments" (
  "id"          TEXT NOT NULL,
  "userId"      TEXT NOT NULL,
  "projectId"   TEXT NOT NULL,
  "projectRole" "ProjectStaffRole" NOT NULL DEFAULT 'SITE_ENGINEER',
  "isActive"    BOOLEAN NOT NULL DEFAULT true,
  "startDate"   TIMESTAMP(3),
  "endDate"     TIMESTAMP(3),
  "notes"       TEXT,
  "assignedBy"  TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL,

  CONSTRAINT "project_staff_assignments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "project_staff_assignments_userId_projectId_key" UNIQUE ("userId", "projectId")
);

ALTER TABLE "project_staff_assignments"
  ADD CONSTRAINT "project_staff_assignments_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "project_staff_assignments"
  ADD CONSTRAINT "project_staff_assignments_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

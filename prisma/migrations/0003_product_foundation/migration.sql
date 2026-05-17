-- Core product foundation: permission roles, richer unit states, and document metadata.

ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'MANAGEMENT';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'ACCOUNTS';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'COLLECTION_OFFICER';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'ENGINEER';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'SITE_SUPERVISOR';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'DOCUMENT_OFFICER';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'AUDITOR';

ALTER TYPE "UnitType" ADD VALUE IF NOT EXISTS 'SHOP';
ALTER TYPE "UnitType" ADD VALUE IF NOT EXISTS 'COMMON';
ALTER TYPE "UnitType" ADD VALUE IF NOT EXISTS 'UTILITY';

ALTER TYPE "UnitStatus" ADD VALUE IF NOT EXISTS 'HANDED_OVER';

CREATE TYPE "DocumentScope" AS ENUM (
  'PROJECT',
  'BUYER',
  'UNIT',
  'PHASE',
  'EXPENSE',
  'SUPPLIER_BILL',
  'SUBCONTRACTOR_BILL',
  'AUDIT'
);

CREATE TYPE "DocumentStatus" AS ENUM ('DRAFT', 'VERIFIED', 'REJECTED');

ALTER TABLE "unit_buyers"
  ADD COLUMN "isPayer" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "relationship" TEXT DEFAULT 'OWNER',
  ADD COLUMN "notes" TEXT;

ALTER TABLE "documents"
  ADD COLUMN "unitId" TEXT,
  ADD COLUMN "phaseId" TEXT,
  ADD COLUMN "payableId" TEXT,
  ADD COLUMN "uploadedById" TEXT,
  ADD COLUMN "title" TEXT,
  ADD COLUMN "category" TEXT,
  ADD COLUMN "scope" "DocumentScope" NOT NULL DEFAULT 'PROJECT',
  ADD COLUMN "status" "DocumentStatus" NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;

UPDATE "documents"
SET
  "scope" = CASE
    WHEN "expenseId" IS NOT NULL THEN 'EXPENSE'::"DocumentScope"
    WHEN "buyerId" IS NOT NULL THEN 'BUYER'::"DocumentScope"
    ELSE 'PROJECT'::"DocumentScope"
  END,
  "title" = COALESCE(NULLIF("description", ''), "fileName");

ALTER TABLE "documents"
  ADD CONSTRAINT "documents_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "units"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "documents_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "phases"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "documents_payableId_fkey" FOREIGN KEY ("payableId") REFERENCES "supplier_payables"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "documents_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "documents_projectId_scope_idx" ON "documents"("projectId", "scope");
CREATE INDEX "documents_buyerId_idx" ON "documents"("buyerId");
CREATE INDEX "documents_unitId_idx" ON "documents"("unitId");
CREATE INDEX "documents_phaseId_idx" ON "documents"("phaseId");
CREATE INDEX "documents_expenseId_idx" ON "documents"("expenseId");
CREATE INDEX "documents_payableId_idx" ON "documents"("payableId");

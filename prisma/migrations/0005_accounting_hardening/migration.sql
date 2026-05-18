-- Accounting hardening: auditable allocation, reversals, cheque state, and phase audit lock.

ALTER TABLE "phases"
  ADD COLUMN "auditLockedAt" TIMESTAMP(3),
  ADD COLUMN "auditLockedById" TEXT,
  ADD COLUMN "auditLockReason" TEXT;

ALTER TABLE "collections"
  ADD COLUMN "status" TEXT NOT NULL DEFAULT 'APPROVED',
  ADD COLUMN "reversedAt" TIMESTAMP(3),
  ADD COLUMN "reversedById" TEXT,
  ADD COLUMN "reversalReason" TEXT;

CREATE TABLE "collection_allocations" (
  "id" TEXT NOT NULL,
  "collectionId" TEXT NOT NULL,
  "demandId" TEXT NOT NULL,
  "amount" DECIMAL(65,30) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "collection_allocations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "collection_allocations_collectionId_idx" ON "collection_allocations"("collectionId");
CREATE INDEX "collection_allocations_demandId_idx" ON "collection_allocations"("demandId");

ALTER TABLE "collection_allocations"
  ADD CONSTRAINT "collection_allocations_collectionId_fkey"
  FOREIGN KEY ("collectionId") REFERENCES "collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "collection_allocations"
  ADD CONSTRAINT "collection_allocations_demandId_fkey"
  FOREIGN KEY ("demandId") REFERENCES "demands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "collection_allocations" ("id", "collectionId", "demandId", "amount", "createdAt")
SELECT concat('cla_', replace(c."id", '-', '')), c."id", c."demandId", c."amount", c."createdAt"
FROM "collections" c
WHERE c."demandId" IS NOT NULL;

ALTER TABLE "expenses"
  ADD COLUMN "reversedAt" TIMESTAMP(3),
  ADD COLUMN "reversedById" TEXT,
  ADD COLUMN "reversalReason" TEXT;

ALTER TABLE "supplier_payables"
  ADD COLUMN "reversedAt" TIMESTAMP(3),
  ADD COLUMN "reversedById" TEXT,
  ADD COLUMN "reversalReason" TEXT;

ALTER TABLE "supplier_payments"
  ADD COLUMN "status" TEXT NOT NULL DEFAULT 'CLEARED',
  ADD COLUMN "chequeStatus" TEXT,
  ADD COLUMN "reversedAt" TIMESTAMP(3),
  ADD COLUMN "reversedById" TEXT,
  ADD COLUMN "reversalReason" TEXT;

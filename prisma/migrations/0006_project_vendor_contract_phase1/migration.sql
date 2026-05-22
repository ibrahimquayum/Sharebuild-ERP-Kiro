-- CreateEnum
CREATE TYPE "ProjectVendorStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'COMPLETED', 'CANCELLED');

-- AlterTable
ALTER TABLE "documents" ADD COLUMN     "projectSubcontractorId" TEXT,
ADD COLUMN     "projectSupplierId" TEXT;

-- AlterTable
ALTER TABLE "supplier_payables" ADD COLUMN     "projectSubcontractorId" TEXT,
ADD COLUMN     "projectSupplierId" TEXT;

-- CreateTable
CREATE TABLE "project_suppliers" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "materialCategory" TEXT,
    "phaseNotes" TEXT,
    "paymentTerms" TEXT,
    "creditDays" INTEGER,
    "openingBalance" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "contractNo" TEXT,
    "contractDate" TIMESTAMP(3),
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "status" "ProjectVendorStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_subcontractors" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "workType" TEXT NOT NULL,
    "assignedPhaseId" TEXT,
    "contractAmount" DECIMAL(65,30),
    "extraWorkAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "paymentTerms" TEXT,
    "contractNo" TEXT,
    "contractDate" TIMESTAMP(3),
    "startDate" TIMESTAMP(3),
    "deadline" TIMESTAMP(3),
    "status" "ProjectVendorStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_subcontractors_pkey" PRIMARY KEY ("id")
);

-- Backfill supplier assignments from existing project payables so current vendor data stays visible.
INSERT INTO "project_suppliers" (
    "id",
    "companyId",
    "projectId",
    "supplierId",
    "status",
    "notes",
    "createdAt",
    "updatedAt"
)
SELECT
    'ps_' || md5(sp."projectId" || '_' || sp."supplierId"),
    p."companyId",
    sp."projectId",
    sp."supplierId",
    'ACTIVE'::"ProjectVendorStatus",
    'Backfilled from existing supplier bills during Phase 1 vendor-contract migration.',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM (
    SELECT DISTINCT "projectId", "supplierId"
    FROM "supplier_payables"
) sp
JOIN "suppliers" s ON s."id" = sp."supplierId"
JOIN "projects" p ON p."id" = sp."projectId"
WHERE s."supplierType" IN ('MATERIAL_SUPPLIER', 'EQUIPMENT_SUPPLIER', 'CONSULTANT')
  AND NOT EXISTS (
    SELECT 1
    FROM "project_suppliers" existing
    WHERE existing."projectId" = sp."projectId"
      AND existing."supplierId" = sp."supplierId"
  );

INSERT INTO "project_subcontractors" (
    "id",
    "companyId",
    "projectId",
    "supplierId",
    "workType",
    "status",
    "notes",
    "createdAt",
    "updatedAt"
)
SELECT
    'psc_' || md5(sp."projectId" || '_' || sp."supplierId"),
    p."companyId",
    sp."projectId",
    sp."supplierId",
    CASE
        WHEN s."supplierType" = 'LABOUR_CONTRACTOR' THEN 'LABOUR_SERVICE'
        ELSE 'OTHER'
    END,
    'ACTIVE'::"ProjectVendorStatus",
    'Backfilled from existing subcontractor bills during Phase 1 vendor-contract migration.',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM (
    SELECT DISTINCT "projectId", "supplierId"
    FROM "supplier_payables"
) sp
JOIN "suppliers" s ON s."id" = sp."supplierId"
JOIN "projects" p ON p."id" = sp."projectId"
WHERE s."supplierType" IN ('LABOUR_CONTRACTOR', 'SERVICE_PROVIDER')
  AND NOT EXISTS (
    SELECT 1
    FROM "project_subcontractors" existing
    WHERE existing."projectId" = sp."projectId"
      AND existing."supplierId" = sp."supplierId"
  );

UPDATE "supplier_payables" sp
SET "projectSupplierId" = ps."id"
FROM "project_suppliers" ps
WHERE sp."projectId" = ps."projectId"
  AND sp."supplierId" = ps."supplierId"
  AND sp."projectSupplierId" IS NULL;

UPDATE "supplier_payables" sp
SET "projectSubcontractorId" = psc."id"
FROM "project_subcontractors" psc
WHERE sp."projectId" = psc."projectId"
  AND sp."supplierId" = psc."supplierId"
  AND sp."projectSubcontractorId" IS NULL;

-- CreateIndex
CREATE INDEX "project_suppliers_companyId_projectId_status_idx" ON "project_suppliers"("companyId", "projectId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "project_suppliers_projectId_supplierId_key" ON "project_suppliers"("projectId", "supplierId");

-- CreateIndex
CREATE INDEX "project_subcontractors_companyId_projectId_status_idx" ON "project_subcontractors"("companyId", "projectId", "status");

-- CreateIndex
CREATE INDEX "project_subcontractors_projectId_supplierId_workType_idx" ON "project_subcontractors"("projectId", "supplierId", "workType");

-- CreateIndex
CREATE INDEX "documents_projectSupplierId_idx" ON "documents"("projectSupplierId");

-- CreateIndex
CREATE INDEX "documents_projectSubcontractorId_idx" ON "documents"("projectSubcontractorId");

-- CreateIndex
CREATE INDEX "supplier_payables_projectSupplierId_idx" ON "supplier_payables"("projectSupplierId");

-- CreateIndex
CREATE INDEX "supplier_payables_projectSubcontractorId_idx" ON "supplier_payables"("projectSubcontractorId");

-- AddForeignKey
ALTER TABLE "project_suppliers" ADD CONSTRAINT "project_suppliers_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_suppliers" ADD CONSTRAINT "project_suppliers_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_suppliers" ADD CONSTRAINT "project_suppliers_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_subcontractors" ADD CONSTRAINT "project_subcontractors_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_subcontractors" ADD CONSTRAINT "project_subcontractors_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_subcontractors" ADD CONSTRAINT "project_subcontractors_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_subcontractors" ADD CONSTRAINT "project_subcontractors_assignedPhaseId_fkey" FOREIGN KEY ("assignedPhaseId") REFERENCES "phases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_payables" ADD CONSTRAINT "supplier_payables_projectSupplierId_fkey" FOREIGN KEY ("projectSupplierId") REFERENCES "project_suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_payables" ADD CONSTRAINT "supplier_payables_projectSubcontractorId_fkey" FOREIGN KEY ("projectSubcontractorId") REFERENCES "project_subcontractors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_projectSupplierId_fkey" FOREIGN KEY ("projectSupplierId") REFERENCES "project_suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_projectSubcontractorId_fkey" FOREIGN KEY ("projectSubcontractorId") REFERENCES "project_subcontractors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

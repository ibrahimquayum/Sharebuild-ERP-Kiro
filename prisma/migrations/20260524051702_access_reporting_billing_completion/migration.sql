-- CreateEnum
CREATE TYPE "PermissionModule" AS ENUM ('DASHBOARD', 'PROJECTS', 'UNITS', 'BUYERS', 'DOCUMENTS', 'PHASES', 'DEMANDS', 'COLLECTIONS', 'EXPENSES', 'SUPPLIERS', 'SUBCONTRACTORS', 'ACCOUNTS', 'CHEQUES', 'SERVICE_CHARGE', 'FINAL_RECONCILIATION', 'REPORTS', 'AUDIT', 'SETTINGS', 'USERS');

-- CreateEnum
CREATE TYPE "DemandBatchStatus" AS ENUM ('DRAFT', 'ISSUED', 'CANCELLED', 'REVERSED');

-- CreateEnum
CREATE TYPE "DemandBatchBasisType" AS ENUM ('EQUAL_PER_UNIT', 'OWNERSHIP_SHARE', 'CUSTOM_BUYER_AMOUNT');

-- AlterTable
ALTER TABLE "demands" ADD COLUMN     "adjustmentAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "baseAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "carryForwardAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "demandBatchId" TEXT,
ADD COLUMN     "serviceChargeAmount" DECIMAL(65,30) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "companyRoleId" TEXT;

-- CreateTable
CREATE TABLE "company_roles" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "module" "PermissionModule" NOT NULL,
    "canView" BOOLEAN NOT NULL DEFAULT false,
    "canCreate" BOOLEAN NOT NULL DEFAULT false,
    "canEdit" BOOLEAN NOT NULL DEFAULT false,
    "canEditDraft" BOOLEAN NOT NULL DEFAULT false,
    "canApprove" BOOLEAN NOT NULL DEFAULT false,
    "canReverseAdjust" BOOLEAN NOT NULL DEFAULT false,
    "canDeleteDraft" BOOLEAN NOT NULL DEFAULT false,
    "canExport" BOOLEAN NOT NULL DEFAULT false,
    "canAuditAccess" BOOLEAN NOT NULL DEFAULT false,
    "canManageSettings" BOOLEAN NOT NULL DEFAULT false,
    "canManageUsers" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "demand_batches" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "phaseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "batchNo" TEXT,
    "basisType" "DemandBatchBasisType" NOT NULL DEFAULT 'EQUAL_PER_UNIT',
    "baseAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "serviceChargeEntryId" TEXT,
    "serviceChargeAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "adjustmentAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "carryForwardAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "totalBillableAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "dueDate" TIMESTAMP(3),
    "status" "DemandBatchStatus" NOT NULL DEFAULT 'DRAFT',
    "issuedAt" TIMESTAMP(3),
    "issuedById" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "demand_batches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "company_roles_companyId_isActive_idx" ON "company_roles"("companyId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "company_roles_companyId_name_key" ON "company_roles"("companyId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "company_roles_companyId_code_key" ON "company_roles"("companyId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "role_permissions_roleId_module_key" ON "role_permissions"("roleId", "module");

-- CreateIndex
CREATE INDEX "demand_batches_projectId_phaseId_status_idx" ON "demand_batches"("projectId", "phaseId", "status");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_companyRoleId_fkey" FOREIGN KEY ("companyRoleId") REFERENCES "company_roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_roles" ADD CONSTRAINT "company_roles_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "company_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "demand_batches" ADD CONSTRAINT "demand_batches_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "demand_batches" ADD CONSTRAINT "demand_batches_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "demand_batches" ADD CONSTRAINT "demand_batches_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "phases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "demand_batches" ADD CONSTRAINT "demand_batches_serviceChargeEntryId_fkey" FOREIGN KEY ("serviceChargeEntryId") REFERENCES "service_charge_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "demands" ADD CONSTRAINT "demands_demandBatchId_fkey" FOREIGN KEY ("demandBatchId") REFERENCES "demand_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

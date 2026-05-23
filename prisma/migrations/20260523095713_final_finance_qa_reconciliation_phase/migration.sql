-- CreateEnum
CREATE TYPE "ServiceChargeStatus" AS ENUM ('DRAFT', 'CALCULATED', 'APPROVED', 'REVERSED');

-- CreateEnum
CREATE TYPE "DemandType" AS ENUM ('REGULAR', 'FINAL_RECONCILIATION');

-- CreateEnum
CREATE TYPE "FinalReconciliationType" AS ENUM ('DEFICIT_DEMAND', 'SURPLUS_CREDIT', 'ZERO_BALANCE');

-- CreateEnum
CREATE TYPE "FinalReconciliationStatus" AS ENUM ('DRAFT', 'POSTED', 'REVERSED');

-- AlterTable
ALTER TABLE "demands" ADD COLUMN     "demandType" "DemandType" NOT NULL DEFAULT 'REGULAR',
ADD COLUMN     "finalReconciliationId" TEXT;

-- CreateTable
CREATE TABLE "service_charge_entries" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "phaseId" TEXT,
    "basisType" "ServiceChargeBasis" NOT NULL,
    "basisAmount" DECIMAL(65,30) NOT NULL,
    "percentage" DECIMAL(65,30),
    "manualAmount" DECIMAL(65,30),
    "serviceChargeAmount" DECIMAL(65,30) NOT NULL,
    "includedInDemand" BOOLEAN NOT NULL DEFAULT false,
    "status" "ServiceChargeStatus" NOT NULL DEFAULT 'DRAFT',
    "calculatedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "reversedAt" TIMESTAMP(3),
    "reversedById" TEXT,
    "reversalReason" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_charge_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "final_reconciliations" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "type" "FinalReconciliationType" NOT NULL,
    "status" "FinalReconciliationStatus" NOT NULL DEFAULT 'DRAFT',
    "totalDemand" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "totalCollection" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "totalCost" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "totalPayable" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "totalRetention" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "totalServiceCharge" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "totalTaxDeduction" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "finalAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "postedAt" TIMESTAMP(3),
    "postedById" TEXT,
    "reversedAt" TIMESTAMP(3),
    "reversedById" TEXT,
    "reversalReason" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "final_reconciliations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "final_reconciliation_lines" (
    "id" TEXT NOT NULL,
    "reconciliationId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "projectBuyerId" TEXT,
    "unitId" TEXT,
    "ownershipShare" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "amount" DECIMAL(65,30) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "final_reconciliation_lines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "service_charge_entries_projectId_status_idx" ON "service_charge_entries"("projectId", "status");

-- CreateIndex
CREATE INDEX "service_charge_entries_projectId_phaseId_idx" ON "service_charge_entries"("projectId", "phaseId");

-- CreateIndex
CREATE INDEX "final_reconciliations_projectId_status_idx" ON "final_reconciliations"("projectId", "status");

-- CreateIndex
CREATE INDEX "final_reconciliation_lines_reconciliationId_idx" ON "final_reconciliation_lines"("reconciliationId");

-- CreateIndex
CREATE INDEX "final_reconciliation_lines_buyerId_idx" ON "final_reconciliation_lines"("buyerId");

-- CreateIndex
CREATE INDEX "demands_demandType_finalReconciliationId_idx" ON "demands"("demandType", "finalReconciliationId");

-- AddForeignKey
ALTER TABLE "demands" ADD CONSTRAINT "demands_finalReconciliationId_fkey" FOREIGN KEY ("finalReconciliationId") REFERENCES "final_reconciliations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_charge_entries" ADD CONSTRAINT "service_charge_entries_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_charge_entries" ADD CONSTRAINT "service_charge_entries_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_charge_entries" ADD CONSTRAINT "service_charge_entries_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "phases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_charge_entries" ADD CONSTRAINT "service_charge_entries_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_charge_entries" ADD CONSTRAINT "service_charge_entries_reversedById_fkey" FOREIGN KEY ("reversedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "final_reconciliations" ADD CONSTRAINT "final_reconciliations_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "final_reconciliations" ADD CONSTRAINT "final_reconciliations_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "final_reconciliations" ADD CONSTRAINT "final_reconciliations_postedById_fkey" FOREIGN KEY ("postedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "final_reconciliations" ADD CONSTRAINT "final_reconciliations_reversedById_fkey" FOREIGN KEY ("reversedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "final_reconciliation_lines" ADD CONSTRAINT "final_reconciliation_lines_reconciliationId_fkey" FOREIGN KEY ("reconciliationId") REFERENCES "final_reconciliations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "final_reconciliation_lines" ADD CONSTRAINT "final_reconciliation_lines_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "buyers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "final_reconciliation_lines" ADD CONSTRAINT "final_reconciliation_lines_projectBuyerId_fkey" FOREIGN KEY ("projectBuyerId") REFERENCES "project_buyers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "final_reconciliation_lines" ADD CONSTRAINT "final_reconciliation_lines_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

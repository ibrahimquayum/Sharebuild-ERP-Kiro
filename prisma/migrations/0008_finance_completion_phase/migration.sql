-- CreateEnum
CREATE TYPE "RetentionType" AS ENUM ('NONE', 'FIXED', 'PERCENTAGE');

-- CreateEnum
CREATE TYPE "RetentionStatus" AS ENUM ('NOT_APPLICABLE', 'HELD', 'PARTIALLY_RELEASED', 'RELEASED', 'FORFEITED');

-- CreateEnum
CREATE TYPE "ServiceChargeBasis" AS ENUM ('PROJECT_DEFAULT', 'PHASE_TOTAL_COST', 'DIRECT_EXPENSE', 'SUPPLIER_BILLS', 'SUBCONTRACTOR_BILLS', 'MANUAL');

-- AlterTable
ALTER TABLE "supplier_payables" ADD COLUMN     "aitTdsAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "aitTdsPct" DECIMAL(65,30) DEFAULT 0,
ADD COLUMN     "deductionNote" TEXT,
ADD COLUMN     "deductionReference" TEXT,
ADD COLUMN     "includedInBuyerDemand" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "netPayableAmount" DECIMAL(65,30),
ADD COLUMN     "otherDeductionAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "retentionAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "retentionPct" DECIMAL(65,30) DEFAULT 0,
ADD COLUMN     "retentionReleaseDate" TIMESTAMP(3),
ADD COLUMN     "retentionReleasedAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "retentionStatus" "RetentionStatus" NOT NULL DEFAULT 'NOT_APPLICABLE',
ADD COLUMN     "retentionType" "RetentionType" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "serviceChargeAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "serviceChargeBasis" "ServiceChargeBasis",
ADD COLUMN     "vatAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "vatPct" DECIMAL(65,30) DEFAULT 0;

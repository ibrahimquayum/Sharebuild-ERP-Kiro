-- CreateEnum
CREATE TYPE "ServiceChargeSettlementStatus" AS ENUM ('UNSETTLED', 'INCLUDED_IN_DEMAND', 'SETTLED');

-- CreateEnum
CREATE TYPE "ReconciliationCreditSettlementStatus" AS ENUM ('NOT_APPLICABLE', 'OPEN_CREDIT', 'KEPT_AS_ADVANCE', 'REFUNDED', 'ADJUSTED');

-- AlterTable
ALTER TABLE "final_reconciliation_lines" ADD COLUMN     "settledAt" TIMESTAMP(3),
ADD COLUMN     "settledById" TEXT,
ADD COLUMN     "settlementAccountId" TEXT,
ADD COLUMN     "settlementMethod" "PaymentMethod",
ADD COLUMN     "settlementNote" TEXT,
ADD COLUMN     "settlementReference" TEXT,
ADD COLUMN     "settlementStatus" "ReconciliationCreditSettlementStatus" NOT NULL DEFAULT 'NOT_APPLICABLE';

-- AlterTable
ALTER TABLE "service_charge_entries" ADD COLUMN     "settledAt" TIMESTAMP(3),
ADD COLUMN     "settledById" TEXT,
ADD COLUMN     "settlementAccountId" TEXT,
ADD COLUMN     "settlementMethod" "PaymentMethod",
ADD COLUMN     "settlementReference" TEXT,
ADD COLUMN     "settlementStatus" "ServiceChargeSettlementStatus" NOT NULL DEFAULT 'UNSETTLED';

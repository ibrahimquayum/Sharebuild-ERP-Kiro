-- CreateEnum
CREATE TYPE "CashBankAccountType" AS ENUM ('CASH', 'BANK', 'MOBILE_BANKING', 'CHEQUE_CLEARING', 'OTHER');

-- CreateEnum
CREATE TYPE "MobileBankingProvider" AS ENUM ('BKASH', 'NAGAD', 'ROCKET', 'OTHER');

-- CreateEnum
CREATE TYPE "CashBankTransactionType" AS ENUM ('INFLOW', 'OUTFLOW', 'TRANSFER_IN', 'TRANSFER_OUT', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "CashBankSourceType" AS ENUM ('BUYER_COLLECTION', 'DIRECT_EXPENSE', 'SUPPLIER_PAYMENT', 'SUBCONTRACTOR_PAYMENT', 'ACCOUNT_TRANSFER', 'OPENING_BALANCE', 'ADJUSTMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "CashBankTransactionStatus" AS ENUM ('DRAFT', 'POSTED', 'REVERSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CashBankPartyType" AS ENUM ('BUYER', 'SUPPLIER', 'SUBCONTRACTOR', 'LOCAL_SHOP', 'COMPANY', 'OTHER');

-- CreateEnum
CREATE TYPE "ChequeType" AS ENUM ('ISSUED', 'RECEIVED');

-- CreateEnum
CREATE TYPE "ChequeStatus" AS ENUM ('PENDING', 'CLEARED', 'BOUNCED', 'CANCELLED', 'REPLACED');

-- CreateEnum
CREATE TYPE "AccountTransferStatus" AS ENUM ('POSTED', 'REVERSED', 'CANCELLED');

-- AlterTable
ALTER TABLE "collections" ADD COLUMN     "accountId" TEXT,
ADD COLUMN     "chequeBranchName" TEXT,
ADD COLUMN     "chequeMaturityDate" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "expenses" ADD COLUMN     "accountId" TEXT,
ADD COLUMN     "chequeBankName" TEXT,
ADD COLUMN     "chequeBranchName" TEXT,
ADD COLUMN     "chequeDate" TIMESTAMP(3),
ADD COLUMN     "chequeMaturityDate" TIMESTAMP(3),
ADD COLUMN     "chequeNo" TEXT,
ADD COLUMN     "referenceNo" TEXT;

-- AlterTable
ALTER TABLE "supplier_payments" ADD COLUMN     "accountId" TEXT,
ADD COLUMN     "chequeBranchName" TEXT,
ADD COLUMN     "chequeMaturityDate" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "cash_bank_accounts" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "CashBankAccountType" NOT NULL,
    "bankName" TEXT,
    "branchName" TEXT,
    "accountNumber" TEXT,
    "accountHolderName" TEXT,
    "mobileProvider" "MobileBankingProvider",
    "openingBalance" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'BDT',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cash_bank_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_bank_transactions" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "projectId" TEXT,
    "accountId" TEXT NOT NULL,
    "type" "CashBankTransactionType" NOT NULL,
    "sourceType" "CashBankSourceType" NOT NULL,
    "sourceId" TEXT,
    "partyType" "CashBankPartyType",
    "partyId" TEXT,
    "partyName" TEXT,
    "amount" DECIMAL(65,30) NOT NULL,
    "transactionDate" TIMESTAMP(3) NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'CASH',
    "referenceNo" TEXT,
    "description" TEXT,
    "status" "CashBankTransactionStatus" NOT NULL DEFAULT 'POSTED',
    "createdById" TEXT,
    "reversedAt" TIMESTAMP(3),
    "reversedById" TEXT,
    "reversalReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cash_bank_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cheque_logs" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "projectId" TEXT,
    "accountId" TEXT,
    "chequeType" "ChequeType" NOT NULL,
    "chequeNo" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "branchName" TEXT,
    "chequeDate" TIMESTAMP(3) NOT NULL,
    "maturityDate" TIMESTAMP(3),
    "amount" DECIMAL(65,30) NOT NULL,
    "partyType" "CashBankPartyType" NOT NULL,
    "partyId" TEXT,
    "partyName" TEXT,
    "sourceType" "CashBankSourceType" NOT NULL,
    "sourceId" TEXT,
    "status" "ChequeStatus" NOT NULL DEFAULT 'PENDING',
    "clearedDate" TIMESTAMP(3),
    "bouncedDate" TIMESTAMP(3),
    "cancelledDate" TIMESTAMP(3),
    "replacementChequeId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cheque_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account_transfers" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "fromAccountId" TEXT NOT NULL,
    "toAccountId" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "transferDate" TIMESTAMP(3) NOT NULL,
    "referenceNo" TEXT,
    "notes" TEXT,
    "status" "AccountTransferStatus" NOT NULL DEFAULT 'POSTED',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cash_bank_accounts_companyId_isActive_idx" ON "cash_bank_accounts"("companyId", "isActive");

-- CreateIndex
CREATE INDEX "cash_bank_transactions_companyId_accountId_status_idx" ON "cash_bank_transactions"("companyId", "accountId", "status");

-- CreateIndex
CREATE INDEX "cash_bank_transactions_projectId_status_idx" ON "cash_bank_transactions"("projectId", "status");

-- CreateIndex
CREATE INDEX "cash_bank_transactions_sourceType_sourceId_idx" ON "cash_bank_transactions"("sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "cheque_logs_companyId_status_idx" ON "cheque_logs"("companyId", "status");

-- CreateIndex
CREATE INDEX "cheque_logs_projectId_status_idx" ON "cheque_logs"("projectId", "status");

-- CreateIndex
CREATE INDEX "cheque_logs_sourceType_sourceId_idx" ON "cheque_logs"("sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "account_transfers_companyId_status_idx" ON "account_transfers"("companyId", "status");

-- AddForeignKey
ALTER TABLE "collections" ADD CONSTRAINT "collections_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "cash_bank_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "cash_bank_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_payments" ADD CONSTRAINT "supplier_payments_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "cash_bank_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_bank_accounts" ADD CONSTRAINT "cash_bank_accounts_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_bank_transactions" ADD CONSTRAINT "cash_bank_transactions_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_bank_transactions" ADD CONSTRAINT "cash_bank_transactions_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_bank_transactions" ADD CONSTRAINT "cash_bank_transactions_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "cash_bank_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_bank_transactions" ADD CONSTRAINT "cash_bank_transactions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_bank_transactions" ADD CONSTRAINT "cash_bank_transactions_reversedById_fkey" FOREIGN KEY ("reversedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cheque_logs" ADD CONSTRAINT "cheque_logs_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cheque_logs" ADD CONSTRAINT "cheque_logs_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cheque_logs" ADD CONSTRAINT "cheque_logs_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "cash_bank_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cheque_logs" ADD CONSTRAINT "cheque_logs_replacementChequeId_fkey" FOREIGN KEY ("replacementChequeId") REFERENCES "cheque_logs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_transfers" ADD CONSTRAINT "account_transfers_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_transfers" ADD CONSTRAINT "account_transfers_fromAccountId_fkey" FOREIGN KEY ("fromAccountId") REFERENCES "cash_bank_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_transfers" ADD CONSTRAINT "account_transfers_toAccountId_fkey" FOREIGN KEY ("toAccountId") REFERENCES "cash_bank_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_transfers" ADD CONSTRAINT "account_transfers_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

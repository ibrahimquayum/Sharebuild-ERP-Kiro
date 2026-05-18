ALTER TABLE "expenses"
ADD COLUMN "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'CASH',
ADD COLUMN "supplierMode" TEXT DEFAULT 'NO_SUPPLIER',
ADD COLUMN "localShopName" TEXT,
ADD COLUMN "localShopPhone" TEXT;

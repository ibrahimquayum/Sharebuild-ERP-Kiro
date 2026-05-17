-- ============================================================
-- Sharebuild ERP — Initial migration (0001_init)
-- Creates the complete schema from scratch on a fresh database.
-- Generated from prisma/schema.prisma (current full schema).
-- Run:  npx prisma migrate dev
-- ============================================================

-- ─── ENUMS ─────────────────────────────────────────────────

CREATE TYPE "UserRole" AS ENUM (
  'SUPER_ADMIN',
  'COMPANY_ADMIN',
  'MANAGER',
  'ACCOUNTANT',
  'SITE_ENGINEER',
  'VIEWER'
);

CREATE TYPE "ProjectStatus" AS ENUM (
  'PLANNING',
  'ACTIVE',
  'ON_HOLD',
  'COMPLETED',
  'CANCELLED'
);

CREATE TYPE "PhaseType" AS ENUM (
  'PILING',
  'BASEMENT',
  'SLAB',
  'HALF_SLAB',
  'GATHUNI',
  'SANITARY',
  'FINISHING',
  'CUSTOM'
);

CREATE TYPE "PhaseStatus" AS ENUM (
  'DRAFT',
  'ACTIVE',
  'APPROVED',
  'INCLUDED_IN_SUMMARY',
  'EXCLUDED_FROM_SUMMARY',
  'CANCELLED',
  'DUPLICATE'
);

CREATE TYPE "UnitType" AS ENUM (
  'FLAT',
  'COMMERCIAL',
  'PARKING',
  'ROOF',
  'LAND_SHARE'
);

CREATE TYPE "UnitStatus" AS ENUM (
  'AVAILABLE',
  'BOOKED',
  'SOLD',
  'REGISTERED',
  'DISPUTED'
);

CREATE TYPE "BuyerStatus" AS ENUM (
  'PROSPECT',
  'ACTIVE',
  'DEFAULTER',
  'COMPLETED',
  'CANCELLED'
);

CREATE TYPE "PaymentMethod" AS ENUM (
  'CASH',
  'CHEQUE',
  'BANK_TRANSFER',
  'MOBILE_BANKING',
  'OTHER'
);

CREATE TYPE "TransactionType" AS ENUM (
  'COLLECTION',
  'REFUND',
  'ADJUSTMENT'
);

CREATE TYPE "ExpenseCategory" AS ENUM (
  'ROD_STEEL',
  'CEMENT',
  'STONE_AGGREGATE',
  'SAND',
  'BRICK',
  'READYMIX_CONCRETE',
  'TIMBER_SHUTTERING',
  'PAINT',
  'TILES',
  'SANITARY_FITTINGS',
  'ELECTRICAL_MATERIAL',
  'HARDWARE',
  'CHEMICAL',
  'LABOUR_BILL',
  'CONTRACTOR_BILL',
  'SECURITY_SALARY',
  'SITE_STAFF_SALARY',
  'WATER_BILL',
  'ELECTRICITY_BILL',
  'SITE_FOOD_HOSPITALITY',
  'TRANSPORT',
  'EQUIPMENT_HIRE',
  'SURVEY_DRAWING',
  'LEGAL_REGISTRATION',
  'MUNICIPALITY_FEE',
  'BANK_CHARGE',
  'SERVICE_CHARGE',
  'OTHER'
);

CREATE TYPE "ExpenseStatus" AS ENUM (
  'PENDING_APPROVAL',
  'APPROVED',
  'PAID',
  'PARTIALLY_PAID',
  'DISPUTED',
  'CANCELLED'
);

CREATE TYPE "SupplierType" AS ENUM (
  'MATERIAL_SUPPLIER',
  'LABOUR_CONTRACTOR',
  'EQUIPMENT_SUPPLIER',
  'SERVICE_PROVIDER',
  'CONSULTANT'
);

CREATE TYPE "PayableStatus" AS ENUM (
  'UNPAID',
  'PARTIALLY_PAID',
  'PAID',
  'DISPUTED',
  'WRITTEN_OFF'
);

CREATE TYPE "DemandStatus" AS ENUM (
  'DRAFT',
  'ISSUED',
  'PARTIALLY_PAID',
  'FULLY_PAID',
  'OVERDUE',
  'CANCELLED'
);

CREATE TYPE "AuditAction" AS ENUM (
  'CREATE',
  'UPDATE',
  'DELETE',
  'APPROVE',
  'REJECT',
  'LOGIN',
  'LOGOUT'
);

CREATE TYPE "ProjectStaffRole" AS ENUM (
  'PROJECT_MANAGER',
  'SITE_ENGINEER',
  'SITE_SUPERVISOR',
  'ACCOUNTS_OFFICER',
  'COLLECTION_OFFICER',
  'DOCUMENT_OFFICER',
  'AUDITOR'
);

-- ─── TABLES ────────────────────────────────────────────────

CREATE TABLE "companies" (
  "id"             TEXT         NOT NULL,
  "name"           TEXT         NOT NULL,
  "nameBn"         TEXT,
  "registrationNo" TEXT,
  "address"        TEXT,
  "addressBn"      TEXT,
  "phone"          TEXT,
  "email"          TEXT,
  "logoUrl"        TEXT,
  "website"        TEXT,
  "taxId"          TEXT,
  "isActive"       BOOLEAN      NOT NULL DEFAULT true,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL,
  CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "company_settings" (
  "id"        TEXT         NOT NULL,
  "companyId" TEXT         NOT NULL,
  "key"       TEXT         NOT NULL,
  "value"     TEXT         NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "company_settings_pkey"        PRIMARY KEY ("id"),
  CONSTRAINT "company_settings_companyId_key_key" UNIQUE ("companyId", "key")
);

CREATE TABLE "users" (
  "id"           TEXT         NOT NULL,
  "companyId"    TEXT,
  "name"         TEXT         NOT NULL,
  "nameBn"       TEXT,
  "email"        TEXT         NOT NULL,
  "phone"        TEXT,
  "passwordHash" TEXT         NOT NULL,
  "role"         "UserRole"   NOT NULL DEFAULT 'VIEWER',
  "isActive"     BOOLEAN      NOT NULL DEFAULT true,
  "lastLoginAt"  TIMESTAMP(3),
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL,
  CONSTRAINT "users_pkey"       PRIMARY KEY ("id"),
  CONSTRAINT "users_email_key"  UNIQUE ("email")
);

CREATE TABLE "project_user_access" (
  "id"        TEXT         NOT NULL,
  "userId"    TEXT         NOT NULL,
  "projectId" TEXT         NOT NULL,
  "role"      "UserRole"   NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "project_user_access_pkey"            PRIMARY KEY ("id"),
  CONSTRAINT "project_user_access_userId_projectId_key" UNIQUE ("userId", "projectId")
);

CREATE TABLE "projects" (
  "id"              TEXT            NOT NULL,
  "companyId"       TEXT            NOT NULL,
  "name"            TEXT            NOT NULL,
  "nameBn"          TEXT,
  "code"            TEXT,
  "address"         TEXT,
  "addressBn"       TEXT,
  "area"            TEXT,
  "city"            TEXT                     DEFAULT 'Dhaka',
  "postCode"        TEXT,
  "phone"           TEXT,
  "totalFloors"     INTEGER,
  "status"          "ProjectStatus"  NOT NULL DEFAULT 'ACTIVE',
  "startDate"       TIMESTAMP(3),
  "expectedEndDate" TIMESTAMP(3),
  "actualEndDate"   TIMESTAMP(3),
  "description"     TEXT,
  "createdAt"       TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3)    NOT NULL,
  CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "lands" (
  "id"               TEXT            NOT NULL,
  "projectId"        TEXT            NOT NULL,
  "plotNo"           TEXT,
  "mouza"            TEXT,
  "khatian"          TEXT,
  "dag"              TEXT,
  "totalArea"        DECIMAL(65,30),
  "areaUnit"         TEXT                     DEFAULT 'katha',
  "purchasePrice"    DECIMAL(65,30),
  "registrationDate" TIMESTAMP(3),
  "registrationCost" DECIMAL(65,30),
  "notes"            TEXT,
  "createdAt"        TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3)    NOT NULL,
  CONSTRAINT "lands_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "land_shares" (
  "id"          TEXT          NOT NULL,
  "landId"      TEXT          NOT NULL,
  "buyerId"     TEXT          NOT NULL,
  "sharePercent" DECIMAL(65,30) NOT NULL,
  "shareArea"   DECIMAL(65,30),
  "salePrice"   DECIMAL(65,30),
  "notes"       TEXT,
  CONSTRAINT "land_shares_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "units" (
  "id"              TEXT         NOT NULL,
  "projectId"       TEXT         NOT NULL,
  "floor"           INTEGER,
  "unitNo"          TEXT         NOT NULL,
  "unitType"        "UnitType"   NOT NULL DEFAULT 'FLAT',
  "status"          "UnitStatus" NOT NULL DEFAULT 'AVAILABLE',
  "sizesqft"        DECIMAL(65,30),
  "facing"          TEXT,
  "agreedPrice"     DECIMAL(65,30),
  "registrationFee" DECIMAL(65,30),
  "utilityCharge"   DECIMAL(65,30),
  "notes"           TEXT,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL,
  CONSTRAINT "units_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "unit_buyers" (
  "id"          TEXT          NOT NULL,
  "unitId"      TEXT          NOT NULL,
  "buyerId"     TEXT          NOT NULL,
  "sharePercent" DECIMAL(65,30) NOT NULL DEFAULT 100,
  "isPrimary"   BOOLEAN       NOT NULL DEFAULT true,
  "assignedAt"  TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "unit_buyers_pkey"          PRIMARY KEY ("id"),
  CONSTRAINT "unit_buyers_unitId_buyerId_key" UNIQUE ("unitId", "buyerId")
);

CREATE TABLE "buyers" (
  "id"          TEXT          NOT NULL,
  "companyId"   TEXT          NOT NULL,
  "name"        TEXT          NOT NULL,
  "nameBn"      TEXT,
  "fatherName"  TEXT,
  "phone"       TEXT,
  "phone2"      TEXT,
  "email"       TEXT,
  "nidNo"       TEXT,
  "address"     TEXT,
  "addressBn"   TEXT,
  "status"      "BuyerStatus" NOT NULL DEFAULT 'ACTIVE',
  "notes"       TEXT,
  "createdAt"   TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3)  NOT NULL,
  CONSTRAINT "buyers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "project_buyers" (
  "id"        TEXT         NOT NULL,
  "projectId" TEXT         NOT NULL,
  "buyerId"   TEXT         NOT NULL,
  "joinedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "notes"     TEXT,
  CONSTRAINT "project_buyers_pkey"                 PRIMARY KEY ("id"),
  CONSTRAINT "project_buyers_projectId_buyerId_key" UNIQUE ("projectId", "buyerId")
);

CREATE TABLE "phases" (
  "id"               TEXT          NOT NULL,
  "projectId"        TEXT          NOT NULL,
  "name"             TEXT          NOT NULL,
  "nameBn"           TEXT,
  "phaseType"        "PhaseType"   NOT NULL DEFAULT 'SLAB',
  "floorNo"          INTEGER,
  "status"           "PhaseStatus" NOT NULL DEFAULT 'DRAFT',
  "sequence"         INTEGER       NOT NULL DEFAULT 0,
  "workDesc"         TEXT,
  "workDescBn"       TEXT,
  "startDate"        TIMESTAMP(3),
  "endDate"          TIMESTAMP(3),
  "serviceChargePct" DECIMAL(65,30)          DEFAULT 0,
  "notes"            TEXT,
  "createdAt"        TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3)  NOT NULL,
  CONSTRAINT "phases_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "demands" (
  "id"        TEXT           NOT NULL,
  "unitId"    TEXT           NOT NULL,
  "buyerId"   TEXT           NOT NULL,
  "phaseId"   TEXT,
  "demandNo"  TEXT,
  "title"     TEXT           NOT NULL,
  "titleBn"   TEXT,
  "amount"    DECIMAL(65,30) NOT NULL,
  "dueDate"   TIMESTAMP(3),
  "status"    "DemandStatus" NOT NULL DEFAULT 'DRAFT',
  "issuedAt"  TIMESTAMP(3),
  "notes"     TEXT,
  "createdAt" TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3)   NOT NULL,
  CONSTRAINT "demands_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "collections" (
  "id"              TEXT              NOT NULL,
  "phaseId"         TEXT              NOT NULL,
  "buyerId"         TEXT              NOT NULL,
  "demandId"        TEXT,
  "receiptNo"       TEXT,
  "amount"          DECIMAL(65,30)    NOT NULL,
  "paymentMethod"   "PaymentMethod"   NOT NULL DEFAULT 'CASH',
  "transactionType" "TransactionType" NOT NULL DEFAULT 'COLLECTION',
  "chequeNo"        TEXT,
  "chequeDate"      TIMESTAMP(3),
  "bankName"        TEXT,
  "reference"       TEXT,
  "receivedDate"    TIMESTAMP(3)      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "notes"           TEXT,
  "createdAt"       TIMESTAMP(3)      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3)      NOT NULL,
  CONSTRAINT "collections_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "suppliers" (
  "id"            TEXT          NOT NULL,
  "companyId"     TEXT          NOT NULL,
  "name"          TEXT          NOT NULL,
  "nameBn"        TEXT,
  "supplierType"  "SupplierType" NOT NULL DEFAULT 'MATERIAL_SUPPLIER',
  "phone"         TEXT,
  "email"         TEXT,
  "address"       TEXT,
  "contactPerson" TEXT,
  "bankName"      TEXT,
  "bankAccount"   TEXT,
  "notes"         TEXT,
  "isActive"      BOOLEAN       NOT NULL DEFAULT true,
  "createdAt"     TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3)  NOT NULL,
  CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);


CREATE TABLE "supplier_payables" (
  "id"          TEXT            NOT NULL,
  "supplierId"  TEXT            NOT NULL,
  "projectId"   TEXT            NOT NULL,
  "phaseId"     TEXT,
  "billNo"      TEXT,
  "billDate"    TIMESTAMP(3)    NOT NULL,
  "totalAmount" DECIMAL(65,30)  NOT NULL,
  "paidAmount"  DECIMAL(65,30)  NOT NULL DEFAULT 0,
  "dueAmount"   DECIMAL(65,30)  NOT NULL,
  "dueDate"     TIMESTAMP(3),
  "status"      "PayableStatus" NOT NULL DEFAULT 'UNPAID',
  "notes"       TEXT,
  "createdAt"   TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3)    NOT NULL,
  CONSTRAINT "supplier_payables_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "supplier_bill_items" (
  "id"          TEXT              NOT NULL,
  "payableId"   TEXT              NOT NULL,
  "description" TEXT              NOT NULL,
  "category"    "ExpenseCategory" NOT NULL DEFAULT 'OTHER',
  "quantity"    DECIMAL(65,30),
  "unit"        TEXT,
  "unitPrice"   DECIMAL(65,30),
  "amount"      DECIMAL(65,30)    NOT NULL,
  "createdAt"   TIMESTAMP(3)      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "supplier_bill_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "supplier_payments" (
  "id"            TEXT            NOT NULL,
  "payableId"     TEXT            NOT NULL,
  "amount"        DECIMAL(65,30)  NOT NULL,
  "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'BANK_TRANSFER',
  "chequeNo"      TEXT,
  "chequeDate"    TIMESTAMP(3),
  "bankName"      TEXT,
  "reference"     TEXT,
  "paidAt"        TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "notes"         TEXT,
  "createdAt"     TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "supplier_payments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "expenses" (
  "id"            TEXT              NOT NULL,
  "phaseId"       TEXT              NOT NULL,
  "supplierId"    TEXT,
  "category"      "ExpenseCategory" NOT NULL,
  "description"   TEXT              NOT NULL,
  "descriptionBn" TEXT,
  "amount"        DECIMAL(65,30)    NOT NULL,
  "quantity"      DECIMAL(65,30),
  "unit"          TEXT,
  "unitPrice"     DECIMAL(65,30),
  "status"        "ExpenseStatus"   NOT NULL DEFAULT 'PENDING_APPROVAL',
  "expenseDate"   TIMESTAMP(3)      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "billNo"        TEXT,
  "payableId"     TEXT,
  "createdById"   TEXT              NOT NULL,
  "approvedById"  TEXT,
  "approvedAt"    TIMESTAMP(3),
  "notes"         TEXT,
  "createdAt"     TIMESTAMP(3)      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3)      NOT NULL,
  CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "material_items" (
  "id"            TEXT              NOT NULL,
  "phaseId"       TEXT              NOT NULL,
  "supplierId"    TEXT,
  "category"      "ExpenseCategory" NOT NULL,
  "description"   TEXT              NOT NULL,
  "descriptionBn" TEXT,
  "quantity"      DECIMAL(65,30)    NOT NULL,
  "unit"          TEXT              NOT NULL,
  "unitPrice"     DECIMAL(65,30)    NOT NULL,
  "totalAmount"   DECIMAL(65,30)    NOT NULL,
  "purchaseDate"  TIMESTAMP(3)      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "billNo"        TEXT,
  "notes"         TEXT,
  "createdAt"     TIMESTAMP(3)      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3)      NOT NULL,
  CONSTRAINT "material_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "documents" (
  "id"          TEXT         NOT NULL,
  "projectId"   TEXT,
  "buyerId"     TEXT,
  "expenseId"   TEXT,
  "fileName"    TEXT         NOT NULL,
  "fileUrl"     TEXT         NOT NULL,
  "fileType"    TEXT,
  "fileSize"    INTEGER,
  "description" TEXT,
  "uploadedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "approvals" (
  "id"          TEXT         NOT NULL,
  "phaseId"     TEXT,
  "entityType"  TEXT         NOT NULL,
  "entityId"    TEXT         NOT NULL,
  "status"      TEXT         NOT NULL,
  "requestedBy" TEXT         NOT NULL,
  "reviewedBy"  TEXT,
  "reviewNote"  TEXT,
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewedAt"  TIMESTAMP(3),
  CONSTRAINT "approvals_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "project_staff_assignments" (
  "id"          TEXT               NOT NULL,
  "userId"      TEXT               NOT NULL,
  "projectId"   TEXT               NOT NULL,
  "projectRole" "ProjectStaffRole" NOT NULL DEFAULT 'SITE_ENGINEER',
  "isActive"    BOOLEAN            NOT NULL DEFAULT true,
  "startDate"   TIMESTAMP(3),
  "endDate"     TIMESTAMP(3),
  "notes"       TEXT,
  "assignedBy"  TEXT,
  "createdAt"   TIMESTAMP(3)       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3)       NOT NULL,
  CONSTRAINT "project_staff_assignments_pkey"                   PRIMARY KEY ("id"),
  CONSTRAINT "project_staff_assignments_userId_projectId_key"   UNIQUE ("userId", "projectId")
);

CREATE TABLE "audit_logs" (
  "id"         TEXT          NOT NULL,
  "userId"     TEXT,
  "projectId"  TEXT,
  "action"     "AuditAction" NOT NULL,
  "entityType" TEXT          NOT NULL,
  "entityId"   TEXT,
  "oldValues"  JSONB,
  "newValues"  JSONB,
  "ipAddress"  TEXT,
  "userAgent"  TEXT,
  "createdAt"  TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- ─── FOREIGN KEYS ──────────────────────────────────────────

ALTER TABLE "company_settings"
  ADD CONSTRAINT "company_settings_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "users"
  ADD CONSTRAINT "users_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "project_user_access"
  ADD CONSTRAINT "project_user_access_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "project_user_access"
  ADD CONSTRAINT "project_user_access_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "projects"
  ADD CONSTRAINT "projects_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "lands"
  ADD CONSTRAINT "lands_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "land_shares"
  ADD CONSTRAINT "land_shares_landId_fkey"
  FOREIGN KEY ("landId") REFERENCES "lands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "land_shares"
  ADD CONSTRAINT "land_shares_buyerId_fkey"
  FOREIGN KEY ("buyerId") REFERENCES "buyers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "units"
  ADD CONSTRAINT "units_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "unit_buyers"
  ADD CONSTRAINT "unit_buyers_unitId_fkey"
  FOREIGN KEY ("unitId") REFERENCES "units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "unit_buyers"
  ADD CONSTRAINT "unit_buyers_buyerId_fkey"
  FOREIGN KEY ("buyerId") REFERENCES "buyers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "buyers"
  ADD CONSTRAINT "buyers_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "project_buyers"
  ADD CONSTRAINT "project_buyers_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "project_buyers"
  ADD CONSTRAINT "project_buyers_buyerId_fkey"
  FOREIGN KEY ("buyerId") REFERENCES "buyers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "phases"
  ADD CONSTRAINT "phases_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "demands"
  ADD CONSTRAINT "demands_unitId_fkey"
  FOREIGN KEY ("unitId") REFERENCES "units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "demands"
  ADD CONSTRAINT "demands_buyerId_fkey"
  FOREIGN KEY ("buyerId") REFERENCES "buyers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "demands"
  ADD CONSTRAINT "demands_phaseId_fkey"
  FOREIGN KEY ("phaseId") REFERENCES "phases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "collections"
  ADD CONSTRAINT "collections_phaseId_fkey"
  FOREIGN KEY ("phaseId") REFERENCES "phases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "collections"
  ADD CONSTRAINT "collections_buyerId_fkey"
  FOREIGN KEY ("buyerId") REFERENCES "buyers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "collections"
  ADD CONSTRAINT "collections_demandId_fkey"
  FOREIGN KEY ("demandId") REFERENCES "demands"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "suppliers"
  ADD CONSTRAINT "suppliers_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "supplier_payables"
  ADD CONSTRAINT "supplier_payables_supplierId_fkey"
  FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "supplier_payables"
  ADD CONSTRAINT "supplier_payables_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "supplier_payables"
  ADD CONSTRAINT "supplier_payables_phaseId_fkey"
  FOREIGN KEY ("phaseId") REFERENCES "phases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "supplier_bill_items"
  ADD CONSTRAINT "supplier_bill_items_payableId_fkey"
  FOREIGN KEY ("payableId") REFERENCES "supplier_payables"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "supplier_payments"
  ADD CONSTRAINT "supplier_payments_payableId_fkey"
  FOREIGN KEY ("payableId") REFERENCES "supplier_payables"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "expenses"
  ADD CONSTRAINT "expenses_phaseId_fkey"
  FOREIGN KEY ("phaseId") REFERENCES "phases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "expenses"
  ADD CONSTRAINT "expenses_supplierId_fkey"
  FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "expenses"
  ADD CONSTRAINT "expenses_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "expenses"
  ADD CONSTRAINT "expenses_approvedById_fkey"
  FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "expenses"
  ADD CONSTRAINT "expenses_payableId_fkey"
  FOREIGN KEY ("payableId") REFERENCES "supplier_payables"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "material_items"
  ADD CONSTRAINT "material_items_phaseId_fkey"
  FOREIGN KEY ("phaseId") REFERENCES "phases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "material_items"
  ADD CONSTRAINT "material_items_supplierId_fkey"
  FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "documents"
  ADD CONSTRAINT "documents_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "documents"
  ADD CONSTRAINT "documents_buyerId_fkey"
  FOREIGN KEY ("buyerId") REFERENCES "buyers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "documents"
  ADD CONSTRAINT "documents_expenseId_fkey"
  FOREIGN KEY ("expenseId") REFERENCES "expenses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "approvals"
  ADD CONSTRAINT "approvals_phaseId_fkey"
  FOREIGN KEY ("phaseId") REFERENCES "phases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "approvals"
  ADD CONSTRAINT "approvals_reviewedBy_fkey"
  FOREIGN KEY ("reviewedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "project_staff_assignments"
  ADD CONSTRAINT "project_staff_assignments_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "project_staff_assignments"
  ADD CONSTRAINT "project_staff_assignments_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "audit_logs"
  ADD CONSTRAINT "audit_logs_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "audit_logs"
  ADD CONSTRAINT "audit_logs_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

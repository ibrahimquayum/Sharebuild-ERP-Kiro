ALTER TABLE "projects"
ADD COLUMN "landSize" TEXT,
ADD COLUMN "residentialFloors" INTEGER,
ADD COLUMN "unitsPerFloor" INTEGER,
ADD COLUMN "totalPlannedUnits" INTEGER,
ADD COLUMN "parkingUtilityNote" TEXT,
ADD COLUMN "defaultServiceChargePct" DECIMAL(65,30) DEFAULT 0,
ADD COLUMN "notes" TEXT;

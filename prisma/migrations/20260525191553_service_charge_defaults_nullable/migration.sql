-- AlterTable
ALTER TABLE "phases" ALTER COLUMN "serviceChargePct" DROP DEFAULT;

-- AlterTable
ALTER TABLE "projects" ALTER COLUMN "defaultServiceChargePct" DROP DEFAULT;

-- Normalize old schema-default zero values so fallback logic can distinguish
-- "unset" from an explicit 0% override.
UPDATE "phases"
SET "serviceChargePct" = NULL
WHERE "serviceChargePct" = 0;

UPDATE "projects"
SET "defaultServiceChargePct" = NULL
WHERE "defaultServiceChargePct" = 0;

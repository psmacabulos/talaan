-- DropIndex
DROP INDEX "Alert_schoolId_idx";

-- AlterTable
ALTER TABLE "Alert" ADD COLUMN     "studentId" TEXT;

-- CreateIndex
CREATE INDEX "Alert_schoolId_acknowledged_createdAt_idx" ON "Alert"("schoolId", "acknowledged", "createdAt");

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Step 57: a lost card's tap no longer belongs to the card's owner. Move the
-- owner onto the alert, then take them off the tap. Safe to run twice.
UPDATE "Alert" a SET "studentId" = t."studentId"
  FROM "Tap" t WHERE a."tapId" = t."id" AND a."studentId" IS NULL;
UPDATE "Tap" t SET "studentId" = NULL
  FROM "Alert" a WHERE a."tapId" = t."id" AND t."studentId" IS NOT NULL;

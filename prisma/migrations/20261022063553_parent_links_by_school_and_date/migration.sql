-- DropIndex
DROP INDEX "ParentStudentLink_schoolId_idx";

-- CreateIndex
CREATE INDEX "ParentStudentLink_schoolId_linkedAt_idx" ON "ParentStudentLink"("schoolId", "linkedAt");

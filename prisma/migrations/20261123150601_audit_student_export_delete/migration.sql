-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'student_exported';
ALTER TYPE "AuditAction" ADD VALUE 'student_deleted';

-- CreateIndex
CREATE INDEX "Alert_studentId_idx" ON "Alert"("studentId");

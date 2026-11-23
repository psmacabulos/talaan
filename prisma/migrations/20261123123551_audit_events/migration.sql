-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('student_created', 'student_updated', 'card_linked', 'card_replaced', 'card_marked_lost', 'staff_invited', 'staff_removed', 'staff_link_created', 'parent_link_removed', 'parent_link_allowed_again', 'time_in_recorded', 'time_out_recorded', 'attendance_times_changed', 'school_opened');

-- CreateEnum
CREATE TYPE "AuditTarget" AS ENUM ('student', 'staff', 'school');

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "actorRole" "Role" NOT NULL,
    "action" "AuditAction" NOT NULL,
    "targetType" "AuditTarget" NOT NULL,
    "targetId" TEXT NOT NULL,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditEvent_schoolId_createdAt_id_idx" ON "AuditEvent"("schoolId", "createdAt" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "AuditEvent_createdAt_idx" ON "AuditEvent"("createdAt");

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

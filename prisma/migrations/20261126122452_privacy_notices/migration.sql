-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'privacy_notice_published';

-- CreateTable
CREATE TABLE "PrivacyNotice" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "body" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrivacyNotice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PrivacyNotice_schoolId_version_key" ON "PrivacyNotice"("schoolId", "version");

-- AddForeignKey
ALTER TABLE "PrivacyNotice" ADD CONSTRAINT "PrivacyNotice_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Written by hand (Step 60.4): Prisma can't declare a CHECK. The form and
-- the server already refuse these; the database makes it impossible.
ALTER TABLE "PrivacyNotice" ADD CONSTRAINT "PrivacyNotice_version_positive" CHECK ("version" >= 1);
ALTER TABLE "PrivacyNotice" ADD CONSTRAINT "PrivacyNotice_body_length" CHECK (char_length("body") <= 20000);

-- AlterTable
ALTER TABLE "Staff" ADD COLUMN     "passwordHash" TEXT;

-- Emails are stored in lower case from now on, so sign-in can find one
-- person whatever case they type. Existing rows are brought in line first.
UPDATE "Staff" SET "email" = lower("email");

-- CreateIndex
CREATE UNIQUE INDEX "Staff_email_key" ON "Staff"("email");

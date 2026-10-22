-- AlterEnum
ALTER TYPE "NotificationKind" ADD VALUE 'guardian_linked';

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "aboutParentId" TEXT,
ADD COLUMN     "recipientParentId" TEXT;

-- CreateIndex
CREATE INDEX "Notification_recipient" ON "Notification"("recipientParentId") WHERE ("recipientParentId" IS NOT NULL);

-- CreateIndex
CREATE INDEX "Notification_about" ON "Notification"("aboutParentId") WHERE ("aboutParentId" IS NOT NULL);

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_recipientParentId_fkey" FOREIGN KEY ("recipientParentId") REFERENCES "Parent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_aboutParentId_fkey" FOREIGN KEY ("aboutParentId") REFERENCES "Parent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

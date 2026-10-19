-- CreateEnum
CREATE TYPE "PushDeliveryStatus" AS ENUM ('waiting', 'sending', 'sent', 'failed');

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "pushedAt" TIMESTAMP(3);

-- Every notification that already exists is history: never push it.
UPDATE "Notification" SET "pushedAt" = CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "PushDelivery" (
    "id" TEXT NOT NULL,
    "notificationId" TEXT NOT NULL,
    "pushTokenId" TEXT NOT NULL,
    "status" "PushDeliveryStatus" NOT NULL DEFAULT 'waiting',
    "tries" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "claimedUntil" TIMESTAMP(3),
    "ticketId" TEXT,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "PushDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PushDelivery_status_nextAttemptAt_idx" ON "PushDelivery"("status", "nextAttemptAt");

-- CreateIndex
CREATE INDEX "PushDelivery_pushTokenId_idx" ON "PushDelivery"("pushTokenId");

-- CreateIndex
CREATE UNIQUE INDEX "PushDelivery_notificationId_pushTokenId_key" ON "PushDelivery"("notificationId", "pushTokenId");

-- CreateIndex
CREATE INDEX "Notification_to_push" ON "Notification"("createdAt") WHERE ("pushedAt" IS NULL);

-- AddForeignKey
ALTER TABLE "PushDelivery" ADD CONSTRAINT "PushDelivery_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "Notification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PushDelivery" ADD CONSTRAINT "PushDelivery_pushTokenId_fkey" FOREIGN KEY ("pushTokenId") REFERENCES "PushToken"("id") ON DELETE CASCADE ON UPDATE CASCADE;

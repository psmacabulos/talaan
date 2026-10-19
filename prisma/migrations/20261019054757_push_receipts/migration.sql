-- AlterTable
ALTER TABLE "PushDelivery" ADD COLUMN     "receiptDueAt" TIMESTAMP(3);

-- Pushes already sent (Step 54) have their receipt checked once, then are deleted if delivered.
UPDATE "PushDelivery" SET "receiptDueAt" = CURRENT_TIMESTAMP WHERE "status" = 'sent';

-- CreateIndex
CREATE INDEX "PushDelivery_receipt_due" ON "PushDelivery"("receiptDueAt") WHERE ("receiptDueAt" IS NOT NULL);

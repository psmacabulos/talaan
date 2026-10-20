-- CreateEnum
CREATE TYPE "TapSource" AS ENUM ('card', 'manual');

-- AlterTable
ALTER TABLE "Tap" ADD COLUMN     "recordedById" TEXT,
ADD COLUMN     "source" "TapSource" NOT NULL DEFAULT 'card',
ALTER COLUMN "cardSerial" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Tap" ADD CONSTRAINT "Tap_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

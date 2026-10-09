-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('lost_card_tapped');

-- CreateTable
CREATE TABLE "Tap" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "cardSerial" TEXT NOT NULL,
    "studentId" TEXT,
    "tappedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "tapId" TEXT NOT NULL,
    "type" "AlertType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledged" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Tap_schoolId_tappedAt_idx" ON "Tap"("schoolId", "tappedAt");

-- CreateIndex
CREATE INDEX "Tap_studentId_tappedAt_idx" ON "Tap"("studentId", "tappedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Alert_tapId_key" ON "Alert"("tapId");

-- CreateIndex
CREATE INDEX "Alert_schoolId_idx" ON "Alert"("schoolId");

-- AddForeignKey
ALTER TABLE "Tap" ADD CONSTRAINT "Tap_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tap" ADD CONSTRAINT "Tap_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_tapId_fkey" FOREIGN KEY ("tapId") REFERENCES "Tap"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateEnum
CREATE TYPE "CardStatus" AS ENUM ('active', 'lost', 'retired');

-- CreateTable
CREATE TABLE "Card" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "serial" TEXT NOT NULL,
    "status" "CardStatus" NOT NULL DEFAULT 'active',
    "linkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Card_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Card_serial_key" ON "Card"("serial");

-- CreateIndex
CREATE INDEX "Card_studentId_idx" ON "Card"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "Card_one_active_per_student" ON "Card"("studentId") WHERE ("status" = 'active');

-- AddForeignKey
ALTER TABLE "Card" ADD CONSTRAINT "Card_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Card" ADD CONSTRAINT "Card_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

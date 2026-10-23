-- CreateTable
CREATE TABLE "LinkBlock" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "removedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removedByStaffId" TEXT,

    CONSTRAINT "LinkBlock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LinkBlock_schoolId_studentId_idx" ON "LinkBlock"("schoolId", "studentId");

-- CreateIndex
CREATE INDEX "LinkBlock_removedByStaffId_idx" ON "LinkBlock"("removedByStaffId");

-- CreateIndex
CREATE UNIQUE INDEX "LinkBlock_parentId_studentId_key" ON "LinkBlock"("parentId", "studentId");

-- AddForeignKey
ALTER TABLE "LinkBlock" ADD CONSTRAINT "LinkBlock_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LinkBlock" ADD CONSTRAINT "LinkBlock_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Parent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LinkBlock" ADD CONSTRAINT "LinkBlock_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LinkBlock" ADD CONSTRAINT "LinkBlock_removedByStaffId_fkey" FOREIGN KEY ("removedByStaffId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "LinkAttempt" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LinkAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LinkAttempt_keyHash_createdAt_idx" ON "LinkAttempt"("keyHash", "createdAt");

-- CreateIndex
CREATE INDEX "LinkAttempt_createdAt_idx" ON "LinkAttempt"("createdAt");

-- AddForeignKey
ALTER TABLE "LinkAttempt" ADD CONSTRAINT "LinkAttempt_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

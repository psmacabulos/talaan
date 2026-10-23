-- CreateTable
CREATE TABLE "ParentPasswordReset" (
    "id" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "tries" INTEGER NOT NULL DEFAULT 0,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ParentPasswordReset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ParentPasswordReset_parentId_createdAt_idx" ON "ParentPasswordReset"("parentId", "createdAt");

-- AddForeignKey
ALTER TABLE "ParentPasswordReset" ADD CONSTRAINT "ParentPasswordReset_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Parent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

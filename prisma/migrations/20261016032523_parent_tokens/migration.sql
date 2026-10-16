-- CreateTable
CREATE TABLE "ParentToken" (
    "id" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "label" TEXT,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ParentToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ParentToken_tokenHash_key" ON "ParentToken"("tokenHash");

-- CreateIndex
CREATE INDEX "ParentToken_parentId_idx" ON "ParentToken"("parentId");

-- AddForeignKey
ALTER TABLE "ParentToken" ADD CONSTRAINT "ParentToken_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Parent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

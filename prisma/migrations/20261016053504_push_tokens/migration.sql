-- CreateEnum
CREATE TYPE "PushPlatform" AS ENUM ('ios', 'android');

-- CreateTable
CREATE TABLE "PushToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "platform" "PushPlatform" NOT NULL,
    "parentTokenId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PushToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PushToken_token_key" ON "PushToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "PushToken_parentTokenId_key" ON "PushToken"("parentTokenId");

-- AddForeignKey
ALTER TABLE "PushToken" ADD CONSTRAINT "PushToken_parentTokenId_fkey" FOREIGN KEY ("parentTokenId") REFERENCES "ParentToken"("id") ON DELETE CASCADE ON UPDATE CASCADE;

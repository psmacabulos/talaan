-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'parent_account_deleted';

-- AlterTable
ALTER TABLE "AuditEvent" ALTER COLUMN "actorId" DROP NOT NULL,
ALTER COLUMN "actorRole" DROP NOT NULL;

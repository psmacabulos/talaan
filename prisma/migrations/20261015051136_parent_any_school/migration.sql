-- DropForeignKey
ALTER TABLE "Parent" DROP CONSTRAINT "Parent_schoolId_fkey";

-- DropIndex
DROP INDEX "Parent_schoolId_idx";

-- AlterTable
ALTER TABLE "Parent" DROP COLUMN "schoolId";

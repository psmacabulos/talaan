-- CreateEnum
CREATE TYPE "NotificationPreference" AS ENUM ('off', 'time_in_only', 'time_in_and_time_out');

-- CreateTable
CREATE TABLE "School" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "theme" JSONB NOT NULL,
    "logoUrl" TEXT,
    "showDepedLogo" BOOLEAN NOT NULL DEFAULT false,
    "notificationPreference" "NotificationPreference" NOT NULL DEFAULT 'time_in_and_time_out',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "School_pkey" PRIMARY KEY ("id")
);

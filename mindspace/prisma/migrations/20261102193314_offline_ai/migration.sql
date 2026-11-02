-- AlterTable
ALTER TABLE "Settings" ADD COLUMN     "aiProvider" TEXT NOT NULL DEFAULT 'local',
ADD COLUMN     "localModel" TEXT;

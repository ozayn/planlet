-- AlterTable
ALTER TABLE "User" ADD COLUMN     "canUseCoachingFeatures" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "ReflectionInfluencePreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "influences" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReflectionInfluencePreference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReflectionInfluencePreference_userId_key" ON "ReflectionInfluencePreference"("userId");

-- AddForeignKey
ALTER TABLE "ReflectionInfluencePreference" ADD CONSTRAINT "ReflectionInfluencePreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateEnum
CREATE TYPE "PokeType" AS ENUM ('ENCOURAGE', 'CHECK_IN', 'CELEBRATE', 'LEARN', 'FOCUS', 'PAUSE', 'THINKING_OF_YOU');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'USER_POKE';

-- CreateTable
CREATE TABLE "Poke" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "pokeType" "PokeType" NOT NULL,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "seenAt" TIMESTAMP(3),
    "acknowledgedAt" TIMESTAMP(3),
    "dismissedAt" TIMESTAMP(3),

    CONSTRAINT "Poke_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Poke_recipientId_dismissedAt_createdAt_idx" ON "Poke"("recipientId", "dismissedAt", "createdAt");

-- CreateIndex
CREATE INDEX "Poke_recipientId_seenAt_dismissedAt_idx" ON "Poke"("recipientId", "seenAt", "dismissedAt");

-- CreateIndex
CREATE INDEX "Poke_senderId_createdAt_idx" ON "Poke"("senderId", "createdAt");

-- CreateIndex
CREATE INDEX "Poke_senderId_recipientId_dismissedAt_seenAt_idx" ON "Poke"("senderId", "recipientId", "dismissedAt", "seenAt");

-- AddForeignKey
ALTER TABLE "Poke" ADD CONSTRAINT "Poke_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Poke" ADD CONSTRAINT "Poke_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

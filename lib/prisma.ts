import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/app/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaClientGeneration?: number;
};

/** Bump when adding Prisma models so hot-reload does not keep a stale client. */
const PRISMA_CLIENT_GENERATION = 2;

function createPrismaClient() {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  });
  return new PrismaClient({ adapter });
}

function getPrismaClient(): PrismaClient {
  const existing = globalForPrisma.prisma;
  const generationMatches =
    globalForPrisma.prismaClientGeneration === PRISMA_CLIENT_GENERATION;

  if (
    existing &&
    generationMatches &&
    typeof existing.lifeLabItemState?.findUnique === "function"
  ) {
    return existing;
  }

  const client = createPrismaClient();

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = client;
    globalForPrisma.prismaClientGeneration = PRISMA_CLIENT_GENERATION;
  }

  return client;
}

export const prisma = getPrismaClient();

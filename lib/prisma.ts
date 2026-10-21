import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

import { PrismaClient } from "@/app/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pgPool: Pool | undefined;
  prismaClientGeneration?: number;
};

/** Bump when adding Prisma models so hot-reload does not keep a stale client. */
const PRISMA_CLIENT_GENERATION = 3;

function createPgPool() {
  return new Pool({
    connectionString: process.env.DATABASE_URL,
  });
}

function createPrismaClient(pool: Pool) {
  const adapter = new PrismaPg(pool);
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

  const pool = globalForPrisma.pgPool ?? createPgPool();
  const client = createPrismaClient(pool);

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.pgPool = pool;
    globalForPrisma.prisma = client;
    globalForPrisma.prismaClientGeneration = PRISMA_CLIENT_GENERATION;
  }

  return client;
}

export const prisma = getPrismaClient();

#!/usr/bin/env tsx

import { backfillJobApplicationNormalizedUrls } from "@/lib/job-applications";
import { prisma } from "@/lib/prisma";

async function main() {
  const updated = await backfillJobApplicationNormalizedUrls();
  console.log(`Backfilled normalizedUrl for ${updated} job application(s).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

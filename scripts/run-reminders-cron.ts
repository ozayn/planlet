import "dotenv/config";

import { performance } from "node:perf_hooks";

import { runReminderCron } from "@/lib/reminders";
import { prisma } from "@/lib/prisma";

function parseArgs(argv: string[]) {
  const debug = argv.includes("--debug");
  const atArg = argv.find((arg) => arg.startsWith("--at="));
  const now = atArg ? new Date(atArg.slice("--at=".length)) : undefined;

  if (atArg && now && Number.isNaN(now.getTime())) {
    throw new Error(`Invalid --at value: ${atArg.slice("--at=".length)}`);
  }

  return { debug, now };
}

async function main() {
  const scriptStart = performance.now();
  const { debug, now } = parseArgs(process.argv.slice(2));

  if (debug) {
    console.log("[cron:reminders] Debug mode enabled");
    if (now) {
      console.log("[cron:reminders] Simulated time:", now.toISOString());
    }
  }

  const result = await runReminderCron({ debug, now });

  console.log("[cron:reminders] Summary:", result);
  await prisma.$disconnect();
  console.log(
    `[cron:reminders] exited in ${Math.round(performance.now() - scriptStart)}ms`,
  );
}

main().catch(async (error) => {
  console.error(
    "[cron:reminders] Fatal error:",
    error instanceof Error ? error.message : error,
  );
  await prisma.$disconnect().catch(() => undefined);
  process.exit(1);
});

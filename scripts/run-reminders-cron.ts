import "dotenv/config";

import { runReminderCron } from "@/lib/reminders";

async function main() {
  const result = await runReminderCron();

  console.log("[cron:reminders] Summary:", result);
}

main().catch((error) => {
  console.error(
    "[cron:reminders] Fatal error:",
    error instanceof Error ? error.message : error,
  );
  process.exit(1);
});

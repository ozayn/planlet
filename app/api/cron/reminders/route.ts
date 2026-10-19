import { NextResponse } from "next/server";

import { isCronAuthorized } from "@/lib/env";
import { runPomodoroPushCron } from "@/lib/pomodoro/cron";
import { runReminderCron } from "@/lib/reminders";

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runReminderCron();
  const pomodoroPush = await runPomodoroPushCron();

  return NextResponse.json({
    success: true,
    ...result,
    pomodoroPush,
  });
}

import { NextResponse } from "next/server";

import { isCronAuthorized } from "@/lib/env";
import { dispatchDueReminders } from "@/lib/reminders";

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await dispatchDueReminders();

  return NextResponse.json({
    success: true,
    ...result,
  });
}

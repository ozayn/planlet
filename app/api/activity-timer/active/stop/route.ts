import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import {
  ActivityTimerError,
  stopActiveActivityTimerSession,
} from "@/lib/activity-timer";
import { canUseActivityTimerFeatures } from "@/lib/roles";

export async function POST() {
  const session = await auth();

  if (!session?.user?.id || !canUseActivityTimerFeatures(session.user)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await stopActiveActivityTimerSession(session.user.id);

    revalidatePath("/timer");
    revalidatePath("/", "layout");

    if (result.outcome === "saved") {
      return NextResponse.json({
        success: true,
        outcome: "saved",
        durationSeconds: result.durationSeconds,
      });
    }

    if (result.outcome === "idle") {
      return NextResponse.json({
        success: true,
        outcome: "idle",
      });
    }

    return NextResponse.json({
      success: true,
      outcome: "discarded",
      reason: result.reason,
      durationSeconds: result.durationSeconds,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof ActivityTimerError
            ? error.message
            : "Failed to stop timer.",
      },
      { status: 500 },
    );
  }
}

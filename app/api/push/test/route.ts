import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { isWebPushConfigured } from "@/lib/env";
import { sendTestPushNotification } from "@/lib/web-push";

export async function POST() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isWebPushConfigured()) {
    return NextResponse.json(
      { error: "Push notifications are not configured." },
      { status: 503 },
    );
  }

  try {
    await sendTestPushNotification(session.user.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.warn("[push/test] Failed to send test notification:", {
      userId: session.user.id,
      message: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to send test notification.",
      },
      { status: 500 },
    );
  }
}

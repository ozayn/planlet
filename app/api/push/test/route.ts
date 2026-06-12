import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { isWebPushConfigured } from "@/lib/env";
import { sendTestPushNotification } from "@/lib/web-push";

export async function POST() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { ok: false, message: "Unauthorized" },
      { status: 401 },
    );
  }

  if (!isWebPushConfigured()) {
    console.error("[push/test] Push keys are not configured", {
      userId: session.user.id,
      email: session.user.email ?? undefined,
    });

    return NextResponse.json(
      { ok: false, message: "Push keys are not configured." },
      { status: 503 },
    );
  }

  console.info("[push/test] Test notification requested", {
    userId: session.user.id,
    email: session.user.email ?? undefined,
  });

  try {
    const result = await sendTestPushNotification(session.user.id);

    console.info("[push/test] Send complete", {
      userId: session.user.id,
      subscriptionsFound: result.subscriptionCount,
      sent: result.sent,
      failed: result.failed,
      staleRemoved: result.staleRemoved,
    });

    if (result.subscriptionCount === 0) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "No push subscription found. Enable phone notifications again.",
        },
        { status: 400 },
      );
    }

    if (result.sent === 0) {
      const message =
        result.staleRemoved > 0
          ? "This notification subscription expired. Enable phone notifications again."
          : "Couldn't send test notification.";

      console.error("[push/test] No notifications delivered", {
        userId: session.user.id,
        subscriptionsFound: result.subscriptionCount,
        sent: result.sent,
        failed: result.failed,
        staleRemoved: result.staleRemoved,
      });

      return NextResponse.json({ ok: false, message }, { status: 502 });
    }

    return NextResponse.json({
      ok: true,
      sent: result.sent,
    });
  } catch (error) {
    console.error("[push/test] Failed to send test notification", {
      userId: session.user.id,
      email: session.user.email ?? undefined,
      message: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json(
      {
        ok: false,
        message: "Couldn't send test notification.",
      },
      { status: 500 },
    );
  }
}

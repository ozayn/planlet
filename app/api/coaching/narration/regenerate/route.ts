import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { invalidateCoachingNarrationCacheForUser } from "@/lib/coaching/narration-storage";
import { canUseCoachingFeatures } from "@/lib/roles";

type CoachingRegenerateBody = {
  contentHash?: string;
};

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id || !canUseCoachingFeatures(session.user)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: CoachingRegenerateBody = {};

  try {
    body = (await request.json()) as CoachingRegenerateBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const contentHash = body.contentHash?.trim() || undefined;
  const deleted = await invalidateCoachingNarrationCacheForUser({
    userId: session.user.id,
    contentHash,
  });

  return NextResponse.json({ deleted });
}

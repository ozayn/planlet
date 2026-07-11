import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { regenerateNarrationForNote } from "@/lib/life-lab/narration-service";
import { isLifeLabOpenAiTtsEnabled } from "@/lib/env";
import { canAccessLifeLabPage } from "@/lib/roles";

type RegenerateBody = {
  driveFileId?: string;
  voice?: string;
  model?: string;
};

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id || !canAccessLifeLabPage(session.user)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isLifeLabOpenAiTtsEnabled()) {
    return NextResponse.json(
      { error: "OpenAI narration is unavailable." },
      { status: 503 },
    );
  }

  let body: RegenerateBody;

  try {
    body = (await request.json()) as RegenerateBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const driveFileId = body.driveFileId?.trim();

  if (!driveFileId) {
    return NextResponse.json(
      { error: "driveFileId is required." },
      { status: 400 },
    );
  }

  const invalidated = await regenerateNarrationForNote({
    driveFileId,
    voice: body.voice,
    model: body.model,
  });

  return NextResponse.json({ invalidated });
}

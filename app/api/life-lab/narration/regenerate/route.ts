import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { validateOpenAiTtsConfiguration } from "@/lib/env";
import { logNarrationDiagnostic } from "@/lib/life-lab/narration-diagnostics";
import {
  buildNarrationErrorPayload,
  narrationErrorHttpStatus,
} from "@/lib/life-lab/narration-errors";
import { regenerateNarrationForNote } from "@/lib/life-lab/narration-service";
import { canAccessLifeLabPage } from "@/lib/roles";
import { isLifeLabDevToolsEnabled } from "@/lib/life-lab/dev";

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

  const config = validateOpenAiTtsConfiguration();

  if (!config.ok) {
    logNarrationDiagnostic({
      stage: "feature-check",
      errorType: config.reason,
      errorMessage: `OpenAI TTS configuration check failed: ${config.reason}`,
    });

    return NextResponse.json(
      buildNarrationErrorPayload({
        category: config.reason,
        includeDebug: isLifeLabDevToolsEnabled(),
      }),
      { status: narrationErrorHttpStatus(config.reason) },
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

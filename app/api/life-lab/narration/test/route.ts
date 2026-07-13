import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { validateOpenAiTtsConfiguration } from "@/lib/env";
import { isLifeLabDevToolsEnabled } from "@/lib/life-lab/dev";
import { logNarrationDiagnostic } from "@/lib/life-lab/narration-diagnostics";
import {
  buildNarrationErrorPayload,
  narrationErrorHttpStatus,
} from "@/lib/life-lab/narration-errors";
import {
  mapNarrationServiceError,
  synthesizeNarrationTestAudio,
} from "@/lib/life-lab/narration-service";
import { canAccessLifeLabPage } from "@/lib/roles";

export async function POST() {
  if (!isLifeLabDevToolsEnabled()) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

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
        includeDebug: true,
      }),
      { status: narrationErrorHttpStatus(config.reason) },
    );
  }

  try {
    const result = await synthesizeNarrationTestAudio({
      userId: session.user.id,
      model: config.model,
      voice: config.voice,
    });

    logNarrationDiagnostic({
      stage: "response",
      model: result.model,
      voice: result.voice,
      audioByteSize: result.audio.byteLength,
      statusCode: 200,
    });

    return new NextResponse(new Uint8Array(result.audio), {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": String(result.audio.byteLength),
        "Cache-Control": "private, no-store",
        "X-Narration-Cache": "miss",
      },
    });
  } catch (error) {
    const mapped = mapNarrationServiceError(error, true);

    logNarrationDiagnostic({
      stage: "openai-request",
      model: config.model,
      voice: config.voice,
      statusCode: mapped.status,
      errorType: mapped.body.category,
      errorMessage: mapped.body.debugMessage ?? mapped.body.error,
    });

    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}

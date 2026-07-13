import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { validateOpenAiTtsConfiguration } from "@/lib/env";
import { logNarrationDiagnostic } from "@/lib/life-lab/narration-diagnostics";
import {
  buildNarrationErrorPayload,
  narrationErrorHttpStatus,
} from "@/lib/life-lab/narration-errors";
import {
  isOpenAiNarrationStyle,
  OPENAI_NARRATION_STYLES,
} from "@/lib/life-lab/narration-config";
import {
  mapNarrationServiceError,
  synthesizeNarrationPreviewAudio,
} from "@/lib/life-lab/narration-service";
import {
  formatOpenAiNarrationStyleLabel,
  formatOpenAiNarrationVoiceLabel,
  resolveOpenAiNarrationSettings,
} from "@/lib/life-lab/openai-narration-preferences";
import { canAccessLifeLabPage } from "@/lib/roles";

type NarrationPreviewBody = {
  voice?: string;
  narrationStyle?: string;
  customNarrationInstructions?: string | null;
};

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id || !canAccessLifeLabPage(session.user)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const config = validateOpenAiTtsConfiguration();

  if (!config.ok) {
    return NextResponse.json(
      buildNarrationErrorPayload({
        category: config.reason,
      }),
      { status: narrationErrorHttpStatus(config.reason) },
    );
  }

  let body: NarrationPreviewBody = {};

  try {
    body = (await request.json()) as NarrationPreviewBody;
  } catch {
    body = {};
  }

  const narrationStyle =
    body.narrationStyle && isOpenAiNarrationStyle(body.narrationStyle)
      ? body.narrationStyle
      : "BRITISH_FEMALE_CALM";

  const preferences = {
    voice: body.voice?.trim() || config.voice,
    narrationStyle,
    customNarrationInstructions: body.customNarrationInstructions ?? null,
  };
  const resolved = resolveOpenAiNarrationSettings(preferences);

  try {
    const result = await synthesizeNarrationPreviewAudio({
      userId: session.user.id,
      preferences,
      model: config.model,
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
        "X-Narration-Preview": "true",
        "X-Narration-Voice": result.voice,
        "X-Narration-Style": OPENAI_NARRATION_STYLES[resolved.narrationStyle].slug,
        "X-Narration-Style-Label": encodeURIComponent(
          formatOpenAiNarrationStyleLabel(resolved.narrationStyle),
        ),
        "X-Narration-Voice-Label": encodeURIComponent(
          formatOpenAiNarrationVoiceLabel(result.voice),
        ),
        ...(resolved.voiceWarning
          ? { "X-Narration-Voice-Warning": encodeURIComponent(resolved.voiceWarning) }
          : {}),
      },
    });
  } catch (error) {
    const mapped = mapNarrationServiceError(error, false);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}

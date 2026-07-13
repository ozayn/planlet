import { NextResponse } from "next/server";

import { auth } from "@/auth";
import {
  formatCoachingOpenAiNarrationStyleLabel,
} from "@/lib/coaching/narration-config";
import {
  formatCoachingOpenAiNarrationVoiceLabel,
  resolveCoachingOpenAiNarrationSettings,
} from "@/lib/coaching/narration-preferences";
import {
  isCoachingOpenAiNarrationStyle,
} from "@/lib/coaching/narration-config";
import {
  mapCoachingNarrationServiceError,
  synthesizeCoachingNarrationPreviewAudio,
} from "@/lib/coaching/narration-service";
import { validateOpenAiTtsConfiguration } from "@/lib/env";
import { logNarrationDiagnostic } from "@/lib/life-lab/narration-diagnostics";
import {
  buildNarrationErrorPayload,
  narrationErrorHttpStatus,
} from "@/lib/life-lab/narration-errors";
import { canUseCoachingFeatures } from "@/lib/roles";

type CoachingNarrationPreviewBody = {
  voice?: string;
  narrationStyle?: string;
};

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id || !canUseCoachingFeatures(session.user)) {
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

  let body: CoachingNarrationPreviewBody = {};

  try {
    body = (await request.json()) as CoachingNarrationPreviewBody;
  } catch {
    body = {};
  }

  const narrationStyle =
    body.narrationStyle && isCoachingOpenAiNarrationStyle(body.narrationStyle)
      ? body.narrationStyle
      : "KIND_BRITISH_MENTOR";

  const settings = resolveCoachingOpenAiNarrationSettings({
    openAiTtsVoice: body.voice?.trim() || "fable",
    openAiNarrationStyle: narrationStyle,
  });

  try {
    const result = await synthesizeCoachingNarrationPreviewAudio({
      userId: session.user.id,
      settings,
      model: config.model,
    });

    logNarrationDiagnostic({
      stage: "response",
      noteId: `coaching-preview:${session.user.id}`,
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
        "X-Narration-Style": result.narrationStyle,
        "X-Narration-Style-Label": encodeURIComponent(
          formatCoachingOpenAiNarrationStyleLabel(settings.narrationStyle),
        ),
        "X-Narration-Voice-Label": encodeURIComponent(
          formatCoachingOpenAiNarrationVoiceLabel(result.voice),
        ),
        ...(settings.voiceWarning
          ? {
              "X-Narration-Voice-Warning": encodeURIComponent(
                settings.voiceWarning,
              ),
            }
          : {}),
      },
    });
  } catch (error) {
    const mapped = mapCoachingNarrationServiceError(error, false);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}

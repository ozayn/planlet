import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { synthesizeSpeech } from "@/lib/ai/synthesize-speech";
import { validateOpenAiTtsConfiguration } from "@/lib/env";
import {
  isOpenAiNarrationStyle,
  isSupportedOpenAiNarrationVoice,
  NARRATION_PREVIEW_TEXT,
  OPENAI_NARRATION_STYLES,
  OPENAI_NARRATION_SUGGESTED_VOICES,
  OPENAI_NARRATION_VOICES,
  type OpenAiNarrationStyleId,
} from "@/lib/life-lab/narration-config";
import {
  buildNarrationErrorPayload,
  narrationErrorHttpStatus,
} from "@/lib/life-lab/narration-errors";
import { mapNarrationServiceError } from "@/lib/life-lab/narration-service";
import {
  formatOpenAiNarrationStyleLabel,
  formatOpenAiNarrationVoiceLabel,
  resolveOpenAiNarrationSettings,
} from "@/lib/life-lab/openai-narration-preferences";
import { canAccessLifeLabPage } from "@/lib/roles";

type VoicePreviewBody = {
  voice?: string;
  narrationStyle?: string;
};

const PREVIEW_VOICE_IDS = new Set<string>([
  ...OPENAI_NARRATION_SUGGESTED_VOICES,
  ...OPENAI_NARRATION_VOICES.map((voice) => voice.id),
]);

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id || !canAccessLifeLabPage(session.user)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const config = validateOpenAiTtsConfiguration();

  if (!config.ok) {
    return NextResponse.json(
      buildNarrationErrorPayload({ category: config.reason }),
      { status: narrationErrorHttpStatus(config.reason) },
    );
  }

  let body: VoicePreviewBody = {};

  try {
    body = (await request.json()) as VoicePreviewBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const voice = body.voice?.trim() ?? config.voice;

  if (!isSupportedOpenAiNarrationVoice(voice) || !PREVIEW_VOICE_IDS.has(voice)) {
    return NextResponse.json({ error: "Unsupported preview voice." }, { status: 400 });
  }

  const narrationStyle: OpenAiNarrationStyleId =
    body.narrationStyle && isOpenAiNarrationStyle(body.narrationStyle)
      ? body.narrationStyle
      : "NEUTRAL_EDUCATIONAL";

  if (narrationStyle === "CUSTOM") {
    return NextResponse.json(
      { error: "Custom style is not supported in the voice preview matrix." },
      { status: 400 },
    );
  }

  const resolved = resolveOpenAiNarrationSettings({
    voice,
    narrationStyle,
    customNarrationInstructions: null,
  });

  try {
    const result = await synthesizeSpeech({
      text: NARRATION_PREVIEW_TEXT,
      userId: session.user.id,
      model: config.model,
      voice: resolved.voice,
      instructions: resolved.instructions,
    });

    return new NextResponse(new Uint8Array(result.audio), {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": String(result.audio.byteLength),
        "Cache-Control": "private, no-store",
        "X-Narration-Preview": "voice-matrix",
        "X-Narration-Cache": "bypass",
        "X-Narration-Model": result.model,
        "X-Narration-Voice": result.voice,
        "X-Narration-Style": OPENAI_NARRATION_STYLES[resolved.narrationStyle].slug,
        "X-Narration-Style-Label": encodeURIComponent(
          formatOpenAiNarrationStyleLabel(resolved.narrationStyle),
        ),
        "X-Narration-Voice-Label": encodeURIComponent(
          formatOpenAiNarrationVoiceLabel(result.voice),
        ),
        "X-Narration-Instructions-Fingerprint": resolved.instructionsFingerprint,
      },
    });
  } catch (error) {
    const mapped = mapNarrationServiceError(error, false);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}

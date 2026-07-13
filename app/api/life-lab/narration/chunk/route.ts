import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { validateOpenAiTtsConfiguration } from "@/lib/env";
import { getLifeLabNoteData } from "@/lib/life-lab";
import { logNarrationDiagnostic } from "@/lib/life-lab/narration-diagnostics";
import {
  buildNarrationErrorPayload,
  narrationErrorHttpStatus,
  type NarrationErrorCategory,
} from "@/lib/life-lab/narration-errors";
import {
  getOrCreateNarrationChunk,
  mapNarrationServiceError,
} from "@/lib/life-lab/narration-service";
import {
  narrationStyleIdFromSessionStyle,
  parseOpenAiNarrationSessionConfig,
} from "@/lib/life-lab/narration-session";
import {
  getLifeLabReadAloudPreferencesForUser,
  getResolvedOpenAiNarrationSettingsForUser,
} from "@/lib/life-lab/read-aloud-preferences";
import type { ResolvedOpenAiNarrationSettings } from "@/lib/life-lab/openai-narration-preferences";
import { canAccessLifeLabPage } from "@/lib/roles";
import { isLifeLabDevToolsEnabled } from "@/lib/life-lab/dev";
import { NARRATION_CONTENT_PROFILES } from "@/lib/life-lab/narration-config";

type NarrationChunkBody = {
  sectionId?: string;
  slug?: string;
  chunkIndex?: unknown;
  regenerate?: boolean;
  skipCache?: boolean;
  voice?: string;
  model?: string;
  sessionConfig?: unknown;
};

type NarrationChunkParams = {
  sectionId: string;
  slug: string;
  chunkIndex: number;
  regenerate?: boolean;
  skipCache?: boolean;
  voice?: string;
  model?: string;
  sessionConfig?: unknown;
};

function includeNarrationDebug(): boolean {
  return isLifeLabDevToolsEnabled();
}

function narrationErrorResponse(
  category: NarrationErrorCategory,
  debugMessage?: string,
) {
  const status = narrationErrorHttpStatus(category);

  return NextResponse.json(
    buildNarrationErrorPayload({
      category,
      debugMessage,
      includeDebug: includeNarrationDebug(),
    }),
    { status },
  );
}

function parseChunkIndex(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value) && value >= 0) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number.parseInt(value, 10);

    if (Number.isInteger(parsed) && parsed >= 0) {
      return parsed;
    }
  }

  return null;
}

function parseChunkParams(input: NarrationChunkBody): NarrationChunkParams | null {
  const sectionId = input.sectionId?.trim();
  const slug = input.slug?.trim();
  const chunkIndex = parseChunkIndex(input.chunkIndex);

  if (!sectionId || !slug || chunkIndex == null) {
    return null;
  }

  return {
    sectionId,
    slug,
    chunkIndex,
    regenerate: input.regenerate === true,
    skipCache: input.skipCache === true,
    voice: input.voice,
    model: input.model,
    sessionConfig: input.sessionConfig,
  };
}

async function serveNarrationChunk(params: NarrationChunkParams) {
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

    return narrationErrorResponse(config.reason);
  }

  const { note } = await getLifeLabNoteData(params.sectionId, params.slug);

  if (!note) {
    return NextResponse.json({ error: "Note not found." }, { status: 404 });
  }

  try {
    const lockedSession = parseOpenAiNarrationSessionConfig(params.sessionConfig);
    const readAloudPreferences = await getLifeLabReadAloudPreferencesForUser(
      session.user.id,
    );

    // Locked session: synthesize settings from the session lock; do not re-read prefs.
    const narrationSettings: ResolvedOpenAiNarrationSettings = lockedSession
      ? {
          voice: lockedSession.voice,
          requestedVoice: lockedSession.voice,
          narrationStyle:
            narrationStyleIdFromSessionStyle(lockedSession.style) ?? "CUSTOM",
          instructions: lockedSession.instructions,
          instructionsFingerprint: lockedSession.instructionsFingerprint,
          instructionVersion: lockedSession.instructionVersion,
          contentProfile:
            lockedSession.contentProfile === NARRATION_CONTENT_PROFILES.COACHING
              ? NARRATION_CONTENT_PROFILES.COACHING
              : NARRATION_CONTENT_PROFILES.LIFE_LAB,
          voiceWarning: null,
        }
      : await getResolvedOpenAiNarrationSettingsForUser(session.user.id);

    const result = await getOrCreateNarrationChunk({
      note,
      chunkIndex: params.chunkIndex,
      userId: session.user.id,
      narrationSettings,
      sessionConfig: lockedSession ?? undefined,
      sectionInclusion: readAloudPreferences.readAloudSectionInclusion,
      regenerate: params.regenerate === true,
      skipCache: params.skipCache === true,
      model: lockedSession ? undefined : params.model ?? config.model,
    });

    logNarrationDiagnostic({
      stage: "response",
      noteId: note.fileId,
      model: result.model,
      voice: result.voice,
      inputLength: result.audio.byteLength,
      audioByteSize: result.audio.byteLength,
      cacheWriteFailed: result.cacheWriteFailed,
      statusCode: 200,
    });

    return new NextResponse(new Uint8Array(result.audio), {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": String(result.audio.byteLength),
        "Cache-Control": result.cached
          ? "private, max-age=3600"
          : "private, no-store",
        "X-Narration-Cache": result.cached ? "hit" : "miss",
        "X-Narration-Chunk-Index": String(result.chunkIndex),
        "X-Narration-Chunk-Count": String(result.chunkCount),
        "X-Narration-Section-Label": encodeURIComponent(result.sectionLabel),
        "X-Narration-Cache-Key": result.cacheKey,
        "X-Narration-Model": result.model,
        "X-Narration-Voice": result.voice,
        "X-Narration-Style": result.style,
        "X-Narration-Instructions-Fingerprint": result.instructionsFingerprint,
        "X-Narration-Instruction-Version": String(result.instructionVersion),
        "X-Narration-Content-Profile": result.contentProfile,
        "X-Narration-Session-Id": result.sessionId,
        ...(result.cacheWriteFailed
          ? { "X-Narration-Cache-Write": "failed" }
          : {}),
      },
    });
  } catch (error) {
    const mapped = mapNarrationServiceError(error, includeNarrationDebug());

    logNarrationDiagnostic({
      stage:
        mapped.body.category === "empty_narration_text"
          ? "text-extraction"
          : "openai-request",
      noteId: note.fileId,
      model: config.ok ? config.model : null,
      voice: config.ok ? config.voice : null,
      statusCode: mapped.status,
      errorType: mapped.body.category,
      errorMessage: mapped.body.debugMessage ?? mapped.body.error,
    });

    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const params = parseChunkParams({
    sectionId: url.searchParams.get("sectionId") ?? undefined,
    slug: url.searchParams.get("slug") ?? undefined,
    chunkIndex: url.searchParams.get("chunkIndex") ?? undefined,
    regenerate: url.searchParams.get("regenerate") === "1",
    skipCache: url.searchParams.get("skipCache") === "1",
    voice: url.searchParams.get("voice") ?? undefined,
    model: url.searchParams.get("model") ?? undefined,
  });

  if (!params) {
    return NextResponse.json(
      { error: "sectionId, slug, and chunkIndex are required." },
      { status: 400 },
    );
  }

  return serveNarrationChunk(params);
}

export async function POST(request: Request) {
  let body: NarrationChunkBody;

  try {
    body = (await request.json()) as NarrationChunkBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const params = parseChunkParams(body);

  if (!params) {
    return NextResponse.json(
      { error: "sectionId, slug, and chunkIndex are required." },
      { status: 400 },
    );
  }

  return serveNarrationChunk(params);
}

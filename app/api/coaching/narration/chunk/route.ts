import { NextResponse } from "next/server";

import { auth } from "@/auth";
import {
  getOrCreateCoachingNarrationChunk,
  getCoachingNarrationContentHash,
  mapCoachingNarrationServiceError,
  parseCoachingReadAloudContent,
} from "@/lib/coaching/narration-service";
import { getResolvedCoachingNarrationSettingsForUser } from "@/lib/coaching/narration-preferences";
import { validateOpenAiTtsConfiguration } from "@/lib/env";
import { logNarrationDiagnostic } from "@/lib/life-lab/narration-diagnostics";
import {
  buildNarrationErrorPayload,
  narrationErrorHttpStatus,
  type NarrationErrorCategory,
} from "@/lib/life-lab/narration-errors";
import { canUseCoachingFeatures } from "@/lib/roles";

type CoachingNarrationChunkBody = {
  reflection?: string;
  question?: string | null;
  experiment?: string | null;
  contentHash?: string;
  chunkIndex?: unknown;
  regenerate?: boolean;
  skipCache?: boolean;
  voice?: string;
  model?: string;
};

type CoachingNarrationChunkParams = {
  reflection: string;
  question: string | null;
  experiment: string | null;
  contentHash: string;
  chunkIndex: number;
  regenerate?: boolean;
  skipCache?: boolean;
  voice?: string;
  model?: string;
};

function narrationErrorResponse(
  category: NarrationErrorCategory,
  debugMessage?: string,
) {
  const status = narrationErrorHttpStatus(category);

  return NextResponse.json(
    buildNarrationErrorPayload({
      category,
      debugMessage,
      includeDebug: false,
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

function parseChunkParams(
  input: CoachingNarrationChunkBody,
): CoachingNarrationChunkParams | null {
  const content = parseCoachingReadAloudContent(input);
  const chunkIndex = parseChunkIndex(input.chunkIndex);

  if (!content || chunkIndex == null) {
    return null;
  }

  const contentHash =
    input.contentHash?.trim() || getCoachingNarrationContentHash(content);

  return {
    reflection: content.reflection,
    question: content.question,
    experiment: content.experiment,
    contentHash,
    chunkIndex,
    regenerate: input.regenerate === true,
    skipCache: input.skipCache === true,
    voice: input.voice,
    model: input.model,
  };
}

async function serveCoachingNarrationChunk(params: CoachingNarrationChunkParams) {
  const session = await auth();

  if (!session?.user?.id || !canUseCoachingFeatures(session.user)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const config = validateOpenAiTtsConfiguration();

  if (!config.ok) {
    logNarrationDiagnostic({
      stage: "feature-check",
      noteId: `coaching:${session.user.id}`,
      errorType: config.reason,
      errorMessage: `OpenAI TTS configuration check failed: ${config.reason}`,
    });

    return narrationErrorResponse(config.reason);
  }

  const content = {
    reflection: params.reflection,
    question: params.question,
    experiment: params.experiment,
  };

  try {
    const narrationSettings = await getResolvedCoachingNarrationSettingsForUser(
      session.user.id,
    );
    const result = await getOrCreateCoachingNarrationChunk({
      content,
      contentHash: params.contentHash,
      chunkIndex: params.chunkIndex,
      userId: session.user.id,
      narrationSettings,
      regenerate: params.regenerate === true,
      skipCache: params.skipCache === true,
      model: params.model,
    });

    logNarrationDiagnostic({
      stage: "response",
      noteId: `coaching:${session.user.id}`,
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
        ...(result.cacheWriteFailed
          ? { "X-Narration-Cache-Write": "failed" }
          : {}),
      },
    });
  } catch (error) {
    const mapped = mapCoachingNarrationServiceError(error, false);

    logNarrationDiagnostic({
      stage:
        mapped.body.category === "empty_narration_text"
          ? "text-extraction"
          : "openai-request",
      noteId: `coaching:${session.user.id}`,
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
    reflection: url.searchParams.get("reflection") ?? undefined,
    question: url.searchParams.get("question"),
    experiment: url.searchParams.get("experiment"),
    contentHash: url.searchParams.get("contentHash") ?? undefined,
    chunkIndex: url.searchParams.get("chunkIndex") ?? undefined,
    regenerate: url.searchParams.get("regenerate") === "1",
    skipCache: url.searchParams.get("skipCache") === "1",
    voice: url.searchParams.get("voice") ?? undefined,
    model: url.searchParams.get("model") ?? undefined,
  });

  if (!params) {
    return NextResponse.json(
      { error: "reflection and chunkIndex are required." },
      { status: 400 },
    );
  }

  return serveCoachingNarrationChunk(params);
}

export async function POST(request: Request) {
  let body: CoachingNarrationChunkBody;

  try {
    body = (await request.json()) as CoachingNarrationChunkBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const params = parseChunkParams(body);

  if (!params) {
    return NextResponse.json(
      { error: "reflection and chunkIndex are required." },
      { status: 400 },
    );
  }

  return serveCoachingNarrationChunk(params);
}

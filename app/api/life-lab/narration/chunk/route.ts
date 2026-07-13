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
import { canAccessLifeLabPage } from "@/lib/roles";
import { isLifeLabDevToolsEnabled } from "@/lib/life-lab/dev";

type NarrationChunkBody = {
  sectionId?: string;
  slug?: string;
  chunkIndex?: number;
  regenerate?: boolean;
  skipCache?: boolean;
  voice?: string;
  model?: string;
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

    return narrationErrorResponse(config.reason);
  }

  let body: NarrationChunkBody;

  try {
    body = (await request.json()) as NarrationChunkBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const sectionId = body.sectionId?.trim();
  const slug = body.slug?.trim();
  const chunkIndex = body.chunkIndex;

  if (!sectionId || !slug || chunkIndex == null || chunkIndex < 0) {
    return NextResponse.json(
      { error: "sectionId, slug, and chunkIndex are required." },
      { status: 400 },
    );
  }

  const { note } = await getLifeLabNoteData(sectionId, slug);

  if (!note) {
    return NextResponse.json({ error: "Note not found." }, { status: 404 });
  }

  try {
    const result = await getOrCreateNarrationChunk({
      note,
      chunkIndex,
      userId: session.user.id,
      regenerate: body.regenerate === true,
      skipCache: body.skipCache === true,
      voice: body.voice,
      model: body.model,
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

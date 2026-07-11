import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { getLifeLabNoteData } from "@/lib/life-lab";
import { getOrCreateNarrationChunk } from "@/lib/life-lab/narration-service";
import { isLifeLabOpenAiTtsEnabled } from "@/lib/env";
import { canAccessLifeLabPage } from "@/lib/roles";

type NarrationChunkBody = {
  sectionId?: string;
  slug?: string;
  chunkIndex?: number;
  regenerate?: boolean;
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
      voice: body.voice,
      model: body.model,
    });

    return new NextResponse(new Uint8Array(result.audio), {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": result.cached ? "private, max-age=3600" : "private, no-store",
        "X-Narration-Cache": result.cached ? "hit" : "miss",
        "X-Narration-Chunk-Index": String(result.chunkIndex),
        "X-Narration-Chunk-Count": String(result.chunkCount),
        "X-Narration-Section-Label": encodeURIComponent(result.sectionLabel),
        "X-Narration-Cache-Key": result.cacheKey,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Narration generation failed.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

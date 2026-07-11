import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { getLifeLabNoteData } from "@/lib/life-lab";
import {
  buildNoteNarrationChunks,
  getNoteNarrationContentHash,
} from "@/lib/life-lab/narration-service";
import {
  isLifeLabOpenAiTtsEnabled,
} from "@/lib/env";
import { canAccessLifeLabPage } from "@/lib/roles";

type NarrationPlanBody = {
  sectionId?: string;
  slug?: string;
};

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id || !canAccessLifeLabPage(session.user)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: NarrationPlanBody;

  try {
    body = (await request.json()) as NarrationPlanBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const sectionId = body.sectionId?.trim();
  const slug = body.slug?.trim();

  if (!sectionId || !slug) {
    return NextResponse.json(
      { error: "sectionId and slug are required." },
      { status: 400 },
    );
  }

  const { note } = await getLifeLabNoteData(sectionId, slug);

  if (!note) {
    return NextResponse.json({ error: "Note not found." }, { status: 404 });
  }

  const chunks = buildNoteNarrationChunks(note, true);

  return NextResponse.json({
    chunkCount: chunks.length,
    contentHash: getNoteNarrationContentHash(note, true),
    sections: chunks.map((chunk) => ({
      index: chunk.index,
      sectionLabel: chunk.sectionLabel,
    })),
    openAiAvailable: isLifeLabOpenAiTtsEnabled(),
  });
}

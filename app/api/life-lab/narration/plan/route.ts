import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { validateOpenAiTtsConfiguration } from "@/lib/env";
import { getLifeLabNoteData } from "@/lib/life-lab";
import { isLifeLabDevToolsEnabled } from "@/lib/life-lab/dev";
import { logNarrationDiagnostic } from "@/lib/life-lab/narration-diagnostics";
import {
  buildNarrationErrorPayload,
  narrationErrorHttpStatus,
} from "@/lib/life-lab/narration-errors";
import {
  buildNoteNarrationChunks,
  getNoteNarrationContentHash,
  summarizeNoteNarrationText,
} from "@/lib/life-lab/narration-service";
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

  const config = validateOpenAiTtsConfiguration();
  const textSummary = summarizeNoteNarrationText(note, true);
  const chunks = buildNoteNarrationChunks(note, true);

  logNarrationDiagnostic({
    stage: "text-extraction",
    noteId: note.fileId,
    ...textSummary,
  });

  if (!config.ok) {
    logNarrationDiagnostic({
      stage: "feature-check",
      noteId: note.fileId,
      errorType: config.reason,
      errorMessage: `OpenAI TTS configuration check failed: ${config.reason}`,
    });
  }

  if (textSummary.isEmpty) {
    return NextResponse.json(
      buildNarrationErrorPayload({
        category: "empty_narration_text",
        includeDebug: isLifeLabDevToolsEnabled(),
      }),
      { status: narrationErrorHttpStatus("empty_narration_text") },
    );
  }

  return NextResponse.json({
    chunkCount: chunks.length,
    contentHash: getNoteNarrationContentHash(note, true),
    sections: chunks.map((chunk) => ({
      index: chunk.index,
      sectionLabel: chunk.sectionLabel,
    })),
    openAiAvailable: config.ok,
    ...(config.ok
      ? {}
      : {
          unavailable: buildNarrationErrorPayload({
            category: config.reason,
            includeDebug: isLifeLabDevToolsEnabled(),
          }),
        }),
  });
}

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
  buildNoteReadAloudPlan,
  getNoteNarrationContentHash,
  summarizeNoteNarrationText,
} from "@/lib/life-lab/narration-service";
import {
  buildLifeLabNarrationSessionConfig,
  logNarrationSessionStart,
  serializeNarrationSessionConfig,
} from "@/lib/life-lab/narration-session";
import {
  getLifeLabReadAloudPreferencesForUser,
  getResolvedOpenAiNarrationSettingsForUser,
} from "@/lib/life-lab/read-aloud-preferences";
import { logReadAloudSectionOrderDiagnostic } from "@/lib/life-lab/read-aloud-section-order";
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

  const [readAloudPreferences, narrationSettings] = await Promise.all([
    getLifeLabReadAloudPreferencesForUser(session.user.id),
    getResolvedOpenAiNarrationSettingsForUser(session.user.id),
  ]);
  const config = validateOpenAiTtsConfiguration();
  const textSummary = summarizeNoteNarrationText(
    note,
    true,
    readAloudPreferences.readAloudSectionInclusion,
  );
  const plan = buildNoteReadAloudPlan(note, {
    includeFlashcards: readAloudPreferences.readAloudSectionInclusion.flashcards,
    inclusion: readAloudPreferences.readAloudSectionInclusion,
  });
  const sessionConfig = buildLifeLabNarrationSessionConfig({
    settings: narrationSettings,
    model: config.ok ? config.model : undefined,
  });

  logReadAloudSectionOrderDiagnostic(note.fileId, {
    title: note.title,
    content: note.content,
    flashcards: readAloudPreferences.readAloudSectionInclusion.flashcards
      ? note.flashcards
      : undefined,
    inclusion: readAloudPreferences.readAloudSectionInclusion,
  });

  logNarrationDiagnostic({
    stage: "text-extraction",
    noteId: note.fileId,
    ...textSummary,
  });

  logNarrationSessionStart({
    session: sessionConfig,
    contentId: note.fileId,
    sectionCount: plan.sections.length,
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
    chunkCount: plan.chunks.length,
    sectionCount: plan.sections.length,
    contentHash: getNoteNarrationContentHash(
      note,
      true,
      readAloudPreferences.readAloudSectionInclusion,
    ),
    sessionConfig: serializeNarrationSessionConfig(sessionConfig),
    sections: plan.sectionChunkRanges.map((range) => ({
      id: range.sectionId,
      title: range.sectionTitle,
      order: range.sectionOrder,
      sectionIndex: range.sectionIndex,
      firstChunkIndex: range.firstChunkIndex,
      chunkCount: range.chunkCount,
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

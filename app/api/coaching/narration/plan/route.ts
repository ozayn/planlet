import { NextResponse } from "next/server";

import { auth } from "@/auth";
import {
  buildCoachingReadAloudPlan,
  getCoachingNarrationContentHash,
  parseCoachingReadAloudContent,
  summarizeCoachingNarrationText,
} from "@/lib/coaching/narration-service";
import { validateOpenAiTtsConfiguration } from "@/lib/env";
import { logNarrationDiagnostic } from "@/lib/life-lab/narration-diagnostics";
import {
  buildNarrationErrorPayload,
  narrationErrorHttpStatus,
} from "@/lib/life-lab/narration-errors";
import { canUseCoachingFeatures } from "@/lib/roles";

type CoachingNarrationPlanBody = {
  reflection?: string;
  question?: string | null;
  experiment?: string | null;
  contentHash?: string;
};

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id || !canUseCoachingFeatures(session.user)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: CoachingNarrationPlanBody;

  try {
    body = (await request.json()) as CoachingNarrationPlanBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const content = parseCoachingReadAloudContent(body);

  if (!content) {
    return NextResponse.json(
      buildNarrationErrorPayload({
        category: "empty_narration_text",
        includeDebug: false,
      }),
      { status: narrationErrorHttpStatus("empty_narration_text") },
    );
  }

  const contentHash = getCoachingNarrationContentHash(content);

  if (body.contentHash?.trim() && body.contentHash.trim() !== contentHash) {
    return NextResponse.json(
      { error: "Coaching content has changed. Refresh and try again." },
      { status: 409 },
    );
  }

  const config = validateOpenAiTtsConfiguration();
  const textSummary = summarizeCoachingNarrationText(content);
  const plan = buildCoachingReadAloudPlan(content);

  logNarrationDiagnostic({
    stage: "text-extraction",
    noteId: `coaching:${session.user.id}`,
    characterCount: textSummary.characterCount,
    sectionCount: textSummary.sectionCount,
    firstSectionLabel: textSummary.firstSectionLabel,
  });

  if (!config.ok) {
    logNarrationDiagnostic({
      stage: "feature-check",
      noteId: `coaching:${session.user.id}`,
      errorType: config.reason,
      errorMessage: `OpenAI TTS configuration check failed: ${config.reason}`,
    });
  }

  if (textSummary.isEmpty) {
    return NextResponse.json(
      buildNarrationErrorPayload({
        category: "empty_narration_text",
        includeDebug: false,
      }),
      { status: narrationErrorHttpStatus("empty_narration_text") },
    );
  }

  return NextResponse.json({
    chunkCount: plan.chunks.length,
    sectionCount: plan.sections.length,
    contentHash,
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
            includeDebug: false,
          }),
        }),
  });
}

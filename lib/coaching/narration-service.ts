import {
  buildCoachingNarrationCacheKey,
  getCoachingNarrationProviderId,
  hashNarrationContent,
} from "@/lib/coaching/narration-cache-key";
import {
  buildCoachingReadAloudPlaybackPlan,
  type CoachingReadAloudContent,
} from "@/lib/coaching/read-aloud-sections";
import {
  findCoachingNarrationCacheByKey,
  readCoachingNarrationAudioFile,
  saveCoachingNarrationCacheRecord,
  touchCoachingNarrationCache,
} from "@/lib/coaching/narration-storage";
import {
  getDefaultOpenAiNarrationModel,
  NarrationSynthesisError,
  synthesizeSpeech,
} from "@/lib/ai/synthesize-speech";
import { NARRATION_CONTENT_PROFILES } from "@/lib/life-lab/narration-config";
import type { ResolvedCoachingNarrationSettings } from "@/lib/coaching/narration-preferences";
import { getCoachingNarrationPreviewText } from "@/lib/coaching/narration-preferences";
import { logNarrationDiagnostic } from "@/lib/life-lab/narration-diagnostics";
import {
  buildNarrationErrorPayload,
  narrationErrorHttpStatus,
  type NarrationErrorCategory,
} from "@/lib/life-lab/narration-errors";
import {
  estimateNarrationInputCharacters,
  type ReadAloudPlaybackPlan,
} from "@/lib/life-lab/narration-chunks";
import {
  buildCoachingNarrationSessionConfig,
  isNarrationChunkCompatible,
  logNarrationChunkDiagnostic,
  type OpenAiNarrationSessionConfig,
} from "@/lib/life-lab/narration-session";

export type CoachingNarrationChunkRequest = {
  content: CoachingReadAloudContent;
  contentHash: string;
  chunkIndex: number;
  userId: string;
  narrationSettings: ResolvedCoachingNarrationSettings;
  sessionConfig?: OpenAiNarrationSessionConfig;
  model?: string;
  regenerate?: boolean;
  skipCache?: boolean;
};

export type CoachingNarrationChunkResult = {
  chunkIndex: number;
  chunkCount: number;
  sectionId: string;
  sectionIndex: number;
  sectionLabel: string;
  cacheKey: string;
  cached: boolean;
  cacheWriteFailed: boolean;
  audio: Buffer;
  contentHash: string;
  model: string;
  voice: string;
  style: string;
  instructionsFingerprint: string;
  instructionVersion: number;
  contentProfile: string;
  sessionId: string;
};

export type CoachingNarrationTextSummary = {
  characterCount: number;
  sectionCount: number;
  firstSectionLabel: string | null;
  isEmpty: boolean;
};

export function buildCoachingReadAloudPlan(
  content: CoachingReadAloudContent,
): ReadAloudPlaybackPlan {
  return buildCoachingReadAloudPlaybackPlan(content);
}

export function summarizeCoachingNarrationText(
  content: CoachingReadAloudContent,
): CoachingNarrationTextSummary {
  const plan = buildCoachingReadAloudPlan(content);

  return {
    characterCount: estimateNarrationInputCharacters(plan.chunks),
    sectionCount: plan.sections.length,
    firstSectionLabel: plan.sections[0]?.title ?? null,
    isEmpty: plan.chunks.length === 0,
  };
}

export function getCoachingNarrationContentHash(
  content: CoachingReadAloudContent,
): string {
  const plan = buildCoachingReadAloudPlan(content);

  return hashNarrationContent(
    plan.chunks.map((chunk) => `${chunk.sectionId}:${chunk.text}`).join("\n"),
  );
}

export function parseCoachingReadAloudContent(input: {
  reflection?: string;
  question?: string | null;
  experiment?: string | null;
}): CoachingReadAloudContent | null {
  const reflection = input.reflection?.trim() ?? "";

  if (!reflection) {
    return null;
  }

  return {
    reflection,
    question: input.question?.trim() || null,
    experiment: input.experiment?.trim() || null,
  };
}

export async function getOrCreateCoachingNarrationChunk(
  input: CoachingNarrationChunkRequest,
): Promise<CoachingNarrationChunkResult> {
  const computedHash = getCoachingNarrationContentHash(input.content);

  if (computedHash !== input.contentHash) {
    throw new Error("Coaching narration content hash mismatch.");
  }

  const plan = buildCoachingReadAloudPlan(input.content);
  const chunks = plan.chunks;

  if (chunks.length === 0) {
    logNarrationDiagnostic({
      stage: "text-extraction",
      noteId: `coaching:${input.userId}`,
      ...summarizeCoachingNarrationText(input.content),
      errorType: "empty_narration_text",
      errorMessage: "No readable coaching narration text was extracted.",
    });
    throw new NarrationSynthesisError("empty_narration_text");
  }

  const chunk = chunks[input.chunkIndex];

  if (!chunk) {
    throw new Error("Narration chunk not found.");
  }

  const session =
    input.sessionConfig ??
    buildCoachingNarrationSessionConfig({
      settings: input.narrationSettings,
      model: input.model,
    });
  const model = session.model;
  const voice = session.voice;
  const instructions = session.instructions;
  const narrationStyleSlug = session.style;
  const instructionsFingerprint = session.instructionsFingerprint;
  const instructionVersion = session.instructionVersion;
  const contentProfileVersion = session.contentProfileVersion;
  const cacheKey = buildCoachingNarrationCacheKey({
    userId: input.userId,
    contentHash: computedHash,
    provider: getCoachingNarrationProviderId(),
    model,
    voice,
    narrationStyle: narrationStyleSlug,
    narrationProfile: NARRATION_CONTENT_PROFILES.COACHING,
    readAloudSectionId: chunk.sectionId,
    instructionsFingerprint,
    instructionVersion,
    contentProfileVersion,
    chunkIndex: chunk.index,
  });

  if (!input.regenerate && !input.skipCache) {
    try {
      const cached = await findCoachingNarrationCacheByKey({
        userId: input.userId,
        cacheKey,
      });

      if (cached) {
        const compatible = isNarrationChunkCompatible(
          {
            model: cached.model,
            voice: cached.voice,
            narrationStyle: cached.narrationStyle,
            instructionsFingerprint: cached.instructionsFingerprint,
            instructionVersion: cached.instructionVersion,
            contentProfile: NARRATION_CONTENT_PROFILES.COACHING,
            contentProfileVersion: cached.contentProfileVersion,
            contentHash: cached.contentHash,
            sectionId: cached.readAloudSectionId,
            chunkIndex: cached.chunkIndex,
          },
          session,
          {
            contentHash: computedHash,
            sectionId: chunk.sectionId,
            chunkIndex: chunk.index,
          },
        );

        logNarrationChunkDiagnostic({
          sessionId: session.sessionId,
          sectionId: chunk.sectionId,
          chunkIndex: chunk.index,
          source: "cache",
          cachedVoice: cached.voice,
          cachedStyle: cached.narrationStyle,
          compatible,
        });

        if (compatible) {
          const audio = await readCoachingNarrationAudioFile(cached.storageKey);

          if (audio) {
            await touchCoachingNarrationCache({
              userId: input.userId,
              cacheKey,
            });

            return {
              chunkIndex: chunk.index,
              chunkCount: chunks.length,
              sectionId: chunk.sectionId,
              sectionIndex: chunk.sectionIndex,
              sectionLabel: chunk.sectionTitle,
              cacheKey,
              cached: true,
              cacheWriteFailed: false,
              audio,
              contentHash: computedHash,
              model,
              voice,
              style: narrationStyleSlug,
              instructionsFingerprint,
              instructionVersion,
              contentProfile: session.contentProfile,
              sessionId: session.sessionId,
            };
          }
        } else {
          logNarrationDiagnostic({
            stage: "cache-read",
            noteId: `coaching:${input.userId}`,
            model,
            voice,
            errorType: "narration_configuration_mismatch",
            errorMessage:
              "Cached coaching narration chunk is incompatible with the locked session config.",
          });
        }
      }
    } catch (error) {
      logNarrationDiagnostic({
        stage: "cache-read",
        noteId: `coaching:${input.userId}`,
        model,
        voice,
        errorType: error instanceof Error ? error.name : typeof error,
        errorMessage:
          error instanceof Error ? error.message : "Coaching cache read failed.",
      });
    }
  }

  logNarrationDiagnostic({
    stage: "text-extraction",
    noteId: `coaching:${input.userId}`,
    inputLength: chunk.text.length,
    sectionCount: plan.sections.length,
    characterCount: chunk.text.length,
    firstSectionLabel: chunk.sectionTitle,
  });

  const synthesized = await synthesizeSpeech({
    text: chunk.text,
    userId: input.userId,
    model,
    voice,
    instructions,
    noteId: `coaching:${input.userId}`,
  });

  let cacheWriteFailed = false;

  if (!input.skipCache) {
    try {
      await saveCoachingNarrationCacheRecord({
        userId: input.userId,
        cacheKey,
        contentHash: computedHash,
        contentProfileVersion,
        model,
        voice,
        narrationStyle: narrationStyleSlug,
        instructionsFingerprint,
        instructionVersion,
        readAloudSectionId: chunk.sectionId,
        chunkIndex: chunk.index,
        sectionLabel: chunk.sectionTitle,
        audio: synthesized.audio,
      });
    } catch (error) {
      cacheWriteFailed = true;
      logNarrationDiagnostic({
        stage: "cache-write",
        noteId: `coaching:${input.userId}`,
        model,
        voice,
        inputLength: chunk.text.length,
        audioByteSize: synthesized.audio.byteLength,
        cacheWriteFailed: true,
        errorType: error instanceof Error ? error.name : typeof error,
        errorMessage:
          error instanceof Error
            ? error.message
            : "Coaching narration cache write failed.",
      });
    }
  }

  logNarrationChunkDiagnostic({
    sessionId: session.sessionId,
    sectionId: chunk.sectionId,
    chunkIndex: chunk.index,
    source: "fresh",
    cachedVoice: voice,
    cachedStyle: narrationStyleSlug,
    compatible: true,
  });

  return {
    chunkIndex: chunk.index,
    chunkCount: chunks.length,
    sectionId: chunk.sectionId,
    sectionIndex: chunk.sectionIndex,
    sectionLabel: chunk.sectionTitle,
    cacheKey,
    cached: false,
    cacheWriteFailed,
    audio: synthesized.audio,
    contentHash: computedHash,
    model,
    voice,
    style: narrationStyleSlug,
    instructionsFingerprint,
    instructionVersion,
    contentProfile: session.contentProfile,
    sessionId: session.sessionId,
  };
}

export async function synthesizeCoachingNarrationPreviewAudio(input: {
  userId: string;
  settings: ResolvedCoachingNarrationSettings;
  model?: string;
}): Promise<{
  audio: Buffer;
  model: string;
  voice: string;
  narrationStyle: string;
}> {
  const model = input.model ?? getDefaultOpenAiNarrationModel();
  const synthesized = await synthesizeSpeech({
    text: getCoachingNarrationPreviewText(),
    userId: input.userId,
    model,
    voice: input.settings.voice,
    instructions: input.settings.instructions,
    noteId: `coaching-preview:${input.userId}`,
  });

  return {
    audio: synthesized.audio,
    model: synthesized.model,
    voice: synthesized.voice,
    narrationStyle: input.settings.narrationStyleSlug,
  };
}

export function mapCoachingNarrationServiceError(
  error: unknown,
  includeDebug: boolean,
): {
  status: number;
  body: ReturnType<typeof buildNarrationErrorPayload>;
} {
  if (error instanceof NarrationSynthesisError) {
    return {
      status: narrationErrorHttpStatus(error.category),
      body: buildNarrationErrorPayload({
        category: error.category,
        debugMessage: error.message,
        includeDebug,
      }),
    };
  }

  const category: NarrationErrorCategory = "unknown";

  return {
    status: 500,
    body: buildNarrationErrorPayload({
      category,
      debugMessage:
        error instanceof Error
          ? error.message
          : "Coaching narration generation failed.",
      includeDebug,
    }),
  };
}

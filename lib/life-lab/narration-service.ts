import { unlink } from "node:fs/promises";
import { join } from "node:path";

import type { LifeLabNote } from "@/lib/life-lab/constants";
import {
  buildNarrationCacheKey,
  hashNarrationContent,
} from "@/lib/life-lab/narration-cache-key";
import {
  buildReadAloudPlaybackPlan,
  estimateNarrationInputCharacters,
  type NarrationPlaybackChunk,
  type ReadAloudPlaybackPlan,
} from "@/lib/life-lab/narration-chunks";
import {
  NarrationSynthesisError,
  synthesizeSpeech,
} from "@/lib/ai/synthesize-speech";
import {
  LIFE_LAB_READ_ALOUD_PROVIDERS,
  OPENAI_NARRATION_STYLES,
} from "@/lib/life-lab/narration-config";
import type { ResolvedOpenAiNarrationSettings } from "@/lib/life-lab/openai-narration-preferences";
import {
  getNarrationPreviewText,
  resolveOpenAiNarrationSettings,
  type OpenAiNarrationPreferences,
} from "@/lib/life-lab/openai-narration-preferences";
import { logNarrationDiagnostic } from "@/lib/life-lab/narration-diagnostics";
import {
  buildNarrationErrorPayload,
  narrationErrorHttpStatus,
  type NarrationErrorCategory,
} from "@/lib/life-lab/narration-errors";
import { buildReadAloudSectionsFromNote } from "@/lib/life-lab/narration-text";
import type { ReadAloudSectionInclusionPrefs } from "@/lib/life-lab/read-aloud-sections";
import { getNarrationStorageDir } from "@/lib/life-lab/narration-storage-dir";
import { prisma } from "@/lib/prisma";
import {
  findNarrationCacheByKey,
  readNarrationAudioFile,
  saveNarrationCacheRecord,
  touchNarrationCache,
} from "@/lib/life-lab/narration-storage";
import {
  buildLifeLabNarrationSessionConfig,
  isNarrationChunkCompatible,
  logNarrationChunkDiagnostic,
  type OpenAiNarrationSessionConfig,
} from "@/lib/life-lab/narration-session";

export type NarrationChunkRequest = {
  note: Pick<
    LifeLabNote,
    "fileId" | "modifiedAt" | "title" | "content" | "flashcards"
  >;
  chunkIndex: number;
  userId: string;
  narrationSettings: ResolvedOpenAiNarrationSettings;
  sessionConfig?: OpenAiNarrationSessionConfig;
  sectionInclusion?: ReadAloudSectionInclusionPrefs;
  model?: string;
  regenerate?: boolean;
  includeFlashcards?: boolean;
  skipCache?: boolean;
};

export type NarrationChunkResult = {
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

export type NarrationTextSummary = {
  characterCount: number;
  sectionCount: number;
  firstSectionLabel: string | null;
  isEmpty: boolean;
};

export function buildNoteReadAloudPlan(
  note: Pick<LifeLabNote, "title" | "content" | "flashcards">,
  options?: {
    includeFlashcards?: boolean;
    inclusion?: ReadAloudSectionInclusionPrefs;
  },
): ReadAloudPlaybackPlan {
  const sections = buildReadAloudSectionsFromNote({
    title: note.title,
    content: note.content,
    includeFlashcards: options?.includeFlashcards ?? true,
    flashcards: note.flashcards,
    inclusion: options?.inclusion,
  });

  return buildReadAloudPlaybackPlan(sections);
}

export function summarizeNoteNarrationText(
  note: Pick<LifeLabNote, "title" | "content" | "flashcards">,
  includeFlashcards = true,
  inclusion?: ReadAloudSectionInclusionPrefs,
): NarrationTextSummary {
  const plan = buildNoteReadAloudPlan(note, { includeFlashcards, inclusion });

  return {
    characterCount: estimateNarrationInputCharacters(plan.chunks),
    sectionCount: plan.sections.length,
    firstSectionLabel: plan.sections[0]?.title ?? null,
    isEmpty: plan.chunks.length === 0,
  };
}

export function buildNoteNarrationChunks(
  note: Pick<LifeLabNote, "title" | "content" | "flashcards">,
  includeFlashcards = true,
  inclusion?: ReadAloudSectionInclusionPrefs,
): NarrationPlaybackChunk[] {
  return buildNoteReadAloudPlan(note, { includeFlashcards, inclusion }).chunks;
}

export function getNoteNarrationContentHash(
  note: Pick<LifeLabNote, "title" | "content" | "flashcards">,
  includeFlashcards = true,
  inclusion?: ReadAloudSectionInclusionPrefs,
): string {
  const plan = buildNoteReadAloudPlan(note, { includeFlashcards, inclusion });

  return hashNarrationContent(
    plan.chunks
      .map((chunk) => `${chunk.sectionId}:${chunk.text}`)
      .join("\n"),
  );
}

export async function synthesizeNarrationTestAudio(input: {
  userId: string;
  voice?: string;
  model?: string;
  instructions?: string;
}): Promise<{
  audio: Buffer;
  model: string;
  voice: string;
}> {
  const synthesized = await synthesizeSpeech({
    text: "Hello. This is a Planlet audio playback test.",
    userId: input.userId,
    voice: input.voice,
    model: input.model,
    instructions: input.instructions,
  });

  return {
    audio: synthesized.audio,
    model: synthesized.model,
    voice: synthesized.voice,
  };
}

export async function synthesizeNarrationPreviewAudio(input: {
  userId: string;
  preferences: OpenAiNarrationPreferences;
  model?: string;
}): Promise<{
  audio: Buffer;
  model: string;
  voice: string;
  narrationStyle: string;
}> {
  const settings = resolveOpenAiNarrationSettings(input.preferences);
  const synthesized = await synthesizeSpeech({
    text: getNarrationPreviewText(),
    userId: input.userId,
    model: input.model,
    voice: settings.voice,
    instructions: settings.instructions,
  });

  return {
    audio: synthesized.audio,
    model: synthesized.model,
    voice: synthesized.voice,
    narrationStyle: OPENAI_NARRATION_STYLES[settings.narrationStyle].slug,
  };
}

export async function getOrCreateNarrationChunk(
  input: NarrationChunkRequest,
): Promise<NarrationChunkResult> {
  const noteId = input.note.fileId;
  const plan = buildNoteReadAloudPlan(input.note, {
    includeFlashcards: input.includeFlashcards ?? true,
    inclusion: input.sectionInclusion,
  });
  const chunks = plan.chunks;

  if (chunks.length === 0) {
    logNarrationDiagnostic({
      stage: "text-extraction",
      noteId,
      ...summarizeNoteNarrationText(
        input.note,
        input.includeFlashcards ?? true,
        input.sectionInclusion,
      ),
      errorType: "empty_narration_text",
      errorMessage: "No readable narration text was extracted from the note.",
    });
    throw new NarrationSynthesisError("empty_narration_text");
  }

  const chunk = chunks[input.chunkIndex];

  if (!chunk) {
    throw new Error("Narration chunk not found.");
  }

  const session =
    input.sessionConfig ??
    buildLifeLabNarrationSessionConfig({
      settings: input.narrationSettings,
      model: input.model,
    });
  const model = session.model;
  const voice = session.voice;
  const instructions = session.instructions;
  const instructionsFingerprint = session.instructionsFingerprint;
  const instructionVersion = session.instructionVersion;
  const narrationStyleSlug = session.style;
  const contentHash = getNoteNarrationContentHash(
    input.note,
    input.includeFlashcards ?? true,
    input.sectionInclusion,
  );
  const cacheKey = buildNarrationCacheKey({
    driveFileId: input.note.fileId,
    noteModifiedTime: input.note.modifiedAt,
    contentHash,
    provider: LIFE_LAB_READ_ALOUD_PROVIDERS.OPENAI,
    model,
    voice,
    narrationStyle: narrationStyleSlug,
    readAloudSectionId: chunk.sectionId,
    instructionsFingerprint,
    instructionVersion,
    chunkIndex: chunk.index,
  });

  if (!input.regenerate && !input.skipCache) {
    try {
      const cached = await findNarrationCacheByKey(cacheKey);

      if (cached) {
        const compatible = isNarrationChunkCompatible(
          {
            model: cached.model,
            voice: cached.voice,
            narrationStyle: cached.narrationStyle,
            instructionsFingerprint: cached.instructionsFingerprint,
            instructionVersion: cached.instructionVersion,
            contentProfile: cached.contentProfile,
            contentHash: cached.contentHash,
            sectionId: cached.readAloudSectionId,
            chunkIndex: cached.chunkIndex,
          },
          session,
          {
            contentHash,
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
          const audio = await readNarrationAudioFile(cached.storageKey);

          if (audio) {
            await touchNarrationCache(cacheKey);

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
              contentHash,
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
            noteId,
            model,
            voice,
            errorType: "narration_configuration_mismatch",
            errorMessage:
              "Cached narration chunk is incompatible with the locked session config.",
          });
        }
      }
    } catch (error) {
      logNarrationDiagnostic({
        stage: "cache-read",
        noteId,
        model,
        voice,
        errorType: error instanceof Error ? error.name : typeof error,
        errorMessage:
          error instanceof Error ? error.message : "Narration cache read failed.",
      });
    }
  }

  logNarrationDiagnostic({
    stage: "text-extraction",
    noteId,
    inputLength: chunk.text.length,
    ...summarizeNoteNarrationText(
      input.note,
      input.includeFlashcards ?? true,
      input.sectionInclusion,
    ),
  });

  const synthesized = await synthesizeSpeech({
    text: chunk.text,
    userId: input.userId,
    model,
    voice,
    instructions,
    noteId,
  });

  let cacheWriteFailed = false;

  if (!input.skipCache) {
    try {
      await saveNarrationCacheRecord({
        cacheKey,
        driveFileId: input.note.fileId,
        noteModifiedTime: input.note.modifiedAt,
        contentHash,
        model,
        voice,
        narrationStyle: narrationStyleSlug,
        instructionsFingerprint,
        contentProfile: session.contentProfile,
        readAloudSectionId: chunk.sectionId,
        instructionVersion,
        chunkIndex: chunk.index,
        sectionLabel: chunk.sectionTitle,
        audio: synthesized.audio,
      });
    } catch (error) {
      cacheWriteFailed = true;
      logNarrationDiagnostic({
        stage: "cache-write",
        noteId,
        model,
        voice,
        inputLength: chunk.text.length,
        audioByteSize: synthesized.audio.byteLength,
        cacheWriteFailed: true,
        errorType: error instanceof Error ? error.name : typeof error,
        errorMessage:
          error instanceof Error ? error.message : "Narration cache write failed.",
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
    contentHash,
    model,
    voice,
    style: narrationStyleSlug,
    instructionsFingerprint,
    instructionVersion,
    contentProfile: session.contentProfile,
    sessionId: session.sessionId,
  };
}

export function mapNarrationServiceError(
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
        error instanceof Error ? error.message : "Narration generation failed.",
      includeDebug,
    }),
  };
}

export async function regenerateNarrationForNote(input: {
  driveFileId: string;
}): Promise<number> {
  const records = await prisma.lifeLabNarrationCache.findMany({
    where: {
      driveFileId: input.driveFileId,
    },
    select: { cacheKey: true, storageKey: true },
  });

  await Promise.all(
    records.map(async (record) => {
      try {
        await unlink(join(getNarrationStorageDir(), record.storageKey));
      } catch {
        // Ignore missing files.
      }
    }),
  );

  const result = await prisma.lifeLabNarrationCache.deleteMany({
    where: {
      driveFileId: input.driveFileId,
    },
  });

  return result.count;
}

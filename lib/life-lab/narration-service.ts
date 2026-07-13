import type { LifeLabNote } from "@/lib/life-lab/constants";
import {
  buildNarrationCacheKey,
  hashNarrationContent,
} from "@/lib/life-lab/narration-cache-key";
import {
  buildNarrationPlaybackChunks,
  estimateNarrationInputCharacters,
  type NarrationPlaybackChunk,
} from "@/lib/life-lab/narration-chunks";
import {
  getDefaultOpenAiNarrationModel,
  getDefaultOpenAiNarrationVoice,
  NarrationSynthesisError,
  synthesizeSpeech,
} from "@/lib/ai/synthesize-speech";
import {
  NARRATION_INSTRUCTION_VERSION,
  LIFE_LAB_READ_ALOUD_PROVIDERS,
} from "@/lib/life-lab/narration-config";
import { logNarrationDiagnostic } from "@/lib/life-lab/narration-diagnostics";
import {
  buildNarrationErrorPayload,
  narrationErrorHttpStatus,
  type NarrationErrorCategory,
} from "@/lib/life-lab/narration-errors";
import { buildNarrationDocument } from "@/lib/life-lab/narration-text";
import {
  findNarrationCacheByKey,
  invalidateNarrationCacheForNote,
  readNarrationAudioFile,
  saveNarrationCacheRecord,
  touchNarrationCache,
} from "@/lib/life-lab/narration-storage";

export type NarrationChunkRequest = {
  note: Pick<
    LifeLabNote,
    "fileId" | "modifiedAt" | "title" | "content" | "flashcards"
  >;
  chunkIndex: number;
  userId: string;
  voice?: string;
  model?: string;
  regenerate?: boolean;
  includeFlashcards?: boolean;
  skipCache?: boolean;
};

export type NarrationChunkResult = {
  chunkIndex: number;
  chunkCount: number;
  sectionLabel: string;
  cacheKey: string;
  cached: boolean;
  cacheWriteFailed: boolean;
  audio: Buffer;
  contentHash: string;
  model: string;
  voice: string;
};

export type NarrationTextSummary = {
  characterCount: number;
  sectionCount: number;
  firstSectionLabel: string | null;
  isEmpty: boolean;
};

export function summarizeNoteNarrationText(
  note: Pick<LifeLabNote, "title" | "content" | "flashcards">,
  includeFlashcards = true,
): NarrationTextSummary {
  const chunks = buildNoteNarrationChunks(note, includeFlashcards);

  return {
    characterCount: estimateNarrationInputCharacters(chunks),
    sectionCount: chunks.length,
    firstSectionLabel: chunks[0]?.sectionLabel ?? null,
    isEmpty: chunks.length === 0,
  };
}

export function buildNoteNarrationChunks(
  note: Pick<LifeLabNote, "title" | "content" | "flashcards">,
  includeFlashcards = true,
): NarrationPlaybackChunk[] {
  const sections = buildNarrationDocument({
    title: note.title,
    content: note.content,
    includeFlashcards,
    flashcards: note.flashcards,
  });

  return buildNarrationPlaybackChunks(sections);
}

export function getNoteNarrationContentHash(
  note: Pick<LifeLabNote, "title" | "content" | "flashcards">,
  includeFlashcards = true,
): string {
  const chunks = buildNoteNarrationChunks(note, includeFlashcards);
  return hashNarrationContent(
    chunks.map((chunk) => `${chunk.sectionLabel}:${chunk.text}`).join("\n"),
  );
}

export async function synthesizeNarrationTestAudio(input: {
  userId: string;
  voice?: string;
  model?: string;
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
  });

  return {
    audio: synthesized.audio,
    model: synthesized.model,
    voice: synthesized.voice,
  };
}

export async function getOrCreateNarrationChunk(
  input: NarrationChunkRequest,
): Promise<NarrationChunkResult> {
  const noteId = input.note.fileId;
  const chunks = buildNoteNarrationChunks(
    input.note,
    input.includeFlashcards ?? true,
  );

  if (chunks.length === 0) {
    logNarrationDiagnostic({
      stage: "text-extraction",
      noteId,
      ...summarizeNoteNarrationText(input.note, input.includeFlashcards ?? true),
      errorType: "empty_narration_text",
      errorMessage: "No readable narration text was extracted from the note.",
    });
    throw new NarrationSynthesisError("empty_narration_text");
  }

  const chunk = chunks[input.chunkIndex];

  if (!chunk) {
    throw new Error("Narration chunk not found.");
  }

  const model = input.model ?? getDefaultOpenAiNarrationModel();
  const voice = input.voice ?? getDefaultOpenAiNarrationVoice();
  const contentHash = getNoteNarrationContentHash(
    input.note,
    input.includeFlashcards ?? true,
  );
  const cacheKey = buildNarrationCacheKey({
    driveFileId: input.note.fileId,
    noteModifiedTime: input.note.modifiedAt,
    contentHash,
    provider: LIFE_LAB_READ_ALOUD_PROVIDERS.OPENAI,
    model,
    voice,
    instructionVersion: NARRATION_INSTRUCTION_VERSION,
    chunkIndex: chunk.index,
  });

  if (!input.regenerate && !input.skipCache) {
    try {
      const cached = await findNarrationCacheByKey(cacheKey);

      if (cached) {
        const audio = await readNarrationAudioFile(cached.storageKey);

        if (audio) {
          await touchNarrationCache(cacheKey);

          return {
            chunkIndex: chunk.index,
            chunkCount: chunks.length,
            sectionLabel: chunk.sectionLabel,
            cacheKey,
            cached: true,
            cacheWriteFailed: false,
            audio,
            contentHash,
            model,
            voice,
          };
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
    ...summarizeNoteNarrationText(input.note, input.includeFlashcards ?? true),
  });

  const synthesized = await synthesizeSpeech({
    text: chunk.text,
    userId: input.userId,
    model,
    voice,
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
        instructionVersion: NARRATION_INSTRUCTION_VERSION,
        chunkIndex: chunk.index,
        sectionLabel: chunk.sectionLabel,
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

  return {
    chunkIndex: chunk.index,
    chunkCount: chunks.length,
    sectionLabel: chunk.sectionLabel,
    cacheKey,
    cached: false,
    cacheWriteFailed,
    audio: synthesized.audio,
    contentHash,
    model,
    voice,
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
  voice?: string;
  model?: string;
}): Promise<number> {
  return invalidateNarrationCacheForNote({
    driveFileId: input.driveFileId,
    model: input.model ?? getDefaultOpenAiNarrationModel(),
    voice: input.voice ?? getDefaultOpenAiNarrationVoice(),
    instructionVersion: NARRATION_INSTRUCTION_VERSION,
  });
}

import type { LifeLabNote } from "@/lib/life-lab/constants";
import {
  buildNarrationCacheKey,
  hashNarrationContent,
} from "@/lib/life-lab/narration-cache-key";
import {
  buildNarrationPlaybackChunks,
  type NarrationPlaybackChunk,
} from "@/lib/life-lab/narration-chunks";
import {
  getDefaultOpenAiNarrationModel,
  getDefaultOpenAiNarrationVoice,
  synthesizeSpeech,
} from "@/lib/ai/synthesize-speech";
import {
  NARRATION_INSTRUCTION_VERSION,
  LIFE_LAB_READ_ALOUD_PROVIDERS,
} from "@/lib/life-lab/narration-config";
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
};

export type NarrationChunkResult = {
  chunkIndex: number;
  chunkCount: number;
  sectionLabel: string;
  cacheKey: string;
  cached: boolean;
  audio: Buffer;
  contentHash: string;
  model: string;
  voice: string;
};

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

export async function getOrCreateNarrationChunk(
  input: NarrationChunkRequest,
): Promise<NarrationChunkResult> {
  const chunks = buildNoteNarrationChunks(
    input.note,
    input.includeFlashcards ?? true,
  );
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

  if (!input.regenerate) {
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
          audio,
          contentHash,
          model,
          voice,
        };
      }
    }
  }

  const synthesized = await synthesizeSpeech({
    text: chunk.text,
    userId: input.userId,
    model,
    voice,
  });

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

  return {
    chunkIndex: chunk.index,
    chunkCount: chunks.length,
    sectionLabel: chunk.sectionLabel,
    cacheKey,
    cached: false,
    audio: synthesized.audio,
    contentHash,
    model,
    voice,
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

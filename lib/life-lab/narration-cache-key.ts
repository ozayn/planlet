import { createHash } from "node:crypto";

import { NARRATION_INSTRUCTION_VERSION } from "@/lib/life-lab/narration-config";

export type NarrationCacheKeyInput = {
  driveFileId: string;
  noteModifiedTime: string | null;
  contentHash: string;
  provider: string;
  model: string;
  voice: string;
  narrationStyle: string;
  instructionsFingerprint: string;
  instructionVersion?: number;
  chunkIndex: number;
};

export function hashNarrationContent(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

export function buildNarrationCacheKey(input: NarrationCacheKeyInput): string {
  const payload = [
    input.driveFileId,
    input.noteModifiedTime ?? "",
    input.contentHash,
    input.provider,
    input.model,
    input.voice,
    input.narrationStyle,
    input.instructionsFingerprint,
    String(input.instructionVersion ?? NARRATION_INSTRUCTION_VERSION),
    String(input.chunkIndex),
  ].join("|");

  return createHash("sha256").update(payload).digest("hex");
}

export function buildNarrationStorageKey(cacheKey: string): string {
  return `${cacheKey}.mp3`;
}

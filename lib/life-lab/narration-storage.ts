import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import { getNarrationStorageDir } from "@/lib/life-lab/narration-storage-dir";
import { buildNarrationStorageKey } from "@/lib/life-lab/narration-cache-key";
import { prisma } from "@/lib/prisma";

export type NarrationCacheRecordInput = {
  cacheKey: string;
  driveFileId: string;
  noteModifiedTime: string | null;
  contentHash: string;
  model: string;
  voice: string;
  instructionVersion: number;
  chunkIndex: number;
  sectionLabel: string | null;
  audio: Buffer;
  durationSeconds?: number | null;
};

export async function ensureNarrationStorageDir(): Promise<string> {
  const dir = getNarrationStorageDir();
  await mkdir(dir, { recursive: true });
  return dir;
}

export async function readNarrationAudioFile(
  storageKey: string,
): Promise<Buffer | null> {
  try {
    const filePath = join(getNarrationStorageDir(), storageKey);
    return await readFile(filePath);
  } catch {
    return null;
  }
}

export async function writeNarrationAudioFile(
  storageKey: string,
  audio: Buffer,
): Promise<void> {
  const filePath = join(getNarrationStorageDir(), storageKey);
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, audio);
}

export async function findNarrationCacheByKey(cacheKey: string) {
  return prisma.lifeLabNarrationCache.findUnique({
    where: { cacheKey },
  });
}

export async function touchNarrationCache(cacheKey: string): Promise<void> {
  await prisma.lifeLabNarrationCache.update({
    where: { cacheKey },
    data: { lastAccessedAt: new Date() },
  });
}

export async function saveNarrationCacheRecord(
  input: NarrationCacheRecordInput,
): Promise<void> {
  const storageKey = buildNarrationStorageKey(input.cacheKey);
  await writeNarrationAudioFile(storageKey, input.audio);

  await prisma.lifeLabNarrationCache.upsert({
    where: { cacheKey: input.cacheKey },
    create: {
      cacheKey: input.cacheKey,
      driveFileId: input.driveFileId,
      noteModifiedTime: input.noteModifiedTime,
      contentHash: input.contentHash,
      model: input.model,
      voice: input.voice,
      instructionVersion: input.instructionVersion,
      chunkIndex: input.chunkIndex,
      sectionLabel: input.sectionLabel,
      storageKey,
      durationSeconds: input.durationSeconds ?? null,
      byteSize: input.audio.byteLength,
    },
    update: {
      noteModifiedTime: input.noteModifiedTime,
      contentHash: input.contentHash,
      sectionLabel: input.sectionLabel,
      storageKey,
      durationSeconds: input.durationSeconds ?? null,
      byteSize: input.audio.byteLength,
      lastAccessedAt: new Date(),
    },
  });
}

export async function invalidateNarrationCacheForNote(input: {
  driveFileId: string;
  model: string;
  voice: string;
  instructionVersion?: number;
}): Promise<number> {
  const records = await prisma.lifeLabNarrationCache.findMany({
    where: {
      driveFileId: input.driveFileId,
      model: input.model,
      voice: input.voice,
      instructionVersion:
        input.instructionVersion ?? undefined,
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
      model: input.model,
      voice: input.voice,
      instructionVersion:
        input.instructionVersion ?? undefined,
    },
  });

  return result.count;
}

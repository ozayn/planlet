import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import {
  buildCoachingNarrationStorageKey,
} from "@/lib/coaching/narration-cache-key";
import { getNarrationStorageDir } from "@/lib/life-lab/narration-storage-dir";
import { prisma } from "@/lib/prisma";

export type CoachingNarrationCacheRecordInput = {
  userId: string;
  cacheKey: string;
  contentHash: string;
  contentProfileVersion: number;
  model: string;
  voice: string;
  narrationStyle: string;
  instructionsFingerprint: string;
  instructionVersion: number;
  readAloudSectionId: string;
  chunkIndex: number;
  sectionLabel: string | null;
  audio: Buffer;
  durationSeconds?: number | null;
};

export async function readCoachingNarrationAudioFile(
  storageKey: string,
): Promise<Buffer | null> {
  try {
    const filePath = join(getNarrationStorageDir(), storageKey);
    return await readFile(filePath);
  } catch {
    return null;
  }
}

export async function writeCoachingNarrationAudioFile(
  storageKey: string,
  audio: Buffer,
): Promise<void> {
  const filePath = join(getNarrationStorageDir(), storageKey);
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, audio);
}

export async function findCoachingNarrationCacheByKey(input: {
  userId: string;
  cacheKey: string;
}) {
  return prisma.coachingNarrationCache.findFirst({
    where: {
      cacheKey: input.cacheKey,
      userId: input.userId,
    },
  });
}

export async function touchCoachingNarrationCache(input: {
  userId: string;
  cacheKey: string;
}): Promise<void> {
  await prisma.coachingNarrationCache.updateMany({
    where: {
      cacheKey: input.cacheKey,
      userId: input.userId,
    },
    data: { lastAccessedAt: new Date() },
  });
}

export async function saveCoachingNarrationCacheRecord(
  input: CoachingNarrationCacheRecordInput,
): Promise<void> {
  const storageKey = buildCoachingNarrationStorageKey(input.cacheKey);
  await writeCoachingNarrationAudioFile(storageKey, input.audio);

  await prisma.coachingNarrationCache.upsert({
    where: { cacheKey: input.cacheKey },
    create: {
      userId: input.userId,
      cacheKey: input.cacheKey,
      contentHash: input.contentHash,
      contentProfileVersion: input.contentProfileVersion,
      model: input.model,
      voice: input.voice,
      narrationStyle: input.narrationStyle,
      instructionsFingerprint: input.instructionsFingerprint,
      instructionVersion: input.instructionVersion,
      readAloudSectionId: input.readAloudSectionId,
      chunkIndex: input.chunkIndex,
      sectionLabel: input.sectionLabel,
      storageKey,
      durationSeconds: input.durationSeconds ?? null,
      byteSize: input.audio.byteLength,
    },
    update: {
      contentHash: input.contentHash,
      model: input.model,
      voice: input.voice,
      narrationStyle: input.narrationStyle,
      instructionsFingerprint: input.instructionsFingerprint,
      instructionVersion: input.instructionVersion,
      contentProfileVersion: input.contentProfileVersion,
      sectionLabel: input.sectionLabel,
      storageKey,
      durationSeconds: input.durationSeconds ?? null,
      byteSize: input.audio.byteLength,
      lastAccessedAt: new Date(),
    },
  });
}

export async function invalidateCoachingNarrationCacheForUser(input: {
  userId: string;
  contentHash?: string;
}): Promise<number> {
  const records = await prisma.coachingNarrationCache.findMany({
    where: {
      userId: input.userId,
      ...(input.contentHash ? { contentHash: input.contentHash } : {}),
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

  const result = await prisma.coachingNarrationCache.deleteMany({
    where: {
      userId: input.userId,
      ...(input.contentHash ? { contentHash: input.contentHash } : {}),
    },
  });

  return result.count;
}

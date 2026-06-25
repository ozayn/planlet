import type {
  BodyEntry,
  BodySide,
  BodySymptomType,
} from "@/app/generated/prisma/client";
import { APP_TIMEZONE } from "@/config/time";
import {
  BODY_SYMPTOM_TYPES,
  type BodyJourneyPageData,
  type BodyJourneyPatterns,
  type BodyJourneyPeriod,
  type SerializedBodyEntry,
} from "@/lib/body-journey/constants";
import {
  formatDateString,
  getMonthRange,
  getTodayRange,
  getWeekRange,
} from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { canUseBodyJourneyFeatures, type UserAccess } from "@/lib/roles";

export type {
  BodyJourneyPageData,
  BodyJourneyPatterns,
  BodyJourneyPeriod,
  BodySymptomMeta,
  SerializedBodyEntry,
} from "@/lib/body-journey/constants";

export {
  BODY_SYMPTOM_META,
  BODY_SYMPTOM_TYPES,
  formatBodyEntryTags,
  parseBodyEntryTags,
} from "@/lib/body-journey/constants";

export class BodyJourneyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BodyJourneyError";
  }
}

function formatEntryDateLabel(date: Date): string {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: APP_TIMEZONE,
  }).format(date);
}

function serializeBodyEntry(entry: BodyEntry): SerializedBodyEntry {
  return {
    id: entry.id,
    entryDate: entry.entryDate.toISOString(),
    entryDateLabel: formatEntryDateLabel(entry.entryDate),
    bodySide: entry.bodySide,
    markerX: entry.markerX,
    markerY: entry.markerY,
    symptomType: entry.symptomType,
    intensity: entry.intensity,
    notes: entry.notes,
    tags: entry.tags,
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
  };
}

function getPeriodRange(period: BodyJourneyPeriod, now = new Date()) {
  switch (period) {
    case "week":
      return getWeekRange(now);
    case "month":
      return getMonthRange(now);
    default:
      return getTodayRange(now);
  }
}

function clampMarkerCoordinate(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function clampIntensity(value: number): number {
  return Math.min(10, Math.max(0, Math.round(value)));
}

function computePatterns(entries: BodyEntry[]): BodyJourneyPatterns {
  const monthRange = getMonthRange(new Date());
  const monthEntries = entries.filter(
    (entry) =>
      entry.entryDate >= monthRange.start && entry.entryDate <= monthRange.end,
  );

  const symptomCounts = BODY_SYMPTOM_TYPES.map((type) => ({
    type,
    count: entries.filter((entry) => entry.symptomType === type).length,
  })).filter((item) => item.count > 0);

  const mostCommon = symptomCounts.sort((a, b) => b.count - a.count)[0] ?? null;

  const averageIntensity =
    entries.length > 0
      ? Math.round(
          (entries.reduce((sum, entry) => sum + entry.intensity, 0) /
            entries.length) *
            10,
        ) / 10
      : null;

  const trackedDays = new Set(
    monthEntries.map((entry) => formatDateString(entry.entryDate)),
  );

  return {
    mostCommonSymptom: mostCommon?.type ?? null,
    averageIntensity,
    daysTrackedThisMonth: trackedDays.size,
    symptomCounts,
  };
}

export function requireBodyJourneyUser(access: UserAccess): void {
  if (!canUseBodyJourneyFeatures(access)) {
    throw new BodyJourneyError("Not authorized.");
  }
}

export async function getBodyJourneyPageData(
  userId: string,
  period: BodyJourneyPeriod,
  side: BodySide,
): Promise<BodyJourneyPageData> {
  const range = getPeriodRange(period);

  const [mapEntries, recentEntries, patternEntries] = await Promise.all([
    prisma.bodyEntry.findMany({
      where: {
        userId,
        bodySide: side,
        entryDate: {
          gte: range.start,
          lte: range.end,
        },
      },
      orderBy: [{ entryDate: "desc" }, { createdAt: "desc" }],
    }),
    prisma.bodyEntry.findMany({
      where: { userId },
      orderBy: [{ entryDate: "desc" }, { createdAt: "desc" }],
      take: 20,
    }),
    prisma.bodyEntry.findMany({
      where: {
        userId,
        entryDate: {
          gte: getMonthRange(new Date()).start,
          lte: getMonthRange(new Date()).end,
        },
      },
    }),
  ]);

  return {
    period,
    side,
    mapEntries: mapEntries.map(serializeBodyEntry),
    recentEntries: recentEntries.map(serializeBodyEntry),
    patterns: computePatterns(patternEntries),
  };
}

export async function getBodyEntryForUser(
  userId: string,
  entryId: string,
): Promise<BodyEntry | null> {
  return prisma.bodyEntry.findFirst({
    where: { id: entryId, userId },
  });
}

export type BodyEntryInput = {
  entryDate?: Date;
  bodySide: BodySide;
  markerX: number;
  markerY: number;
  symptomType: BodySymptomType;
  intensity: number;
  notes?: string | null;
  tags?: string[];
};

export async function createBodyEntry(
  userId: string,
  input: BodyEntryInput,
): Promise<SerializedBodyEntry> {
  const entry = await prisma.bodyEntry.create({
    data: {
      userId,
      entryDate: input.entryDate ?? getTodayRange().start,
      bodySide: input.bodySide,
      markerX: clampMarkerCoordinate(input.markerX),
      markerY: clampMarkerCoordinate(input.markerY),
      symptomType: input.symptomType,
      intensity: clampIntensity(input.intensity),
      notes: input.notes?.trim() || null,
      tags: input.tags ?? [],
    },
  });

  return serializeBodyEntry(entry);
}

export async function updateBodyEntry(
  userId: string,
  entryId: string,
  input: BodyEntryInput,
): Promise<SerializedBodyEntry> {
  const existing = await getBodyEntryForUser(userId, entryId);

  if (!existing) {
    throw new BodyJourneyError("Observation not found.");
  }

  const entry = await prisma.bodyEntry.update({
    where: { id: entryId },
    data: {
      entryDate: input.entryDate ?? existing.entryDate,
      bodySide: input.bodySide,
      markerX: clampMarkerCoordinate(input.markerX),
      markerY: clampMarkerCoordinate(input.markerY),
      symptomType: input.symptomType,
      intensity: clampIntensity(input.intensity),
      notes: input.notes?.trim() || null,
      tags: input.tags ?? [],
    },
  });

  return serializeBodyEntry(entry);
}

export async function deleteBodyEntry(
  userId: string,
  entryId: string,
): Promise<void> {
  const existing = await getBodyEntryForUser(userId, entryId);

  if (!existing) {
    throw new BodyJourneyError("Observation not found.");
  }

  await prisma.bodyEntry.delete({
    where: { id: entryId },
  });
}

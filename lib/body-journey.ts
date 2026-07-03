import type {
  BodyEntry,
  BodySide,
  BodySymptomType,
} from "@/app/generated/prisma/client";
import { APP_TIMEZONE } from "@/config/time";
import type { BodyJourneyPeriodValue } from "@/lib/body-journey-period";
import {
  BODY_SYMPTOM_TYPES,
  isSkinSymptomType,
  type BodySideValue,
  type BodySkinChangeStatusValue,
  type BodySymptomTypeValue,
} from "@/lib/body-journey-types";
import {
  type BodyJourneyPageData,
  type BodyJourneyPatterns,
  type SerializedBodyEntry,
} from "@/lib/body-journey/constants";
import {
  formatDateString,
  getMonthRange,
  getTodayDateString,
  getTodayRange,
  getWeekRange,
} from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { canUseBodyJourneyFeatures, type UserAccess } from "@/lib/roles";
import { getUserTimezone } from "@/lib/user-timezone";

export type {
  BodyJourneyPageData,
  BodyJourneyPatterns,
  SerializedBodyEntry,
} from "@/lib/body-journey/constants";

export type { BodyJourneyPeriodValue } from "@/lib/body-journey-period";

export type {
  BodySideValue,
  BodySkinChangeStatusValue,
  BodySymptomMeta,
  BodySymptomTypeValue,
} from "@/lib/body-journey-types";

export {
  formatBodyEntryTags,
  formatBodySkinDetails,
  parseBodyEntryTags,
} from "@/lib/body-journey/constants";

export {
  BODY_JOURNEY_PERIOD_LABELS,
  BODY_JOURNEY_PERIODS,
  isBodyJourneyPeriod,
  parseBodyJourneyPeriod,
} from "@/lib/body-journey-period";

export {
  BODY_SIDE_LABELS,
  BODY_SIDES,
  BODY_SKIN_CHANGE_LABELS,
  BODY_SKIN_CHANGE_STATUSES,
  BODY_SKIN_SYMPTOM_TYPES,
  BODY_SYMPTOM_GROUPS,
  BODY_SYMPTOM_META,
  BODY_SYMPTOM_TYPES,
  BODY_SENSATION_SYMPTOM_TYPES,
  isBodySide,
  isBodySkinChangeStatus,
  isBodySymptomType,
  isSkinSymptomType,
  parseBodySide,
} from "@/lib/body-journey-types";

export class BodyJourneyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BodyJourneyError";
  }
}

function formatObservedAtLabel(date: Date): string {
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
    observedAt: entry.observedAt.toISOString(),
    observedAtLabel: formatObservedAtLabel(entry.observedAt),
    bodySide: entry.bodySide as BodySideValue,
    markerX: entry.markerX,
    markerY: entry.markerY,
    symptomType: entry.symptomType as BodySymptomTypeValue,
    intensity: entry.intensity,
    notes: entry.notes,
    tags: entry.tags,
    skinSize: entry.skinSize,
    skinShape: entry.skinShape,
    skinColor: entry.skinColor,
    skinChanged: entry.skinChanged as BodySkinChangeStatusValue | null,
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
  };
}

function getPeriodRange(period: BodyJourneyPeriodValue, now = new Date()) {
  switch (period) {
    case "WEEK":
      return getWeekRange(now);
    case "MONTH":
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
      entry.observedAt >= monthRange.start && entry.observedAt <= monthRange.end,
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
    monthEntries.map((entry) => formatDateString(entry.observedAt)),
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
  period: BodyJourneyPeriodValue,
  side: BodySideValue,
): Promise<BodyJourneyPageData> {
  const timezone = await getUserTimezone(userId);
  const range = getPeriodRange(period);

  const [mapEntries, recentEntries, patternEntries] = await Promise.all([
    prisma.bodyEntry.findMany({
      where: {
        userId,
        bodySide: side as BodySide,
        observedAt: {
          gte: range.start,
          lte: range.end,
        },
      },
      orderBy: [{ observedAt: "desc" }, { createdAt: "desc" }],
    }),
    prisma.bodyEntry.findMany({
      where: { userId },
      orderBy: [{ observedAt: "desc" }, { createdAt: "desc" }],
      take: 20,
    }),
    prisma.bodyEntry.findMany({
      where: {
        userId,
        observedAt: {
          gte: getMonthRange(new Date()).start,
          lte: getMonthRange(new Date()).end,
        },
      },
    }),
  ]);

  return {
    period,
    side,
    defaultObservedDate: getTodayDateString(timezone),
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
  observedAt: Date;
  bodySide: BodySideValue;
  markerX: number;
  markerY: number;
  symptomType: BodySymptomTypeValue;
  intensity: number;
  notes?: string | null;
  tags?: string[];
  skinSize?: string | null;
  skinShape?: string | null;
  skinColor?: string | null;
  skinChanged?: BodySkinChangeStatusValue | null;
};

function normalizeSkinDetails(input: BodyEntryInput) {
  if (!isSkinSymptomType(input.symptomType)) {
    return {
      skinSize: null,
      skinShape: null,
      skinColor: null,
      skinChanged: null,
    };
  }

  return {
    skinSize: input.skinSize?.trim() || null,
    skinShape: input.skinShape?.trim() || null,
    skinColor: input.skinColor?.trim() || null,
    skinChanged: input.skinChanged ?? null,
  };
}

export async function createBodyEntry(
  userId: string,
  input: BodyEntryInput,
): Promise<SerializedBodyEntry> {
  const skinDetails = normalizeSkinDetails(input);

  const entry = await prisma.bodyEntry.create({
    data: {
      userId,
      observedAt: input.observedAt,
      bodySide: input.bodySide as BodySide,
      markerX: clampMarkerCoordinate(input.markerX),
      markerY: clampMarkerCoordinate(input.markerY),
      symptomType: input.symptomType as BodySymptomType,
      intensity: clampIntensity(input.intensity),
      notes: input.notes?.trim() || null,
      tags: input.tags ?? [],
      ...skinDetails,
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

  const skinDetails = normalizeSkinDetails(input);

  const entry = await prisma.bodyEntry.update({
    where: { id: entryId },
    data: {
      observedAt: input.observedAt,
      bodySide: input.bodySide as BodySide,
      markerX: clampMarkerCoordinate(input.markerX),
      markerY: clampMarkerCoordinate(input.markerY),
      symptomType: input.symptomType as BodySymptomType,
      intensity: clampIntensity(input.intensity),
      notes: input.notes?.trim() || null,
      tags: input.tags ?? [],
      ...skinDetails,
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

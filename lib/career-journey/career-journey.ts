import type {
  CareerPracticeMode,
  CareerPracticeStatus,
  CareerPracticeType,
} from "@/app/generated/prisma/client";

import {
  DEFAULT_CAREER_PILLARS,
  DEFAULT_CAREER_TARGET_ROLES,
  PRACTICE_TYPE_TO_PILLAR,
} from "@/lib/career-journey/constants";
import { formatDateString, getWeekRange, isValidDateString } from "@/lib/dates";
import { canUseCareerJourneyFeatures, type UserAccess } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

export class CareerJourneyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CareerJourneyError";
  }
}

export type SerializedCareerProfile = {
  targetRoles: string[];
  currentFocus: string | null;
};

export type SerializedCareerPillar = {
  id: string;
  name: string;
  weeklyTarget: number;
  isActive: boolean;
  sortOrder: number;
  doneThisWeek: number;
};

export type SerializedCareerSession = {
  id: string;
  type: CareerPracticeType;
  mode: CareerPracticeMode;
  title: string;
  status: CareerPracticeStatus;
  date: string;
  notes: string | null;
};

export type CareerJourneyPageData = {
  profile: SerializedCareerProfile;
  pillars: SerializedCareerPillar[];
  todaySessions: SerializedCareerSession[];
  weekSessions: SerializedCareerSession[];
  todayDate: string;
};

function parseTargetRoles(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [...DEFAULT_CAREER_TARGET_ROLES];
  }

  return value
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function serializeSession(session: {
  id: string;
  type: CareerPracticeType;
  mode: CareerPracticeMode;
  title: string;
  status: CareerPracticeStatus;
  date: string;
  notes: string | null;
}): SerializedCareerSession {
  return {
    id: session.id,
    type: session.type,
    mode: session.mode,
    title: session.title,
    status: session.status,
    date: session.date,
    notes: session.notes,
  };
}

export async function requireCareerJourneyUser(
  userId: string,
  access: UserAccess,
): Promise<void> {
  if (!canUseCareerJourneyFeatures(access)) {
    throw new CareerJourneyError("Not authorized.");
  }
}

export async function ensureCareerJourneySetup(userId: string): Promise<void> {
  const existingPillars = await prisma.careerPillar.count({ where: { userId } });

  if (existingPillars === 0) {
    await prisma.careerPillar.createMany({
      data: DEFAULT_CAREER_PILLARS.map((pillar) => ({
        userId,
        name: pillar.name,
        weeklyTarget: pillar.weeklyTarget,
        sortOrder: pillar.sortOrder,
        isActive: true,
      })),
    });
  }

  await prisma.careerProfile.upsert({
    where: { userId },
    create: {
      userId,
      targetRoles: [...DEFAULT_CAREER_TARGET_ROLES],
    },
    update: {},
  });
}

function countDoneSessionsByPillar(
  sessions: Array<{ type: CareerPracticeType; status: CareerPracticeStatus }>,
  pillarName: string,
): number {
  return sessions.filter(
    (session) =>
      session.status === "DONE" &&
      PRACTICE_TYPE_TO_PILLAR[session.type] === pillarName,
  ).length;
}

export async function getCareerJourneyPageData(
  userId: string,
): Promise<CareerJourneyPageData> {
  await ensureCareerJourneySetup(userId);

  const now = new Date();
  const todayDate = formatDateString(now);
  const weekRange = getWeekRange(now);
  const weekStart = formatDateString(weekRange.start);
  const weekEnd = formatDateString(weekRange.end);

  const [profile, pillars, weekSessions] = await Promise.all([
    prisma.careerProfile.findUnique({ where: { userId } }),
    prisma.careerPillar.findMany({
      where: { userId },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.careerPracticeSession.findMany({
      where: {
        userId,
        date: { gte: weekStart, lte: weekEnd },
      },
      orderBy: [{ date: "desc" }, { updatedAt: "desc" }],
    }),
  ]);

  const doneWeekSessions = weekSessions.filter(
    (session) => session.status === "DONE",
  );

  return {
    profile: {
      targetRoles: parseTargetRoles(profile?.targetRoles),
      currentFocus: profile?.currentFocus?.trim() || null,
    },
    pillars: pillars.map((pillar) => ({
      id: pillar.id,
      name: pillar.name,
      weeklyTarget: pillar.weeklyTarget,
      isActive: pillar.isActive,
      sortOrder: pillar.sortOrder,
      doneThisWeek: pillar.isActive
        ? countDoneSessionsByPillar(doneWeekSessions, pillar.name)
        : 0,
    })),
    todaySessions: weekSessions
      .filter((session) => session.date === todayDate)
      .map(serializeSession),
    weekSessions: weekSessions.map(serializeSession),
    todayDate,
  };
}

export async function updateCareerTargetRoles(
  userId: string,
  targetRoles: string[],
): Promise<SerializedCareerProfile> {
  const cleaned = targetRoles.map((role) => role.trim()).filter(Boolean);

  if (cleaned.length === 0) {
    throw new CareerJourneyError("Add at least one target role.");
  }

  await ensureCareerJourneySetup(userId);

  const profile = await prisma.careerProfile.update({
    where: { userId },
    data: { targetRoles: cleaned },
  });

  return {
    targetRoles: parseTargetRoles(profile.targetRoles),
    currentFocus: profile.currentFocus?.trim() || null,
  };
}

export async function updateCareerCurrentFocus(
  userId: string,
  currentFocus: string | null,
): Promise<SerializedCareerProfile> {
  await ensureCareerJourneySetup(userId);

  const profile = await prisma.careerProfile.update({
    where: { userId },
    data: { currentFocus: currentFocus?.trim() || null },
  });

  return {
    targetRoles: parseTargetRoles(profile.targetRoles),
    currentFocus: profile.currentFocus?.trim() || null,
  };
}

export async function updateCareerPillarTarget(
  userId: string,
  pillarId: string,
  weeklyTarget: number,
): Promise<SerializedCareerPillar> {
  if (!Number.isFinite(weeklyTarget) || weeklyTarget < 0 || weeklyTarget > 50) {
    throw new CareerJourneyError("Weekly target must be between 0 and 50.");
  }

  const pillar = await prisma.careerPillar.findFirst({
    where: { id: pillarId, userId },
  });

  if (!pillar) {
    throw new CareerJourneyError("Pillar not found.");
  }

  const updated = await prisma.careerPillar.update({
    where: { id: pillarId },
    data: { weeklyTarget: Math.round(weeklyTarget) },
  });

  const pageData = await getCareerJourneyPageData(userId);
  const progress = pageData.pillars.find((entry) => entry.id === pillarId);

  return (
    progress ?? {
      id: updated.id,
      name: updated.name,
      weeklyTarget: updated.weeklyTarget,
      isActive: updated.isActive,
      sortOrder: updated.sortOrder,
      doneThisWeek: 0,
    }
  );
}

export type CreateCareerSessionInput = {
  type: CareerPracticeType;
  mode: CareerPracticeMode;
  title: string;
  date?: string;
  notes?: string | null;
  status?: CareerPracticeStatus;
};

export async function createCareerPracticeSession(
  userId: string,
  input: CreateCareerSessionInput,
): Promise<SerializedCareerSession> {
  const title = input.title.trim();
  if (!title) {
    throw new CareerJourneyError("Session title is required.");
  }

  const date = input.date?.trim() || formatDateString(new Date());
  if (!isValidDateString(date)) {
    throw new CareerJourneyError("Invalid session date.");
  }

  const session = await prisma.careerPracticeSession.create({
    data: {
      userId,
      type: input.type,
      mode: input.mode,
      title,
      date,
      notes: input.notes?.trim() || null,
      status: input.status ?? "PLANNED",
    },
  });

  return serializeSession(session);
}

export async function updateCareerPracticeSessionStatus(
  userId: string,
  sessionId: string,
  status: CareerPracticeStatus,
): Promise<SerializedCareerSession> {
  const existing = await prisma.careerPracticeSession.findFirst({
    where: { id: sessionId, userId },
  });

  if (!existing) {
    throw new CareerJourneyError("Session not found.");
  }

  const session = await prisma.careerPracticeSession.update({
    where: { id: sessionId },
    data: { status },
  });

  return serializeSession(session);
}

export type CreateCareerCheckInInput = {
  date?: string;
  pillarId?: string | null;
  energyBefore?: number | null;
  energyAfter?: number | null;
  difficulty?: number | null;
  note?: string | null;
};

export async function createCareerCheckIn(
  userId: string,
  input: CreateCareerCheckInInput,
): Promise<void> {
  const date = input.date?.trim() || formatDateString(new Date());
  if (!isValidDateString(date)) {
    throw new CareerJourneyError("Invalid check-in date.");
  }

  if (input.pillarId) {
    const pillar = await prisma.careerPillar.findFirst({
      where: { id: input.pillarId, userId },
    });

    if (!pillar) {
      throw new CareerJourneyError("Pillar not found.");
    }
  }

  function clampRating(value: number | null | undefined): number | null {
    if (value == null || Number.isNaN(value)) {
      return null;
    }

    return Math.min(5, Math.max(1, Math.round(value)));
  }

  await prisma.careerCheckIn.create({
    data: {
      userId,
      date,
      pillarId: input.pillarId ?? null,
      energyBefore: clampRating(input.energyBefore),
      energyAfter: clampRating(input.energyAfter),
      difficulty: clampRating(input.difficulty),
      note: input.note?.trim() || null,
    },
  });
}

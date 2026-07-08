import type {
  ActivityTimerPreset,
  ActivityTimerSession,
} from "@/app/generated/prisma/client";
import { getTodayRange, getWeekRange } from "@/lib/dates";
import {
  DEFAULT_ACTIVITY_TIMER_PRESETS,
  MAX_ACTIVITY_CATEGORY_LENGTH,
  MAX_ACTIVITY_NOTES_LENGTH,
  MAX_ACTIVITY_TITLE_LENGTH,
  RECENT_ACTIVITY_SESSION_LIMIT,
  type ActivityTimerInsights,
  type ActivityTimerPageData,
  type ActivityTimerTimelineEntry,
  type CreateActivityTimerPresetInput,
  type SerializedActiveActivityTimerSession,
  type SerializedActivityTimerPreset,
  type SerializedActivityTimerSession,
  type StartActivityTimerInput,
  type StopActivityTimerInput,
  type UpdateActivityTimerSessionInput,
} from "@/lib/activity-timer/constants";
import {
  formatActivityDuration,
  formatActivityDurationShort,
  formatActivityTotalMinutes,
  formatSessionClockTime,
  formatSessionTimeRange,
  truncateActivityNotesPreview,
} from "@/lib/activity-timer/format";
import { prisma } from "@/lib/prisma";
import { getUserTimezone } from "@/lib/user-timezone";

export type {
  ActivityTimerInsights,
  ActivityTimerPageData,
  CreateActivityTimerPresetInput,
  SerializedActiveActivityTimerSession,
  SerializedActivityTimerPreset,
  SerializedActivityTimerSession,
  StartActivityTimerInput,
  StopActivityTimerInput,
  UpdateActivityTimerSessionInput,
} from "@/lib/activity-timer/constants";

export {
  elapsedSecondsFromStartedAt,
  formatActivityClock,
  formatActivityDuration,
} from "@/lib/activity-timer/format";

export class ActivityTimerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ActivityTimerError";
  }
}

function normalizeTitle(value: string): string {
  const trimmed = value.trim();

  if (!trimmed) {
    throw new ActivityTimerError("Add an activity title.");
  }

  if (trimmed.length > MAX_ACTIVITY_TITLE_LENGTH) {
    throw new ActivityTimerError(
      `Activity title must be ${MAX_ACTIVITY_TITLE_LENGTH} characters or fewer.`,
    );
  }

  return trimmed;
}

function normalizeOptionalNotes(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";

  if (!trimmed) {
    return null;
  }

  if (trimmed.length > MAX_ACTIVITY_NOTES_LENGTH) {
    throw new ActivityTimerError(
      `Notes must be ${MAX_ACTIVITY_NOTES_LENGTH} characters or fewer.`,
    );
  }

  return trimmed;
}

function normalizeOptionalCategory(
  value: string | null | undefined,
): string | null {
  const trimmed = value?.trim() ?? "";

  if (!trimmed) {
    return null;
  }

  if (trimmed.length > MAX_ACTIVITY_CATEGORY_LENGTH) {
    throw new ActivityTimerError(
      `Category must be ${MAX_ACTIVITY_CATEGORY_LENGTH} characters or fewer.`,
    );
  }

  return trimmed;
}

function formatSessionDayLabel(
  date: Date,
  timezone: string,
  now = new Date(),
): string {
  const todayRange = getTodayRange(now);

  if (date >= todayRange.start && date <= todayRange.end) {
    return "Today";
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayRange = getTodayRange(yesterday);

  if (date >= yesterdayRange.start && date <= yesterdayRange.end) {
    return "Yesterday";
  }

  return new Intl.DateTimeFormat("en", {
    timeZone: timezone,
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatSessionTimeLabel(
  date: Date,
  timezone: string,
  now = new Date(),
): string {
  const todayRange = getTodayRange(now);
  const formatter = new Intl.DateTimeFormat("en", {
    timeZone: timezone,
    hour: "numeric",
    minute: "2-digit",
  });
  const time = formatter.format(date);

  if (date >= todayRange.start && date <= todayRange.end) {
    return `Today ${time}`;
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayRange = getTodayRange(yesterday);

  if (date >= yesterdayRange.start && date <= yesterdayRange.end) {
    return `Yesterday ${time}`;
  }

  const dateFormatter = new Intl.DateTimeFormat("en", {
    timeZone: timezone,
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return dateFormatter.format(date);
}

function serializePreset(preset: ActivityTimerPreset): SerializedActivityTimerPreset {
  return {
    id: preset.id,
    title: preset.title,
    category: preset.category,
    sortOrder: preset.sortOrder,
  };
}

function serializeSession(
  session: ActivityTimerSession,
  timezone: string,
  now = new Date(),
): SerializedActivityTimerSession {
  const stoppedAt = session.stoppedAt;
  const durationSeconds =
    session.durationSeconds ??
    (stoppedAt
      ? Math.max(
          0,
          Math.floor((stoppedAt.getTime() - session.startedAt.getTime()) / 1000),
        )
      : null);

  const displayDate = stoppedAt ?? session.startedAt;

  return {
    id: session.id,
    presetId: session.presetId,
    title: session.title,
    category: session.category,
    notes: session.notes,
    startedAt: session.startedAt.toISOString(),
    stoppedAt: stoppedAt?.toISOString() ?? null,
    durationSeconds,
    timeLabel: formatSessionTimeLabel(displayDate, timezone, now),
    durationLabel: formatActivityDuration(durationSeconds ?? 0),
    dayGroupLabel: formatSessionDayLabel(displayDate, timezone, now),
    clockTimeLabel: formatSessionClockTime(displayDate, timezone),
    durationShortLabel: formatActivityDurationShort(durationSeconds ?? 0),
    notesPreview: truncateActivityNotesPreview(session.notes),
  };
}

export function serializeActiveActivityTimerSession(
  session: ActivityTimerSession,
): SerializedActiveActivityTimerSession {
  return {
    id: session.id,
    title: session.title,
    presetId: session.presetId,
    category: session.category,
    startedAt: session.startedAt.toISOString(),
    notes: session.notes,
  };
}

function serializeActiveSession(
  session: ActivityTimerSession,
): SerializedActiveActivityTimerSession {
  return serializeActiveActivityTimerSession(session);
}

export function buildActivityTimerTimeline(
  sessions: Array<
    Pick<
      ActivityTimerSession,
      "id" | "title" | "startedAt" | "stoppedAt" | "durationSeconds"
    >
  >,
  timezone: string,
  now = new Date(),
): ActivityTimerTimelineEntry[] {
  const todayRange = getTodayRange(now);

  return sessions
    .filter((session) => {
      if (!session.stoppedAt || session.durationSeconds == null) {
        return false;
      }

      return (
        session.stoppedAt >= todayRange.start &&
        session.stoppedAt <= todayRange.end
      );
    })
    .sort(
      (left, right) =>
        left.startedAt.getTime() - right.startedAt.getTime(),
    )
    .map((session) => ({
      id: session.id,
      title: session.title,
      timeRangeLabel: formatSessionTimeRange(
        session.startedAt,
        session.stoppedAt!,
        timezone,
      ),
    }));
}

export function buildActivityTimerInsights(
  sessions: Array<
    Pick<
      ActivityTimerSession,
      | "id"
      | "title"
      | "durationSeconds"
      | "stoppedAt"
      | "startedAt"
    >
  >,
  timezone: string,
  now = new Date(),
): ActivityTimerInsights {
  const todayRange = getTodayRange(now);
  const weekRange = getWeekRange(now);
  const totalsByTitle = new Map<string, number>();

  let todayTotalSeconds = 0;
  let weekTotalSeconds = 0;

  for (const session of sessions) {
    if (!session.stoppedAt || session.durationSeconds == null) {
      continue;
    }

    const stoppedAt = session.stoppedAt;
    const duration = session.durationSeconds;

    if (stoppedAt >= todayRange.start && stoppedAt <= todayRange.end) {
      todayTotalSeconds += duration;
    }

    if (stoppedAt >= weekRange.start && stoppedAt <= weekRange.end) {
      weekTotalSeconds += duration;
    }

    totalsByTitle.set(
      session.title,
      (totalsByTitle.get(session.title) ?? 0) + duration,
    );
  }

  let mostTimedActivity: string | null = null;
  let mostTimedSeconds = 0;

  for (const [title, total] of totalsByTitle.entries()) {
    if (total > mostTimedSeconds) {
      mostTimedActivity = title;
      mostTimedSeconds = total;
    }
  }

  return {
    todayTotalSeconds,
    weekTotalSeconds,
    mostTimedActivity,
    todayTotalLabel: formatActivityDuration(todayTotalSeconds),
    weekTotalLabel: formatActivityDuration(weekTotalSeconds),
    todayTimeline: buildActivityTimerTimeline(sessions, timezone, now),
    todayTotalMinutesLabel: formatActivityTotalMinutes(todayTotalSeconds),
  };
}

async function ensureDefaultPresets(userId: string): Promise<void> {
  const existingCount = await prisma.activityTimerPreset.count({
    where: { userId, isArchived: false },
  });

  if (existingCount > 0) {
    return;
  }

  await prisma.activityTimerPreset.createMany({
    data: DEFAULT_ACTIVITY_TIMER_PRESETS.map((preset, index) => ({
      userId,
      title: preset.title,
      category: preset.category,
      sortOrder: index,
    })),
  });
}

async function getActiveSession(userId: string) {
  return prisma.activityTimerSession.findFirst({
    where: {
      userId,
      stoppedAt: null,
    },
    orderBy: { startedAt: "desc" },
  });
}

export async function getActiveActivityTimerSession(userId: string) {
  const session = await getActiveSession(userId);

  return session ? serializeActiveSession(session) : null;
}

export async function getActivityTimerPageData(
  userId: string,
): Promise<ActivityTimerPageData> {
  await ensureDefaultPresets(userId);

  const timezone = await getUserTimezone(userId);
  const now = new Date();

  const [presets, activeSession, recentSessions, insightSessions] =
    await Promise.all([
      prisma.activityTimerPreset.findMany({
        where: { userId, isArchived: false },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      }),
      getActiveSession(userId),
      prisma.activityTimerSession.findMany({
        where: {
          userId,
          stoppedAt: { not: null },
        },
        orderBy: { stoppedAt: "desc" },
        take: RECENT_ACTIVITY_SESSION_LIMIT,
      }),
      prisma.activityTimerSession.findMany({
        where: {
          userId,
          stoppedAt: { not: null },
          durationSeconds: { not: null },
        },
        select: {
          id: true,
          title: true,
          durationSeconds: true,
          stoppedAt: true,
          startedAt: true,
        },
        orderBy: { stoppedAt: "desc" },
        take: 200,
      }),
    ]);

  return {
    presets: presets.map(serializePreset),
    activeSession: activeSession
      ? serializeActiveSession(activeSession)
      : null,
    recentSessions: recentSessions.map((session) =>
      serializeSession(session, timezone, now),
    ),
    insights: buildActivityTimerInsights(insightSessions, timezone, now),
  };
}

export async function startActivityTimerSession(
  userId: string,
  input: StartActivityTimerInput,
) {
  const title = normalizeTitle(input.title);
  const notes = normalizeOptionalNotes(input.notes);
  const active = await getActiveSession(userId);

  if (active) {
    throw new ActivityTimerError(
      "Stop the current timer before starting another activity.",
    );
  }

  let preset: ActivityTimerPreset | null = null;

  if (input.presetId) {
    preset = await prisma.activityTimerPreset.findFirst({
      where: {
        id: input.presetId,
        userId,
        isArchived: false,
      },
    });

    if (!preset) {
      throw new ActivityTimerError("Activity preset not found.");
    }
  }

  return prisma.activityTimerSession.create({
    data: {
      userId,
      presetId: preset?.id ?? null,
      title: preset?.title ?? title,
      category: preset?.category ?? null,
      notes,
      startedAt: new Date(),
    },
  });
}

export async function stopActivityTimerSession(
  userId: string,
  input: StopActivityTimerInput,
) {
  const session = await prisma.activityTimerSession.findFirst({
    where: {
      id: input.sessionId,
      userId,
      stoppedAt: null,
    },
  });

  if (!session) {
    throw new ActivityTimerError("Active timer not found.");
  }

  const stoppedAt = new Date();
  const durationSeconds = Math.max(
    0,
    Math.floor((stoppedAt.getTime() - session.startedAt.getTime()) / 1000),
  );
  const notes =
    input.notes !== undefined
      ? normalizeOptionalNotes(input.notes)
      : session.notes;

  return prisma.activityTimerSession.update({
    where: { id: session.id },
    data: {
      stoppedAt,
      durationSeconds,
      notes,
    },
  });
}

export async function updateActivityTimerSession(
  userId: string,
  input: UpdateActivityTimerSessionInput,
) {
  const session = await prisma.activityTimerSession.findFirst({
    where: {
      id: input.sessionId,
      userId,
      stoppedAt: { not: null },
    },
  });

  if (!session) {
    throw new ActivityTimerError("Completed session not found.");
  }

  return prisma.activityTimerSession.update({
    where: { id: session.id },
    data: {
      title:
        input.title !== undefined ? normalizeTitle(input.title) : undefined,
      notes:
        input.notes !== undefined
          ? normalizeOptionalNotes(input.notes)
          : undefined,
      category:
        input.category !== undefined
          ? normalizeOptionalCategory(input.category)
          : undefined,
      durationSeconds:
        input.durationSeconds !== undefined
          ? input.durationSeconds == null
            ? null
            : Math.max(0, Math.floor(input.durationSeconds))
          : undefined,
    },
  });
}

export async function createActivityTimerPreset(
  userId: string,
  input: CreateActivityTimerPresetInput,
) {
  const title = normalizeTitle(input.title);
  const category = normalizeOptionalCategory(input.category);
  const maxSort = await prisma.activityTimerPreset.aggregate({
    where: { userId, isArchived: false },
    _max: { sortOrder: true },
  });

  return prisma.activityTimerPreset.create({
    data: {
      userId,
      title,
      category,
      sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
    },
  });
}

export async function archiveActivityTimerPreset(
  userId: string,
  presetId: string,
) {
  const preset = await prisma.activityTimerPreset.findFirst({
    where: { id: presetId, userId, isArchived: false },
  });

  if (!preset) {
    throw new ActivityTimerError("Activity preset not found.");
  }

  return prisma.activityTimerPreset.update({
    where: { id: preset.id },
    data: { isArchived: true },
  });
}

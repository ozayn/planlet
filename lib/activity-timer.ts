import type {
  ActivityTimerPreset,
  ActivityTimerSession,
  ActivityTimerSessionNote,
} from "@/app/generated/prisma/client";
import { getTodayRange, getWeekRange } from "@/lib/dates";
import {
  DEFAULT_ACTIVITY_TIMER_PRESETS,
  LEGACY_DEFAULT_ACTIVITY_TIMER_PRESET_TITLES,
  MAX_ACTIVITY_CATEGORY_LENGTH,
  MAX_ACTIVITY_NOTES_LENGTH,
  MAX_ACTIVITY_TITLE_LENGTH,
  MAX_TARGET_DURATION_SECONDS,
  MIN_TIMER_SESSION_SECONDS,
  RECENT_ACTIVITY_SESSION_LIMIT,
  type ActivityTimerMode,
  type ActivityTimerInsights,
  type ActivityTimerPageData,
  type ActivityTimerPresetSettingsData,
  type ActivityTimerTimelineEntry,
  type AddActivityTimerSessionNoteInput,
  type CreateActivityTimerPresetInput,
  type SerializedActiveActivityTimerSession,
  type SerializedActivityTimerPreset,
  type SerializedActivityTimerPresetManagement,
  type SerializedActivityTimerSession,
  type SerializedActivityTimerSessionNote,
  type StartActivityTimerInput,
  type StopActivityTimerInput,
  type UpdateActivityTimerPresetInput,
  type UpdateActivityTimerSessionInput,
  type UpdateActivityTimerSessionNoteInput,
} from "@/lib/activity-timer/constants";
import {
  buildSessionNotesPreview,
  computeSessionNoteOffsetSeconds,
  formatSyncedSessionNotes,
  MAX_SESSION_NOTE_LENGTH,
  serializeActivityTimerSessionNote,
} from "@/lib/activity-timer/session-notes";
import { normalizePresetIconName } from "@/lib/activity-timer/preset-icons";
import {
  activeElapsedSecondsFromSession,
  shouldSaveTimerSession,
} from "@/lib/activity-timer/countdown";
import {
  formatActivityDuration,
  formatActivityDurationShort,
  formatActivityTotalMinutes,
  formatSessionClockTime,
  formatSessionTimeRange,
  formatTargetDurationLabel,
  formatCountdownPresetDurationLabel,
  durationSecondsBetween,
  truncateActivityNotesPreview,
} from "@/lib/activity-timer/format";
import { prisma } from "@/lib/prisma";
import { getUserTimezone } from "@/lib/user-timezone";

export type {
  ActivityTimerInsights,
  ActivityTimerPageData,
  ActivityTimerPresetSettingsData,
  AddActivityTimerSessionNoteInput,
  CreateActivityTimerPresetInput,
  SerializedActiveActivityTimerSession,
  SerializedActivityTimerPreset,
  SerializedActivityTimerPresetManagement,
  SerializedActivityTimerSession,
  SerializedActivityTimerSessionNote,
  StartActivityTimerInput,
  StopActivityTimerInput,
  UpdateActivityTimerPresetInput,
  UpdateActivityTimerSessionInput,
  UpdateActivityTimerSessionNoteInput,
} from "@/lib/activity-timer/constants";

export { shouldSaveTimerSession } from "@/lib/activity-timer/countdown";
export { MIN_TIMER_SESSION_SECONDS } from "@/lib/activity-timer/constants";

export {
  durationSecondsBetween,
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

function normalizeOptionalTargetDuration(
  value: number | null | undefined,
): number | null {
  if (value == null) {
    return null;
  }

  const normalized = Math.floor(value);

  if (!Number.isFinite(normalized) || normalized <= 0) {
    return null;
  }

  if (normalized > MAX_TARGET_DURATION_SECONDS) {
    throw new ActivityTimerError(
      `Target duration must be ${MAX_TARGET_DURATION_SECONDS} seconds or fewer.`,
    );
  }

  return normalized;
}

function normalizeTimerMode(
  value: string | null | undefined,
): ActivityTimerMode {
  return value === "countDown" ? "countDown" : "countUp";
}

function resolvePresetDurationLabel(
  timerMode: ActivityTimerMode,
  targetDurationSeconds: number | null,
): string | null {
  if (targetDurationSeconds == null) {
    return null;
  }

  return timerMode === "countDown"
    ? formatCountdownPresetDurationLabel(targetDurationSeconds)
    : formatTargetDurationLabel(targetDurationSeconds);
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
  const timerMode = normalizeTimerMode(preset.timerMode);

  return {
    id: preset.id,
    title: preset.title,
    category: preset.category,
    targetDurationSeconds: preset.targetDurationSeconds,
    targetDurationLabel: resolvePresetDurationLabel(
      timerMode,
      preset.targetDurationSeconds,
    ),
    timerMode,
    iconName: preset.iconName,
    sortOrder: preset.sortOrder,
  };
}

function serializePresetManagement(
  preset: ActivityTimerPreset,
): SerializedActivityTimerPresetManagement {
  return {
    ...serializePreset(preset),
    isArchived: preset.isArchived,
  };
}

function normalizeSessionNoteText(value: string): string {
  const trimmed = value.trim();

  if (!trimmed) {
    throw new ActivityTimerError("Add note text before saving.");
  }

  if (trimmed.length > MAX_SESSION_NOTE_LENGTH) {
    throw new ActivityTimerError(
      `Notes must be ${MAX_SESSION_NOTE_LENGTH} characters or fewer.`,
    );
  }

  return trimmed;
}

async function syncSessionNotesField(
  sessionId: string,
  userId: string,
): Promise<void> {
  const [session, notes, timezone] = await Promise.all([
    prisma.activityTimerSession.findFirst({
      where: { id: sessionId, userId },
    }),
    prisma.activityTimerSessionNote.findMany({
      where: { sessionId, userId },
      orderBy: { recordedAt: "asc" },
    }),
    getUserTimezone(userId),
  ]);

  if (!session) {
    return;
  }

  await prisma.activityTimerSession.update({
    where: { id: session.id },
    data: {
      notes: formatSyncedSessionNotes(notes, timezone),
    },
  });
}

function serializeSession(
  session: ActivityTimerSession & {
    sessionNotes?: ActivityTimerSessionNote[];
  },
  timezone: string,
  now = new Date(),
): SerializedActivityTimerSession {
  const stoppedAt = session.stoppedAt;
  const durationSeconds =
    session.durationSeconds ??
    (stoppedAt
      ? durationSecondsBetween(session.startedAt, stoppedAt)
      : null);
  const timerMode = normalizeTimerMode(session.timerMode);

  const displayDate = stoppedAt ?? session.startedAt;
  const sessionNotes = (session.sessionNotes ?? []).map((note) =>
    serializeActivityTimerSessionNote(note, timezone),
  );

  return {
    id: session.id,
    presetId: session.presetId,
    title: session.title,
    category: session.category,
    notes: session.notes,
    targetDurationSeconds: session.targetDurationSeconds,
    timerMode,
    completed: session.completed,
    startedAt: session.startedAt.toISOString(),
    stoppedAt: stoppedAt?.toISOString() ?? null,
    durationSeconds,
    timeLabel: formatSessionTimeLabel(displayDate, timezone, now),
    durationLabel: formatActivityDuration(durationSeconds ?? 0),
    dayGroupLabel: formatSessionDayLabel(displayDate, timezone, now),
    clockTimeLabel: formatSessionClockTime(displayDate, timezone),
    durationShortLabel: formatActivityDurationShort(durationSeconds ?? 0),
    notesPreview: buildSessionNotesPreview(sessionNotes),
    sessionNotes,
  };
}

export async function serializeActiveActivityTimerSessionWithNotes(
  session: ActivityTimerSession,
  userId: string,
): Promise<SerializedActiveActivityTimerSession> {
  const timezone = await getUserTimezone(userId);
  const sessionNotes = await prisma.activityTimerSessionNote.findMany({
    where: { sessionId: session.id, userId },
    orderBy: { recordedAt: "asc" },
  });

  return {
    id: session.id,
    title: session.title,
    presetId: session.presetId,
    category: session.category,
    startedAt: session.startedAt.toISOString(),
    notes: session.notes,
    targetDurationSeconds: session.targetDurationSeconds,
    timerMode: normalizeTimerMode(session.timerMode),
    pausedAt: session.pausedAt?.toISOString() ?? null,
    accumulatedPausedSeconds: session.accumulatedPausedSeconds,
    sessionNotes: sessionNotes.map((note) =>
      serializeActivityTimerSessionNote(note, timezone),
    ),
  };
}

export function serializeActiveActivityTimerSession(
  session: ActivityTimerSession,
  sessionNotes: SerializedActivityTimerSessionNote[] = [],
): SerializedActiveActivityTimerSession {
  return {
    id: session.id,
    title: session.title,
    presetId: session.presetId,
    category: session.category,
    startedAt: session.startedAt.toISOString(),
    notes: session.notes,
    targetDurationSeconds: session.targetDurationSeconds,
    timerMode: normalizeTimerMode(session.timerMode),
    pausedAt: session.pausedAt?.toISOString() ?? null,
    accumulatedPausedSeconds: session.accumulatedPausedSeconds,
    sessionNotes,
  };
}

function serializeActiveSession(
  session: ActivityTimerSession,
  sessionNotes: SerializedActivityTimerSessionNote[] = [],
): SerializedActiveActivityTimerSession {
  return serializeActiveActivityTimerSession(session, sessionNotes);
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
      targetDurationSeconds: preset.targetDurationSeconds,
      timerMode: preset.timerMode,
      iconName: preset.iconName,
      sortOrder: index,
    })),
  });
}

async function ensureDefaultPresetIcons(userId: string): Promise<void> {
  await Promise.all(
    DEFAULT_ACTIVITY_TIMER_PRESETS.filter((preset) => preset.iconName).map(
      (preset) =>
        prisma.activityTimerPreset.updateMany({
          where: {
            userId,
            title: preset.title,
            isArchived: false,
            iconName: null,
          },
          data: {
            iconName: preset.iconName,
          },
        }),
    ),
  );
}

async function ensureMissingDefaultPresets(userId: string): Promise<void> {
  const maxSort = await prisma.activityTimerPreset.aggregate({
    where: { userId, isArchived: false },
    _max: { sortOrder: true },
  });
  let nextSort = (maxSort._max.sortOrder ?? -1) + 1;

  for (const preset of DEFAULT_ACTIVITY_TIMER_PRESETS) {
    const existing = await prisma.activityTimerPreset.findFirst({
      where: {
        userId,
        title: preset.title,
      },
      select: { id: true },
    });

    if (existing) {
      continue;
    }

    await prisma.activityTimerPreset.create({
      data: {
        userId,
        title: preset.title,
        category: preset.category,
        targetDurationSeconds: preset.targetDurationSeconds,
        timerMode: preset.timerMode,
        iconName: preset.iconName,
        sortOrder: nextSort,
      },
    });
    nextSort += 1;
  }
}

async function ensureLegacyDefaultPresetTitles(userId: string): Promise<void> {
  await Promise.all(
    LEGACY_DEFAULT_ACTIVITY_TIMER_PRESET_TITLES.map(({ from, to }) =>
      prisma.activityTimerPreset.updateMany({
        where: {
          userId,
          title: from,
          isArchived: false,
        },
        data: {
          title: to,
        },
      }),
    ),
  );
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

  return session
    ? serializeActiveActivityTimerSessionWithNotes(session, userId)
    : null;
}

export async function getActivityTimerPageData(
  userId: string,
): Promise<ActivityTimerPageData> {
  await ensureDefaultPresets(userId);
  await ensureLegacyDefaultPresetTitles(userId);
  await ensureMissingDefaultPresets(userId);
  await ensureDefaultPresetIcons(userId);

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
        include: {
          sessionNotes: {
            orderBy: { recordedAt: "asc" },
          },
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
      ? await serializeActiveActivityTimerSessionWithNotes(activeSession, userId)
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
  const active = await getActiveSession(userId);

  if (active) {
    return active;
  }

  const title = normalizeTitle(input.title);
  const notes = normalizeOptionalNotes(input.notes);
  const targetDurationSeconds = normalizeOptionalTargetDuration(
    input.targetDurationSeconds,
  );

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

  const sessionTargetDurationSeconds =
    preset != null
      ? preset.targetDurationSeconds
      : targetDurationSeconds;
  const timerMode = normalizeTimerMode(
    preset?.timerMode ?? input.timerMode ?? "countUp",
  );

  if (
    timerMode === "countDown" &&
    (sessionTargetDurationSeconds == null || sessionTargetDurationSeconds <= 0)
  ) {
    throw new ActivityTimerError("Countdown activities need a duration.");
  }

  return prisma.activityTimerSession.create({
    data: {
      userId,
      presetId: preset?.id ?? null,
      title: preset?.title ?? title,
      category: preset?.category ?? null,
      notes,
      targetDurationSeconds: sessionTargetDurationSeconds,
      timerMode,
      startedAt: new Date(),
      accumulatedPausedSeconds: 0,
      completed: false,
    },
  });
}

function computeActiveSessionDurationSeconds(
  session: Pick<
    ActivityTimerSession,
    | "startedAt"
    | "pausedAt"
    | "accumulatedPausedSeconds"
    | "timerMode"
    | "targetDurationSeconds"
  >,
  stoppedAt: Date,
  completed: boolean,
): number {
  const elapsed = activeElapsedSecondsFromSession({
    startedAt: session.startedAt,
    pausedAt: session.pausedAt,
    accumulatedPausedSeconds: session.accumulatedPausedSeconds,
    nowMs: stoppedAt.getTime(),
  });

  if (
    completed &&
    normalizeTimerMode(session.timerMode) === "countDown" &&
    session.targetDurationSeconds != null &&
    session.targetDurationSeconds > 0
  ) {
    return session.targetDurationSeconds;
  }

  return elapsed;
}

export async function pauseActivityTimerSession(
  userId: string,
  sessionId: string,
) {
  const session = await prisma.activityTimerSession.findFirst({
    where: {
      id: sessionId,
      userId,
      stoppedAt: null,
    },
  });

  if (!session) {
    throw new ActivityTimerError("Active timer not found.");
  }

  if (session.pausedAt) {
    return session;
  }

  return prisma.activityTimerSession.update({
    where: { id: session.id },
    data: {
      pausedAt: new Date(),
    },
  });
}

export async function resumeActivityTimerSession(
  userId: string,
  sessionId: string,
) {
  const session = await prisma.activityTimerSession.findFirst({
    where: {
      id: sessionId,
      userId,
      stoppedAt: null,
    },
  });

  if (!session) {
    throw new ActivityTimerError("Active timer not found.");
  }

  if (!session.pausedAt) {
    return session;
  }

  const pausedMs = session.pausedAt.getTime();
  const resumeMs = Date.now();
  const pauseSegmentSeconds = Math.max(
    0,
    Math.floor((resumeMs - pausedMs) / 1000),
  );

  return prisma.activityTimerSession.update({
    where: { id: session.id },
    data: {
      pausedAt: null,
      accumulatedPausedSeconds:
        session.accumulatedPausedSeconds + pauseSegmentSeconds,
    },
  });
}

export type StopActivityTimerResult =
  | {
      outcome: "saved";
      session: ActivityTimerSession;
      durationSeconds: number;
    }
  | {
      outcome: "discarded";
      reason: "under_minimum" | "explicit";
      durationSeconds: number;
    }
  | {
      outcome: "idle";
    };

async function discardActiveTimerSession(
  sessionId: string,
): Promise<void> {
  await prisma.activityTimerSession.delete({
    where: { id: sessionId },
  });
}

export async function stopActivityTimerSession(
  userId: string,
  input: StopActivityTimerInput,
): Promise<StopActivityTimerResult> {
  const session = await prisma.activityTimerSession.findFirst({
    where: {
      id: input.sessionId,
      userId,
      stoppedAt: null,
    },
  });

  if (!session) {
    return { outcome: "idle" };
  }

  const stoppedAt = new Date();
  const completed = Boolean(input.completed);
  const durationSeconds = computeActiveSessionDurationSeconds(
    session,
    stoppedAt,
    completed,
  );

  if (input.discard) {
    await discardActiveTimerSession(session.id);
    return {
      outcome: "discarded",
      reason: "explicit",
      durationSeconds,
    };
  }

  if (!shouldSaveTimerSession(durationSeconds)) {
    await discardActiveTimerSession(session.id);
    return {
      outcome: "discarded",
      reason: "under_minimum",
      durationSeconds,
    };
  }

  const saved = await prisma.activityTimerSession.update({
    where: { id: session.id },
    data: {
      stoppedAt,
      durationSeconds,
      completed,
      pausedAt: null,
      notes:
        input.notes !== undefined
          ? normalizeOptionalNotes(input.notes)
          : undefined,
    },
  });

  return {
    outcome: "saved",
    session: saved,
    durationSeconds,
  };
}

export async function stopActiveActivityTimerSession(
  userId: string,
  options: { completed?: boolean } = {},
): Promise<StopActivityTimerResult> {
  const active = await getActiveSession(userId);

  if (!active) {
    return { outcome: "idle" };
  }

  return stopActivityTimerSession(userId, {
    sessionId: active.id,
    completed: options.completed,
  });
}

export async function addActivityTimerSessionNote(
  userId: string,
  input: AddActivityTimerSessionNoteInput,
) {
  const text = normalizeSessionNoteText(input.text);
  const session = await prisma.activityTimerSession.findFirst({
    where: {
      id: input.sessionId,
      userId,
    },
  });

  if (!session) {
    throw new ActivityTimerError("Timer session not found.");
  }

  const recordedAt = new Date();
  const offsetSeconds = computeSessionNoteOffsetSeconds(
    session.startedAt,
    recordedAt,
  );

  const note = await prisma.activityTimerSessionNote.create({
    data: {
      sessionId: session.id,
      userId,
      text,
      recordedAt,
      offsetSeconds,
    },
  });

  await syncSessionNotesField(session.id, userId);

  return note;
}

export async function updateActivityTimerSessionNote(
  userId: string,
  input: UpdateActivityTimerSessionNoteInput,
) {
  const text = normalizeSessionNoteText(input.text);
  const note = await prisma.activityTimerSessionNote.findFirst({
    where: {
      id: input.noteId,
      userId,
    },
  });

  if (!note) {
    throw new ActivityTimerError("Session note not found.");
  }

  const updated = await prisma.activityTimerSessionNote.update({
    where: { id: note.id },
    data: { text },
  });

  await syncSessionNotesField(note.sessionId, userId);

  return updated;
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
            : (() => {
                const next = Math.max(0, Math.floor(input.durationSeconds));
                if (!shouldSaveTimerSession(next)) {
                  throw new ActivityTimerError(
                    `Sessions must be at least ${MIN_TIMER_SESSION_SECONDS} seconds.`,
                  );
                }
                return next;
              })()
          : undefined,
    },
  });
}

export async function deleteActivityTimerSession(
  userId: string,
  sessionId: string,
): Promise<void> {
  const session = await prisma.activityTimerSession.findFirst({
    where: {
      id: sessionId,
      userId,
    },
    select: {
      id: true,
      stoppedAt: true,
    },
  });

  if (!session) {
    throw new ActivityTimerError("Timer session not found.");
  }

  if (!session.stoppedAt) {
    throw new ActivityTimerError("Stop the timer before deleting this entry.");
  }

  await prisma.activityTimerSession.delete({
    where: { id: session.id },
  });
}

export async function getActivityTimerPresetSettingsData(
  userId: string,
): Promise<ActivityTimerPresetSettingsData> {
  await ensureDefaultPresets(userId);
  await ensureLegacyDefaultPresetTitles(userId);
  await ensureMissingDefaultPresets(userId);
  await ensureDefaultPresetIcons(userId);

  const presets = await prisma.activityTimerPreset.findMany({
    where: { userId },
    orderBy: [{ isArchived: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
  });

  const serialized = presets.map(serializePresetManagement);

  return {
    activePresets: serialized.filter((preset) => !preset.isArchived),
    archivedPresets: serialized.filter((preset) => preset.isArchived),
  };
}

export async function updateActivityTimerPreset(
  userId: string,
  input: UpdateActivityTimerPresetInput,
) {
  const preset = await prisma.activityTimerPreset.findFirst({
    where: {
      id: input.presetId,
      userId,
    },
  });

  if (!preset) {
    throw new ActivityTimerError("Activity preset not found.");
  }

  const nextTimerMode =
    input.timerMode !== undefined
      ? normalizeTimerMode(input.timerMode)
      : normalizeTimerMode(preset.timerMode);
  const nextTargetDurationSeconds =
    input.targetDurationSeconds !== undefined
      ? normalizeOptionalTargetDuration(input.targetDurationSeconds)
      : preset.targetDurationSeconds;

  if (
    nextTimerMode === "countDown" &&
    (nextTargetDurationSeconds == null || nextTargetDurationSeconds <= 0)
  ) {
    throw new ActivityTimerError("Countdown presets need a duration.");
  }

  return prisma.activityTimerPreset.update({
    where: { id: preset.id },
    data: {
      title: input.title !== undefined ? normalizeTitle(input.title) : undefined,
      category:
        input.category !== undefined
          ? normalizeOptionalCategory(input.category)
          : undefined,
      targetDurationSeconds:
        input.targetDurationSeconds !== undefined
          ? normalizeOptionalTargetDuration(input.targetDurationSeconds)
          : undefined,
      timerMode:
        input.timerMode !== undefined
          ? normalizeTimerMode(input.timerMode)
          : undefined,
      iconName:
        input.iconName !== undefined
          ? normalizePresetIconName(input.iconName)
          : undefined,
      isArchived: input.isArchived,
    },
  });
}

export async function restoreActivityTimerPreset(
  userId: string,
  presetId: string,
) {
  const preset = await prisma.activityTimerPreset.findFirst({
    where: {
      id: presetId,
      userId,
      isArchived: true,
    },
  });

  if (!preset) {
    throw new ActivityTimerError("Archived activity preset not found.");
  }

  const maxSort = await prisma.activityTimerPreset.aggregate({
    where: { userId, isArchived: false },
    _max: { sortOrder: true },
  });

  return prisma.activityTimerPreset.update({
    where: { id: preset.id },
    data: {
      isArchived: false,
      sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
    },
  });
}

export async function reorderActivityTimerPresets(
  userId: string,
  presetIds: string[],
) {
  const activePresets = await prisma.activityTimerPreset.findMany({
    where: { userId, isArchived: false },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  const activeIds = activePresets.map((preset) => preset.id);
  const requestedSet = new Set(presetIds);

  if (
    presetIds.length !== activeIds.length ||
    !activeIds.every((id) => requestedSet.has(id))
  ) {
    throw new ActivityTimerError("Invalid preset order.");
  }

  await prisma.$transaction(
    presetIds.map((presetId, index) =>
      prisma.activityTimerPreset.update({
        where: { id: presetId },
        data: { sortOrder: index },
      }),
    ),
  );
}

export async function deleteActivityTimerPreset(
  userId: string,
  presetId: string,
): Promise<void> {
  const preset = await prisma.activityTimerPreset.findFirst({
    where: {
      id: presetId,
      userId,
    },
    select: { id: true },
  });

  if (!preset) {
    throw new ActivityTimerError("Activity preset not found.");
  }

  await prisma.activityTimerPreset.delete({
    where: { id: preset.id },
  });
}

export async function createActivityTimerPreset(
  userId: string,
  input: CreateActivityTimerPresetInput,
) {
  const title = normalizeTitle(input.title);
  const category = normalizeOptionalCategory(input.category);
  const timerMode = normalizeTimerMode(input.timerMode);
  const targetDurationSeconds = normalizeOptionalTargetDuration(
    input.targetDurationSeconds,
  );
  const iconName = normalizePresetIconName(input.iconName);

  if (
    timerMode === "countDown" &&
    (targetDurationSeconds == null || targetDurationSeconds <= 0)
  ) {
    throw new ActivityTimerError("Countdown presets need a duration.");
  }

  const maxSort = await prisma.activityTimerPreset.aggregate({
    where: { userId, isArchived: false },
    _max: { sortOrder: true },
  });

  return prisma.activityTimerPreset.create({
    data: {
      userId,
      title,
      category,
      targetDurationSeconds,
      timerMode,
      iconName,
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

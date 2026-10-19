import { randomUUID } from "node:crypto";

import { startOfDay } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";

import {
  activeElapsedSecondsFromSession,
  shouldSaveTimerSession,
} from "@/lib/activity-timer/countdown";
import { prisma } from "@/lib/prisma";
import {
  DEFAULT_POMODORO_PREFERENCES,
  MAX_POMODORO_TITLE_LENGTH,
  MIN_POMODORO_FOCUS_LOG_SECONDS,
  type PomodoroDailySummary,
  type PomodoroPageData,
  type PomodoroPhase,
  type PomodoroPreferences,
  type PomodoroRunStatus,
  type SerializedPomodoroActiveRun,
  type SerializedPomodoroFocusLog,
} from "@/lib/pomodoro/constants";
import { computeAdjustedPomodoroTarget } from "@/lib/pomodoro/adjust-remaining";
import {
  durationSecondsForPhase,
  nextBreakPhaseAfterFocus,
  nextFocusStateAfterBreak,
} from "@/lib/pomodoro/cycle";
import { normalizePomodoroPreferences } from "@/lib/pomodoro/preferences";
import {
  cancelPendingPomodoroPushJobs,
  cancelPomodoroPushJobByToken,
  schedulePomodoroPhasePush,
} from "@/lib/pomodoro/push-jobs";
import { listPomodoroActivities } from "@/lib/pomodoro/activities";
import { PomodoroError } from "@/lib/pomodoro/errors";
import { listTodayPlanTaskOptions } from "@/lib/pomodoro/today-tasks";
import { getUserTimezone } from "@/lib/user-timezone";

export { PomodoroError };

type ActiveRunRow = {
  id: string;
  phase: string;
  status: string;
  focusIndex: number;
  completedFocusCount: number;
  startedAt: Date | null;
  pausedAt: Date | null;
  accumulatedPausedSeconds: number;
  targetDurationSeconds: number;
  taskId: string | null;
  customTitle: string | null;
  transitionToken: string | null;
  updatedAt: Date;
};

function asPhase(value: string): PomodoroPhase {
  if (value === "short_break" || value === "long_break" || value === "focus") {
    return value;
  }
  return "focus";
}

function asStatus(value: string): PomodoroRunStatus {
  if (value === "paused" || value === "awaiting_next" || value === "running") {
    return value;
  }
  return "running";
}

function serializeActiveRun(row: ActiveRunRow): SerializedPomodoroActiveRun {
  return {
    id: row.id,
    phase: asPhase(row.phase),
    status: asStatus(row.status),
    focusIndex: row.focusIndex,
    completedFocusCount: row.completedFocusCount,
    startedAt: row.startedAt?.toISOString() ?? null,
    pausedAt: row.pausedAt?.toISOString() ?? null,
    accumulatedPausedSeconds: row.accumulatedPausedSeconds,
    targetDurationSeconds: row.targetDurationSeconds,
    taskId: row.taskId,
    customTitle: row.customTitle,
    transitionToken: row.transitionToken,
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function syncPomodoroPushSchedule(
  userId: string,
  row: ActiveRunRow | null,
): Promise<void> {
  if (!row || row.status !== "running" || !row.startedAt || !row.transitionToken) {
    await cancelPendingPomodoroPushJobs(userId);
    return;
  }

  const elapsed = activeElapsedSecondsFromSession({
    startedAt: row.startedAt,
    pausedAt: row.pausedAt,
    accumulatedPausedSeconds: row.accumulatedPausedSeconds,
  });
  const remaining = Math.max(0, row.targetDurationSeconds - elapsed);
  if (remaining <= 0) {
    // Zero remaining awaits an explicit Finish — do not fire completion push.
    await cancelPendingPomodoroPushJobs(userId);
    return;
  }

  const preferences = await getPomodoroPreferences(userId);
  await schedulePomodoroPhasePush({
    userId,
    runId: row.id,
    transitionToken: row.transitionToken,
    phase: asPhase(row.phase),
    startedAt: row.startedAt,
    pausedAt: row.pausedAt,
    accumulatedPausedSeconds: row.accumulatedPausedSeconds,
    targetDurationSeconds: row.targetDurationSeconds,
    notificationsEnabled: preferences.notificationsEnabled,
  });
}

function displayTitleForLog(input: {
  customTitle: string | null;
  taskId: string | null;
  taskTitle?: string | null;
}): string {
  const custom = input.customTitle?.trim();
  if (custom) {
    return custom;
  }
  if (input.taskTitle?.trim()) {
    return input.taskTitle.trim();
  }
  if (input.taskId) {
    return "Plan task";
  }
  return "Focus session";
}

function sanitizeTitle(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) {
    return null;
  }
  return trimmed.slice(0, MAX_POMODORO_TITLE_LENGTH);
}

function startOfDayInTimezone(timezone: string, now = new Date()): Date {
  const zoned = toZonedTime(now, timezone);
  return fromZonedTime(startOfDay(zoned), timezone);
}

export async function getPomodoroPreferences(
  userId: string,
): Promise<PomodoroPreferences> {
  const row = await prisma.pomodoroPreference.findUnique({
    where: { userId },
  });

  if (!row) {
    return DEFAULT_POMODORO_PREFERENCES;
  }

  return normalizePomodoroPreferences(row);
}

export async function upsertPomodoroPreferences(
  userId: string,
  input: Partial<PomodoroPreferences>,
): Promise<PomodoroPreferences> {
  const current = await getPomodoroPreferences(userId);
  const next = normalizePomodoroPreferences({ ...current, ...input });

  await prisma.pomodoroPreference.upsert({
    where: { userId },
    create: { userId, ...next },
    update: next,
  });

  const active = await getActiveRunRow(userId);
  if (active?.status === "running" && active.startedAt) {
    const phase = asPhase(active.phase);
    const nextTarget = durationSecondsForPhase(phase, next);
    const updated =
      nextTarget !== active.targetDurationSeconds
        ? await prisma.pomodoroActiveRun.update({
            where: { userId },
            data: { targetDurationSeconds: nextTarget },
          })
        : active;
    await syncPomodoroPushSchedule(userId, updated);
  } else if (!next.notificationsEnabled) {
    await cancelPendingPomodoroPushJobs(userId);
  }

  return next;
}

async function getActiveRunRow(userId: string): Promise<ActiveRunRow | null> {
  return prisma.pomodoroActiveRun.findUnique({
    where: { userId },
  });
}

export async function getActivePomodoroRun(
  userId: string,
): Promise<SerializedPomodoroActiveRun | null> {
  const row = await getActiveRunRow(userId);
  return row ? serializeActiveRun(row) : null;
}

async function getTodaySummary(
  userId: string,
  timezone: string,
): Promise<PomodoroDailySummary> {
  const dayStart = startOfDayInTimezone(timezone);
  const logs = await prisma.pomodoroFocusLog.findMany({
    where: {
      userId,
      startedAt: { gte: dayStart },
    },
    select: { actualFocusedSeconds: true },
  });

  return {
    sessionCount: logs.length,
    focusedSeconds: logs.reduce(
      (sum, log) => sum + Math.max(0, log.actualFocusedSeconds),
      0,
    ),
  };
}

async function getRecentLogs(
  userId: string,
): Promise<SerializedPomodoroFocusLog[]> {
  const logs = await prisma.pomodoroFocusLog.findMany({
    where: { userId },
    orderBy: { endedAt: "desc" },
    take: 12,
  });

  const taskIds = [
    ...new Set(logs.map((log) => log.taskId).filter(Boolean)),
  ] as string[];
  const tasks =
    taskIds.length > 0
      ? await prisma.planItem.findMany({
          where: { id: { in: taskIds }, plan: { userId } },
          select: { id: true, title: true },
        })
      : [];
  const titleById = new Map(tasks.map((task) => [task.id, task.title]));

  return logs.map((log) => ({
    id: log.id,
    taskId: log.taskId,
    customTitle: log.customTitle,
    plannedDurationSeconds: log.plannedDurationSeconds,
    actualFocusedSeconds: log.actualFocusedSeconds,
    startedAt: log.startedAt.toISOString(),
    endedAt: log.endedAt.toISOString(),
    completed: log.completed,
    interrupted: log.interrupted,
    cycleNumber: log.cycleNumber,
    displayTitle: displayTitleForLog({
      customTitle: log.customTitle,
      taskId: log.taskId,
      taskTitle: log.taskId ? titleById.get(log.taskId) : null,
    }),
  }));
}

export async function getPomodoroPageData(
  userId: string,
): Promise<PomodoroPageData> {
  const timezone = await getUserTimezone(userId);
  const [preferences, activeRun, todaySummary, recentLogs, activities] =
    await Promise.all([
      getPomodoroPreferences(userId),
      getActivePomodoroRun(userId),
      getTodaySummary(userId, timezone),
      getRecentLogs(userId),
      listPomodoroActivities(userId),
    ]);

  // Load after activeRun so a selected task stays visible even if completed/hidden.
  const taskOptions = await listTodayPlanTaskOptions({
    userId,
    timezone,
    selectedTaskId: activeRun?.taskId,
  });

  return {
    preferences,
    activeRun,
    todaySummary,
    recentLogs,
    taskOptions,
    activities,
  };
}

async function createFocusLog(input: {
  userId: string;
  runId: string;
  taskId: string | null;
  customTitle: string | null;
  plannedDurationSeconds: number;
  actualFocusedSeconds: number;
  startedAt: Date;
  endedAt: Date;
  completed: boolean;
  interrupted: boolean;
  cycleNumber: number;
}): Promise<"saved" | "under_minimum" | "duplicate"> {
  if (!shouldSaveTimerSession(input.actualFocusedSeconds)) {
    return "under_minimum";
  }

  // Avoid duplicate logs when complete + stop race.
  const recent = await prisma.pomodoroFocusLog.findFirst({
    where: {
      userId: input.userId,
      runId: input.runId,
      startedAt: input.startedAt,
      endedAt: {
        gte: new Date(input.endedAt.getTime() - 5_000),
      },
    },
    select: { id: true },
  });

  if (recent) {
    return "duplicate";
  }

  const cappedSeconds = input.completed
    ? Math.min(input.actualFocusedSeconds, input.plannedDurationSeconds)
    : input.actualFocusedSeconds;

  if (cappedSeconds < MIN_POMODORO_FOCUS_LOG_SECONDS) {
    return "under_minimum";
  }

  await prisma.pomodoroFocusLog.create({
    data: {
      userId: input.userId,
      runId: input.runId,
      taskId: input.taskId,
      customTitle: input.customTitle,
      phase: "focus",
      plannedDurationSeconds: input.plannedDurationSeconds,
      actualFocusedSeconds: cappedSeconds,
      startedAt: input.startedAt,
      endedAt: input.endedAt,
      completed: input.completed,
      interrupted: input.interrupted,
      cycleNumber: input.cycleNumber,
    },
  });

  return "saved";
}

export type StartPomodoroInput = {
  taskId?: string | null;
  customTitle?: string | null;
};

export async function startPomodoroFocus(
  userId: string,
  input: StartPomodoroInput = {},
): Promise<SerializedPomodoroActiveRun> {
  const preferences = await getPomodoroPreferences(userId);
  const existing = await getActiveRunRow(userId);

  if (existing && (existing.status === "running" || existing.status === "paused")) {
    await syncPomodoroPushSchedule(userId, existing);
    return serializeActiveRun(existing);
  }

  if (
    existing?.status === "awaiting_next" &&
    isBreakPhase(asPhase(existing.phase))
  ) {
    throw new PomodoroError("Start the break first, then the next focus session.");
  }

  const customTitle = sanitizeTitle(input.customTitle);
  let taskId = input.taskId?.trim() || null;

  if (taskId) {
    const task = await prisma.planItem.findFirst({
      where: { id: taskId, plan: { userId } },
      select: { id: true },
    });
    if (!task) {
      taskId = null;
    }
  }

  const continuing =
    existing?.status === "awaiting_next" && asPhase(existing.phase) === "focus";
  const focusIndex = continuing ? Math.max(1, existing.focusIndex) : 1;
  const completedFocusCount = continuing
    ? Math.max(0, existing.completedFocusCount)
    : 0;

  const now = new Date();
  const targetDurationSeconds = preferences.focusDurationSeconds;
  const carriedTitle =
    customTitle ?? sanitizeTitle(existing?.customTitle) ?? null;
  const carriedTaskId = taskId ?? existing?.taskId ?? null;

  const row = await prisma.pomodoroActiveRun.upsert({
    where: { userId },
    create: {
      userId,
      phase: "focus",
      status: "running",
      focusIndex,
      completedFocusCount,
      startedAt: now,
      pausedAt: null,
      accumulatedPausedSeconds: 0,
      targetDurationSeconds,
      taskId: carriedTaskId,
      customTitle: carriedTitle,
      transitionToken: randomUUID(),
    },
    update: {
      phase: "focus",
      status: "running",
      focusIndex,
      completedFocusCount,
      startedAt: now,
      pausedAt: null,
      accumulatedPausedSeconds: 0,
      targetDurationSeconds,
      taskId: carriedTaskId,
      customTitle: carriedTitle,
      transitionToken: randomUUID(),
    },
  });

  await syncPomodoroPushSchedule(userId, row);
  return serializeActiveRun(row);
}

export async function startPomodoroBreak(
  userId: string,
): Promise<SerializedPomodoroActiveRun> {
  const preferences = await getPomodoroPreferences(userId);
  const existing = await getActiveRunRow(userId);

  if (!existing) {
    throw new PomodoroError("No Pomodoro session to continue.");
  }

  if (existing.status === "running" || existing.status === "paused") {
    if (isBreakPhase(asPhase(existing.phase))) {
      return serializeActiveRun(existing);
    }
    throw new PomodoroError("Finish the current focus session first.");
  }

  if (existing.status !== "awaiting_next") {
    throw new PomodoroError("Finish a focus session before starting a break.");
  }

  const phase = isBreakPhase(asPhase(existing.phase))
    ? asPhase(existing.phase)
    : nextBreakPhaseAfterFocus({
        completedFocusCount: existing.completedFocusCount,
        sessionsBeforeLongBreak: preferences.sessionsBeforeLongBreak,
      });

  const now = new Date();
  const targetDurationSeconds = durationSecondsForPhase(phase, preferences);

  const row = await prisma.pomodoroActiveRun.update({
    where: { userId },
    data: {
      phase,
      status: "running",
      startedAt: now,
      pausedAt: null,
      accumulatedPausedSeconds: 0,
      targetDurationSeconds,
      transitionToken: randomUUID(),
    },
  });

  await syncPomodoroPushSchedule(userId, row);
  return serializeActiveRun(row);
}

function isBreakPhase(phase: PomodoroPhase): boolean {
  return phase === "short_break" || phase === "long_break";
}

export async function pausePomodoroRun(
  userId: string,
): Promise<SerializedPomodoroActiveRun> {
  const existing = await getActiveRunRow(userId);

  if (!existing || !existing.startedAt) {
    throw new PomodoroError("No active Pomodoro session.");
  }

  if (existing.status === "paused") {
    return serializeActiveRun(existing);
  }

  if (existing.status !== "running") {
    throw new PomodoroError("Pomodoro session is not running.");
  }

  const row = await prisma.pomodoroActiveRun.update({
    where: { userId },
    data: {
      status: "paused",
      pausedAt: new Date(),
    },
  });

  await cancelPendingPomodoroPushJobs(userId);
  return serializeActiveRun(row);
}

export async function resumePomodoroRun(
  userId: string,
): Promise<SerializedPomodoroActiveRun> {
  const existing = await getActiveRunRow(userId);

  if (!existing || !existing.startedAt) {
    throw new PomodoroError("No active Pomodoro session.");
  }

  if (existing.status === "running" && !existing.pausedAt) {
    return serializeActiveRun(existing);
  }

  if (existing.status !== "paused" && !existing.pausedAt) {
    throw new PomodoroError("Pomodoro session is not paused.");
  }

  const now = new Date();
  let accumulated = existing.accumulatedPausedSeconds;

  if (existing.pausedAt) {
    accumulated += Math.max(
      0,
      Math.floor((now.getTime() - existing.pausedAt.getTime()) / 1000),
    );
  }

  const elapsed = activeElapsedSecondsFromSession({
    startedAt: existing.startedAt,
    pausedAt: null,
    accumulatedPausedSeconds: accumulated,
    nowMs: now.getTime(),
  });
  if (elapsed >= existing.targetDurationSeconds) {
    throw new PomodoroError("Use Finish to end this session.");
  }

  const row = await prisma.pomodoroActiveRun.update({
    where: { userId },
    data: {
      status: "running",
      pausedAt: null,
      accumulatedPausedSeconds: accumulated,
    },
  });

  await syncPomodoroPushSchedule(userId, row);
  return serializeActiveRun(row);
}

/**
 * Adjust remaining time on a Focus/Break without restarting or changing defaults.
 * Supports running, paused, and awaiting_next (ready to start).
 * Preserves elapsed time by rewriting targetDurationSeconds.
 * Zero remaining pauses a running session and cancels completion push until Finish.
 */
export async function adjustPomodoroRemaining(
  userId: string,
  input: {
    remainingSeconds?: number | null;
    deltaSeconds?: number | null;
  },
): Promise<{
  activeRun: SerializedPomodoroActiveRun;
  remainingSeconds: number;
  requiresExplicitFinish: boolean;
}> {
  const existing = await getActiveRunRow(userId);

  if (!existing) {
    throw new PomodoroError("No active Pomodoro session.");
  }

  const isAwaiting = existing.status === "awaiting_next";
  const isActive =
    existing.status === "running" || existing.status === "paused";

  if (!isAwaiting && !isActive) {
    throw new PomodoroError("Start a session before adjusting the timer.");
  }

  if (isActive && !existing.startedAt) {
    throw new PomodoroError("No active Pomodoro session.");
  }

  const nowMs = Date.now();
  const elapsed =
    isAwaiting || !existing.startedAt
      ? 0
      : activeElapsedSecondsFromSession({
          startedAt: existing.startedAt,
          pausedAt: existing.pausedAt,
          accumulatedPausedSeconds: existing.accumulatedPausedSeconds,
          nowMs,
        });

  let adjusted;
  try {
    adjusted = computeAdjustedPomodoroTarget({
      activeElapsedSeconds: elapsed,
      currentTargetDurationSeconds: existing.targetDurationSeconds,
      remainingSeconds: input.remainingSeconds,
      deltaSeconds: input.deltaSeconds,
    });
  } catch (error) {
    throw new PomodoroError(
      error instanceof Error ? error.message : "Invalid duration.",
    );
  }

  // Awaiting sessions cannot finish at zero remaining — require at least 1 minute.
  if (isAwaiting && adjusted.remainingSeconds <= 0) {
    throw new PomodoroError("Set at least 1 minute before starting.");
  }

  const pauseForFinish =
    adjusted.requiresExplicitFinish && existing.status === "running";

  const row = await prisma.pomodoroActiveRun.update({
    where: { userId },
    data: {
      targetDurationSeconds: adjusted.targetDurationSeconds,
      ...(pauseForFinish
        ? {
            status: "paused" as const,
            pausedAt: new Date(nowMs),
          }
        : {}),
    },
  });

  await syncPomodoroPushSchedule(userId, row);

  return {
    activeRun: serializeActiveRun(row),
    remainingSeconds: adjusted.remainingSeconds,
    requiresExplicitFinish: adjusted.requiresExplicitFinish,
  };
}

/**
 * End a short/long break early and park on the next Focus phase (awaiting start).
 * Does not auto-start focus, does not log the break, and cancels pending push jobs.
 * Idempotent for stale tokens and when already awaiting the next focus.
 */
export async function skipPomodoroBreak(
  userId: string,
  options: { transitionToken?: string | null } = {},
): Promise<{
  activeRun: SerializedPomodoroActiveRun;
  skipped: boolean;
}> {
  const preferences = await getPomodoroPreferences(userId);
  const existing = await getActiveRunRow(userId);

  if (!existing) {
    throw new PomodoroError("No active Pomodoro session.");
  }

  const phase = asPhase(existing.phase);

  if (existing.status === "awaiting_next" && phase === "focus") {
    await cancelPendingPomodoroPushJobs(userId);
    return {
      activeRun: serializeActiveRun(existing),
      skipped: false,
    };
  }

  if (!isBreakPhase(phase)) {
    throw new PomodoroError("Only breaks can be skipped.");
  }

  // running / paused active break, or awaiting_next break before Start break.
  if (
    existing.status !== "running" &&
    existing.status !== "paused" &&
    existing.status !== "awaiting_next"
  ) {
    throw new PomodoroError("No break to skip.");
  }

  if (
    options.transitionToken &&
    existing.transitionToken &&
    options.transitionToken !== existing.transitionToken
  ) {
    return {
      activeRun: serializeActiveRun(existing),
      skipped: false,
    };
  }

  const completedToken = existing.transitionToken;
  const nextFocus = nextFocusStateAfterBreak({
    phase,
    focusIndex: existing.focusIndex,
    completedFocusCount: existing.completedFocusCount,
    sessionsBeforeLongBreak: preferences.sessionsBeforeLongBreak,
  });

  const row = await prisma.pomodoroActiveRun.update({
    where: { userId },
    data: {
      phase: "focus",
      status: "awaiting_next",
      focusIndex: nextFocus.focusIndex,
      completedFocusCount: nextFocus.completedFocusCount,
      startedAt: null,
      pausedAt: null,
      accumulatedPausedSeconds: 0,
      targetDurationSeconds: preferences.focusDurationSeconds,
      transitionToken: randomUUID(),
    },
  });

  await cancelPomodoroPushJobByToken(completedToken);
  await cancelPendingPomodoroPushJobs(userId);

  return {
    activeRun: serializeActiveRun(row),
    skipped: true,
  };
}

export async function stopPomodoroRun(
  userId: string,
): Promise<{
  activeRun: null;
  savedFocus: boolean;
  underMinimum: boolean;
}> {
  const existing = await getActiveRunRow(userId);

  if (!existing) {
    return { activeRun: null, savedFocus: false, underMinimum: false };
  }

  let savedFocus = false;
  let underMinimum = false;

  if (
    asPhase(existing.phase) === "focus" &&
    existing.startedAt &&
    (existing.status === "running" || existing.status === "paused")
  ) {
    const endedAt = new Date();
    const elapsed = activeElapsedSecondsFromSession({
      startedAt: existing.startedAt,
      pausedAt: existing.pausedAt,
      accumulatedPausedSeconds: existing.accumulatedPausedSeconds,
      nowMs: endedAt.getTime(),
    });
    const result = await createFocusLog({
      userId,
      runId: existing.id,
      taskId: existing.taskId,
      customTitle: existing.customTitle,
      plannedDurationSeconds: existing.targetDurationSeconds,
      actualFocusedSeconds: elapsed,
      startedAt: existing.startedAt,
      endedAt,
      completed: false,
      interrupted: true,
      cycleNumber: existing.focusIndex,
    });
    savedFocus = result === "saved";
    underMinimum = result === "under_minimum";
  }

  await prisma.pomodoroActiveRun.delete({ where: { userId } });
  await cancelPendingPomodoroPushJobs(userId);

  return { activeRun: null, savedFocus, underMinimum };
}

export type CompletePomodoroPhaseResult = {
  activeRun: SerializedPomodoroActiveRun | null;
  completedPhase: PomodoroPhase;
  /** Token for the phase that just finished; null when nothing completed. */
  completedTransitionToken: string | null;
  /** False when the phase was already completed (idempotent / other tab). */
  didComplete: boolean;
  savedFocus: boolean;
  underMinimum: boolean;
  autoStartedNext: boolean;
};

/**
 * Complete the current phase using timestamp math.
 * Idempotent when the same transitionToken is reused after success.
 */
export async function completePomodoroPhase(
  userId: string,
  options: { transitionToken?: string | null } = {},
): Promise<CompletePomodoroPhaseResult> {
  const preferences = await getPomodoroPreferences(userId);
  const existing = await getActiveRunRow(userId);

  if (!existing || !existing.startedAt) {
    throw new PomodoroError("No active Pomodoro session.");
  }

  if (existing.status === "awaiting_next") {
    await cancelPomodoroPushJobByToken(existing.transitionToken);
    return {
      activeRun: serializeActiveRun(existing),
      completedPhase: asPhase(existing.phase),
      completedTransitionToken: null,
      didComplete: false,
      savedFocus: false,
      underMinimum: false,
      autoStartedNext: false,
    };
  }

  if (
    options.transitionToken &&
    existing.transitionToken &&
    options.transitionToken !== existing.transitionToken
  ) {
    // Stale completion from another tab; return current state.
    return {
      activeRun: serializeActiveRun(existing),
      completedPhase: asPhase(existing.phase),
      completedTransitionToken: null,
      didComplete: false,
      savedFocus: false,
      underMinimum: false,
      autoStartedNext: false,
    };
  }

  const completedToken = existing.transitionToken;

  const now = new Date();
  const elapsed = activeElapsedSecondsFromSession({
    startedAt: existing.startedAt,
    pausedAt: existing.pausedAt,
    accumulatedPausedSeconds: existing.accumulatedPausedSeconds,
    nowMs: now.getTime(),
  });

  if (elapsed + 1 < existing.targetDurationSeconds) {
    // Allow small clock skew; otherwise reject premature completion.
    if (elapsed < existing.targetDurationSeconds - 2) {
      throw new PomodoroError("Phase is not finished yet.");
    }
  }

  const phase = asPhase(existing.phase);
  let savedFocus = false;
  let underMinimum = false;
  let completedFocusCount = existing.completedFocusCount;
  let focusIndex = existing.focusIndex;

  if (phase === "focus") {
    const result = await createFocusLog({
      userId,
      runId: existing.id,
      taskId: existing.taskId,
      customTitle: existing.customTitle,
      plannedDurationSeconds: existing.targetDurationSeconds,
      actualFocusedSeconds: Math.min(elapsed, existing.targetDurationSeconds),
      startedAt: existing.startedAt,
      endedAt: now,
      completed: true,
      interrupted: false,
      cycleNumber: existing.focusIndex,
    });
    savedFocus = result === "saved" || result === "duplicate";
    underMinimum = result === "under_minimum";
    completedFocusCount = existing.completedFocusCount + 1;
  }

  const autoStartNext =
    phase === "focus"
      ? preferences.autoStartBreaks
      : preferences.autoStartFocus;

  if (autoStartNext) {
    if (phase === "focus") {
      const nextPhase = nextBreakPhaseAfterFocus({
        completedFocusCount,
        sessionsBeforeLongBreak: preferences.sessionsBeforeLongBreak,
      });
      const row = await prisma.pomodoroActiveRun.update({
        where: { userId },
        data: {
          phase: nextPhase,
          status: "running",
          completedFocusCount,
          focusIndex,
          startedAt: now,
          pausedAt: null,
          accumulatedPausedSeconds: 0,
          targetDurationSeconds: durationSecondsForPhase(nextPhase, preferences),
          transitionToken: randomUUID(),
        },
      });

      await cancelPomodoroPushJobByToken(completedToken);
      await syncPomodoroPushSchedule(userId, row);

      return {
        activeRun: serializeActiveRun(row),
        completedPhase: phase,
        completedTransitionToken: completedToken,
        didComplete: true,
        savedFocus,
        underMinimum,
        autoStartedNext: true,
      };
    }

    const nextFocus = nextFocusStateAfterBreak({
      phase,
      focusIndex,
      completedFocusCount,
      sessionsBeforeLongBreak: preferences.sessionsBeforeLongBreak,
    });
    const row = await prisma.pomodoroActiveRun.update({
      where: { userId },
      data: {
        phase: "focus",
        status: "running",
        focusIndex: nextFocus.focusIndex,
        completedFocusCount: nextFocus.completedFocusCount,
        startedAt: now,
        pausedAt: null,
        accumulatedPausedSeconds: 0,
        targetDurationSeconds: preferences.focusDurationSeconds,
        transitionToken: randomUUID(),
      },
    });

    await cancelPomodoroPushJobByToken(completedToken);
    await syncPomodoroPushSchedule(userId, row);

    return {
      activeRun: serializeActiveRun(row),
      completedPhase: phase,
      completedTransitionToken: completedToken,
      didComplete: true,
      savedFocus,
      underMinimum,
      autoStartedNext: true,
    };
  }

  // Manual transition: park in awaiting_next with completed phase recorded.
  const awaitingPhase =
    phase === "focus"
      ? nextBreakPhaseAfterFocus({
          completedFocusCount,
          sessionsBeforeLongBreak: preferences.sessionsBeforeLongBreak,
        })
      : ("focus" as PomodoroPhase);

  const nextFocus =
    phase === "focus"
      ? { focusIndex, completedFocusCount }
      : nextFocusStateAfterBreak({
          phase,
          focusIndex,
          completedFocusCount,
          sessionsBeforeLongBreak: preferences.sessionsBeforeLongBreak,
        });

  const row = await prisma.pomodoroActiveRun.update({
    where: { userId },
    data: {
      phase: awaitingPhase,
      status: "awaiting_next",
      focusIndex: nextFocus.focusIndex,
      completedFocusCount: nextFocus.completedFocusCount,
      startedAt: null,
      pausedAt: null,
      accumulatedPausedSeconds: 0,
      targetDurationSeconds: durationSecondsForPhase(awaitingPhase, preferences),
      transitionToken: randomUUID(),
    },
  });

  await cancelPomodoroPushJobByToken(completedToken);
  await cancelPendingPomodoroPushJobs(userId);

  return {
    activeRun: serializeActiveRun(row),
    completedPhase: phase,
    completedTransitionToken: completedToken,
    didComplete: true,
    savedFocus,
    underMinimum,
    autoStartedNext: false,
  };
}

/**
 * Reconcile overdue running phases after the browser was suspended.
 * Completes at most one overdue phase; does not invent multiple cycles.
 */
export async function reconcilePomodoroRun(
  userId: string,
): Promise<CompletePomodoroPhaseResult | null> {
  const existing = await getActiveRunRow(userId);

  if (
    !existing ||
    !existing.startedAt ||
    existing.status === "awaiting_next" ||
    existing.status === "paused"
  ) {
    return null;
  }

  const elapsed = activeElapsedSecondsFromSession({
    startedAt: existing.startedAt,
    pausedAt: existing.pausedAt,
    accumulatedPausedSeconds: existing.accumulatedPausedSeconds,
  });

  if (elapsed < existing.targetDurationSeconds) {
    return null;
  }

  return completePomodoroPhase(userId, {
    transitionToken: existing.transitionToken,
  });
}

export async function updatePomodoroAssociation(
  userId: string,
  input: StartPomodoroInput,
): Promise<SerializedPomodoroActiveRun | null> {
  const existing = await getActiveRunRow(userId);
  if (!existing) {
    return null;
  }

  const customTitle = sanitizeTitle(input.customTitle);
  let taskId = input.taskId?.trim() || null;

  if (taskId) {
    const task = await prisma.planItem.findFirst({
      where: { id: taskId, plan: { userId } },
      select: { id: true },
    });
    if (!task) {
      taskId = null;
    }
  }

  const row = await prisma.pomodoroActiveRun.update({
    where: { userId },
    data: {
      taskId,
      customTitle,
    },
  });

  return serializeActiveRun(row);
}

export { formatPomodoroFocusedSummary } from "@/lib/pomodoro/format";

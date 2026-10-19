import { activeElapsedSecondsFromSession } from "@/lib/activity-timer/countdown";
import {
  POMODORO_NOTIFICATION_TAG,
  POMODORO_OPEN_PATH,
  type PomodoroPhase,
} from "@/lib/pomodoro/constants";
import { prisma } from "@/lib/prisma";
import {
  sendPushToUserWithResult,
  type PushPayload,
  type PushSendResult,
} from "@/lib/web-push";

export type SchedulePomodoroPushInput = {
  userId: string;
  runId: string;
  transitionToken: string;
  phase: PomodoroPhase;
  startedAt: Date | string;
  pausedAt?: Date | string | null;
  accumulatedPausedSeconds?: number;
  targetDurationSeconds: number;
  nowMs?: number;
};

export function computePomodoroPushSendAt(input: {
  startedAt: Date | string;
  pausedAt?: Date | string | null;
  accumulatedPausedSeconds?: number;
  targetDurationSeconds: number;
  nowMs?: number;
}): Date {
  const nowMs = input.nowMs ?? Date.now();
  const elapsed = activeElapsedSecondsFromSession({
    startedAt: input.startedAt,
    pausedAt: input.pausedAt,
    accumulatedPausedSeconds: input.accumulatedPausedSeconds,
    nowMs,
  });
  const remainingSeconds = Math.max(
    0,
    Math.floor(input.targetDurationSeconds - elapsed),
  );

  return new Date(nowMs + remainingSeconds * 1000);
}

export function buildPomodoroPushPayload(phase: PomodoroPhase): PushPayload {
  const isFocus = phase === "focus";

  return {
    title: isFocus ? "Focus complete" : "Break complete",
    // Generic copy only — never include task titles or personal notes.
    body: isFocus
      ? "Time for a break."
      : "Ready for another focus session?",
    url: POMODORO_OPEN_PATH,
    kind: isFocus ? "focus-complete" : "break-complete",
    tag: POMODORO_NOTIFICATION_TAG,
  };
}

export async function cancelPendingPomodoroPushJobs(
  userId: string,
): Promise<number> {
  const result = await prisma.pomodoroPushJob.updateMany({
    where: { userId, status: "pending" },
    data: { status: "cancelled" },
  });

  return result.count;
}

export async function cancelPomodoroPushJobByToken(
  transitionToken: string | null | undefined,
): Promise<void> {
  if (!transitionToken) {
    return;
  }

  await prisma.pomodoroPushJob.updateMany({
    where: { transitionToken, status: "pending" },
    data: { status: "cancelled" },
  });
}

/**
 * Replace pending jobs with one completion notification for the active phase.
 */
export async function schedulePomodoroPhasePush(
  input: SchedulePomodoroPushInput & { notificationsEnabled: boolean },
): Promise<{ scheduled: boolean; sendAt: Date | null }> {
  await cancelPendingPomodoroPushJobs(input.userId);

  if (!input.notificationsEnabled || input.pausedAt || !input.transitionToken) {
    return { scheduled: false, sendAt: null };
  }

  const sendAt = computePomodoroPushSendAt(input);

  await prisma.pomodoroPushJob.upsert({
    where: { transitionToken: input.transitionToken },
    create: {
      userId: input.userId,
      runId: input.runId,
      transitionToken: input.transitionToken,
      phase: input.phase,
      sendAt,
      status: "pending",
    },
    update: {
      userId: input.userId,
      runId: input.runId,
      phase: input.phase,
      sendAt,
      status: "pending",
      sentAt: null,
    },
  });

  return { scheduled: true, sendAt };
}

export type DispatchPomodoroPushResult = {
  dueJobs: number;
  claimed: number;
  sent: number;
  cancelled: number;
  failed: number;
  skippedNoSubscriptions: number;
  staleRemoved: number;
  phaseCompletions: number;
};

type DispatchDeps = {
  completeOverduePhase: (
    userId: string,
    transitionToken: string,
  ) => Promise<{ completed: boolean; phase: PomodoroPhase }>;
  now?: Date;
  sendPush?: (
    userId: string,
    payload: PushPayload,
  ) => Promise<PushSendResult>;
};

function asPhase(value: string): PomodoroPhase {
  if (value === "short_break" || value === "long_break") {
    return value;
  }
  return "focus";
}

/**
 * Process due Pomodoro push jobs from Postgres.
 * Uses pending → failed as a claim lock, then finalizes to sent/cancelled/failed.
 * Completes overdue running phases before notifying so state stays consistent.
 */
export async function dispatchDuePomodoroPushJobs(
  deps: DispatchDeps,
): Promise<DispatchPomodoroPushResult> {
  const now = deps.now ?? new Date();
  const sendPush = deps.sendPush ?? sendPushToUserWithResult;

  const due = await prisma.pomodoroPushJob.findMany({
    where: {
      status: "pending",
      sendAt: { lte: now },
    },
    orderBy: { sendAt: "asc" },
    take: 50,
  });

  const result: DispatchPomodoroPushResult = {
    dueJobs: due.length,
    claimed: 0,
    sent: 0,
    cancelled: 0,
    failed: 0,
    skippedNoSubscriptions: 0,
    staleRemoved: 0,
    phaseCompletions: 0,
  };

  for (const job of due) {
    const locked = await prisma.pomodoroPushJob.updateMany({
      where: { id: job.id, status: "pending" },
      data: { status: "sending", updatedAt: now },
    });

    if (locked.count !== 1) {
      continue;
    }

    result.claimed += 1;

    try {
      const prefs = await prisma.pomodoroPreference.findUnique({
        where: { userId: job.userId },
        select: { notificationsEnabled: true },
      });

      if (!prefs?.notificationsEnabled) {
        await prisma.pomodoroPushJob.update({
          where: { id: job.id },
          data: { status: "cancelled" },
        });
        result.cancelled += 1;
        continue;
      }

      const run = await prisma.pomodoroActiveRun.findUnique({
        where: { userId: job.userId },
      });

      if (
        !run ||
        run.id !== job.runId ||
        run.transitionToken !== job.transitionToken ||
        run.status === "awaiting_next" ||
        run.status === "paused"
      ) {
        await prisma.pomodoroPushJob.update({
          where: { id: job.id },
          data: { status: "cancelled" },
        });
        result.cancelled += 1;
        continue;
      }

      if (run.status === "running" && run.startedAt) {
        const elapsed = activeElapsedSecondsFromSession({
          startedAt: run.startedAt,
          pausedAt: run.pausedAt,
          accumulatedPausedSeconds: run.accumulatedPausedSeconds,
          nowMs: now.getTime(),
        });

        if (elapsed + 2 >= run.targetDurationSeconds) {
          const completion = await deps.completeOverduePhase(
            job.userId,
            job.transitionToken,
          );
          if (completion.completed) {
            result.phaseCompletions += 1;
          }
        }
      }

      const payload = buildPomodoroPushPayload(asPhase(job.phase));
      const pushResult = await sendPush(job.userId, payload);
      result.staleRemoved += pushResult.staleRemoved;

      if (pushResult.subscriptionCount === 0) {
        await prisma.pomodoroPushJob.update({
          where: { id: job.id },
          data: { status: "cancelled" },
        });
        result.skippedNoSubscriptions += 1;
        result.cancelled += 1;
        continue;
      }

      if (pushResult.sent > 0) {
        await prisma.pomodoroPushJob.update({
          where: { id: job.id },
          data: { status: "sent", sentAt: now },
        });
        result.sent += 1;
        continue;
      }

      await prisma.pomodoroPushJob.update({
        where: { id: job.id },
        data: { status: "failed" },
      });
      result.failed += 1;
    } catch {
      await prisma.pomodoroPushJob.update({
        where: { id: job.id },
        data: { status: "failed" },
      });
      result.failed += 1;
    }
  }

  return result;
}

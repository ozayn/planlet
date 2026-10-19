import { prisma } from "@/lib/prisma";
import {
  MAX_POMODORO_ACTIVITIES,
  MAX_POMODORO_TITLE_LENGTH,
  type PomodoroActivityOption,
} from "@/lib/pomodoro/constants";
import { PomodoroError } from "@/lib/pomodoro/errors";

function sanitizeActivityTitle(value: string | null | undefined): string {
  const title = value?.trim().replace(/\s+/g, " ") ?? "";
  if (!title) {
    throw new PomodoroError("Activity title is required.");
  }
  return title.slice(0, MAX_POMODORO_TITLE_LENGTH);
}

export async function listPomodoroActivities(
  userId: string,
): Promise<PomodoroActivityOption[]> {
  const rows = await prisma.pomodoroActivity.findMany({
    where: { userId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { id: true, title: true, sortOrder: true },
  });

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    sortOrder: row.sortOrder,
  }));
}

export async function createPomodoroActivity(
  userId: string,
  titleInput: string,
): Promise<PomodoroActivityOption> {
  const title = sanitizeActivityTitle(titleInput);
  const count = await prisma.pomodoroActivity.count({ where: { userId } });
  if (count >= MAX_POMODORO_ACTIVITIES) {
    throw new PomodoroError(
      `You can save up to ${MAX_POMODORO_ACTIVITIES} activities.`,
    );
  }

  const maxOrder = await prisma.pomodoroActivity.aggregate({
    where: { userId },
    _max: { sortOrder: true },
  });
  const sortOrder = (maxOrder._max.sortOrder ?? -1) + 1;

  const row = await prisma.pomodoroActivity.create({
    data: { userId, title, sortOrder },
    select: { id: true, title: true, sortOrder: true },
  });

  return row;
}

export async function renamePomodoroActivity(
  userId: string,
  activityId: string,
  titleInput: string,
): Promise<PomodoroActivityOption> {
  const title = sanitizeActivityTitle(titleInput);
  const existing = await prisma.pomodoroActivity.findFirst({
    where: { id: activityId, userId },
    select: { id: true },
  });
  if (!existing) {
    throw new PomodoroError("Activity not found.");
  }

  const row = await prisma.pomodoroActivity.update({
    where: { id: activityId },
    data: { title },
    select: { id: true, title: true, sortOrder: true },
  });

  return row;
}

export async function deletePomodoroActivity(
  userId: string,
  activityId: string,
): Promise<void> {
  const existing = await prisma.pomodoroActivity.findFirst({
    where: { id: activityId, userId },
    select: { id: true },
  });
  if (!existing) {
    throw new PomodoroError("Activity not found.");
  }

  await prisma.pomodoroActivity.delete({ where: { id: activityId } });
}

export async function reorderPomodoroActivities(
  userId: string,
  orderedIds: string[],
): Promise<PomodoroActivityOption[]> {
  const existing = await prisma.pomodoroActivity.findMany({
    where: { userId },
    select: { id: true },
  });
  const existingIds = new Set(existing.map((row) => row.id));

  if (
    orderedIds.length !== existingIds.size ||
    orderedIds.some((id) => !existingIds.has(id))
  ) {
    throw new PomodoroError("Invalid activity order.");
  }

  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.pomodoroActivity.update({
        where: { id },
        data: { sortOrder: index },
      }),
    ),
  );

  return listPomodoroActivities(userId);
}

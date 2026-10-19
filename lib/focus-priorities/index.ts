import { ensureAutoFocusPriorityTasksForToday } from "@/lib/focus-priorities/auto-add";
import {
  CANONICAL_FOCUS_PRIORITY_SEEDS,
  MAX_FOCUS_PRIORITIES_PER_USER,
  MAX_FOCUS_PRIORITY_DESCRIPTION_LENGTH,
  MAX_FOCUS_PRIORITY_TASK_TITLE_LENGTH,
  MAX_FOCUS_PRIORITY_TITLE_LENGTH,
  defaultSuggestedTaskTitle,
  planFocusPriorityConsolidation,
  type FocusPrioritySeed,
} from "@/lib/focus-priorities/constants";
import type {
  FocusPriorityTaskDraftInput,
  FocusPriorityWriteInput,
  SerializedFocusPriority,
} from "@/lib/focus-priorities/types";
import { getTodayDateString, parseDateString } from "@/lib/dates";
import { ensureDefaultLifeAreas } from "@/lib/life-areas";
import { createPlanItem, getOrCreateDayPlan } from "@/lib/plans";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/roles";
import { getUserTimezone } from "@/lib/user-timezone";

export class FocusPriorityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FocusPriorityError";
  }
}

export class FocusPriorityAuthError extends FocusPriorityError {
  constructor(message = "Not authorized.") {
    super(message);
    this.name = "FocusPriorityAuthError";
  }
}

type FocusPriorityRow = {
  id: string;
  lifeAreaId: string;
  title: string;
  description: string | null;
  suggestedTaskTitle: string;
  defaultDurationMinutes: number | null;
  subtopics: string[];
  autoAddToDailyPlan: boolean;
  sortOrder: number;
  archivedAt: Date | null;
  lifeArea: { name: string };
};

export function assertFocusPrioritiesAdminAccess(
  role: string | null | undefined,
): void {
  if (!isAdmin(role)) {
    throw new FocusPriorityAuthError();
  }
}

function sanitizeTitle(value: string): string {
  const title = value.trim().replace(/\s+/g, " ");
  if (!title) {
    throw new FocusPriorityError("Priority name is required.");
  }
  return title.slice(0, MAX_FOCUS_PRIORITY_TITLE_LENGTH);
}

function sanitizeDescription(value: string | null | undefined): string | null {
  const trimmed = value?.trim().replace(/\s+/g, " ") ?? "";
  if (!trimmed) {
    return null;
  }
  return trimmed.slice(0, MAX_FOCUS_PRIORITY_DESCRIPTION_LENGTH);
}

function sanitizeSuggestedTaskTitle(
  value: string | null | undefined,
  fallbackTitle: string,
): string {
  const trimmed = value?.trim().replace(/\s+/g, " ") ?? "";
  if (trimmed) {
    return trimmed.slice(0, MAX_FOCUS_PRIORITY_TASK_TITLE_LENGTH);
  }
  const fallback = defaultSuggestedTaskTitle(fallbackTitle);
  if (!fallback) {
    throw new FocusPriorityError("Suggested task title is required.");
  }
  return fallback.slice(0, MAX_FOCUS_PRIORITY_TASK_TITLE_LENGTH);
}

function sanitizeDuration(
  value: number | null | undefined,
): number | null {
  if (value == null || Number.isNaN(value)) {
    return null;
  }
  const minutes = Math.round(value);
  if (minutes < 1 || minutes > 24 * 60) {
    throw new FocusPriorityError("Duration must be between 1 and 1440 minutes.");
  }
  return minutes;
}

function sanitizeSubtopics(value: string[] | null | undefined): string[] {
  if (!value?.length) {
    return [];
  }
  return value
    .map((entry) => entry.trim().replace(/\s+/g, " "))
    .filter(Boolean)
    .slice(0, 12);
}

function serializePriority(row: FocusPriorityRow): SerializedFocusPriority {
  return {
    id: row.id,
    lifeAreaId: row.lifeAreaId,
    lifeAreaName: row.lifeArea.name,
    title: row.title,
    description: row.description,
    suggestedTaskTitle: row.suggestedTaskTitle,
    defaultDurationMinutes: row.defaultDurationMinutes,
    subtopics: row.subtopics ?? [],
    autoAddToDailyPlan: Boolean(row.autoAddToDailyPlan),
    sortOrder: row.sortOrder,
    archivedAt: row.archivedAt?.toISOString() ?? null,
  };
}

const priorityInclude = {
  lifeArea: { select: { name: true } },
} as const;

async function requireOwnedLifeArea(userId: string, lifeAreaId: string) {
  const area = await prisma.lifeArea.findFirst({
    where: { id: lifeAreaId, userId },
    select: { id: true, name: true, archivedAt: true },
  });
  if (!area) {
    throw new FocusPriorityError("Life Area not found.");
  }
  return area;
}

async function requireOwnedPriority(userId: string, priorityId: string) {
  const row = await prisma.focusPriority.findFirst({
    where: { id: priorityId, userId },
    include: priorityInclude,
  });
  if (!row) {
    throw new FocusPriorityError("Focus Priority not found.");
  }
  return row;
}

export async function listFocusPriorities(
  userId: string,
  options?: { includeArchived?: boolean },
): Promise<SerializedFocusPriority[]> {
  const rows = await prisma.focusPriority.findMany({
    where: {
      userId,
      ...(options?.includeArchived ? {} : { archivedAt: null }),
    },
    include: priorityInclude,
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return rows.map(serializePriority);
}

export async function listActiveFocusPrioritiesForView(
  userId: string,
): Promise<SerializedFocusPriority[]> {
  const rows = await prisma.focusPriority.findMany({
    where: {
      userId,
      archivedAt: null,
      lifeArea: { archivedAt: null },
    },
    include: priorityInclude,
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return rows.map(serializePriority);
}

export async function loadFocusPrioritiesForAdminUser(
  userId: string,
  role: string | null | undefined,
): Promise<SerializedFocusPriority[]> {
  if (!isAdmin(role)) {
    return [];
  }
  await ensureDefaultFocusPriorities(userId);
  await ensureAutoFocusPriorityTasksForToday(userId);
  return listActiveFocusPrioritiesForView(userId);
}

function seedCreateData(
  userId: string,
  lifeAreaId: string,
  seed: FocusPrioritySeed,
  sortOrder: number,
) {
  return {
    userId,
    lifeAreaId,
    title: seed.title,
    description: seed.description,
    suggestedTaskTitle: seed.suggestedTaskTitle,
    defaultDurationMinutes: seed.defaultDurationMinutes,
    subtopics: [...seed.subtopics],
    autoAddToDailyPlan: seed.autoAddToDailyPlan,
    sortOrder,
    archivedAt: seed.archived ? new Date() : null,
  };
}

/**
 * Idempotent seed + consolidate for ADMIN users:
 * - Creates canonical priorities when missing
 * - Removes only exact legacy default rows (title + suggested task)
 * - Syncs uncustomized canonical rows
 * - Leaves customized / ambiguous rows alone
 */
export async function ensureDefaultFocusPriorities(
  userId: string,
): Promise<SerializedFocusPriority[]> {
  const areas = await ensureDefaultLifeAreas(userId);
  const areaByName = new Map(
    areas.filter((area) => !area.archivedAt).map((area) => [area.name, area]),
  );

  const existing = await prisma.focusPriority.findMany({
    where: { userId },
    select: {
      id: true,
      title: true,
      suggestedTaskTitle: true,
      lifeAreaId: true,
    },
  });

  const plan = planFocusPriorityConsolidation(existing);

  if (plan.ambiguous.length > 0 && process.env.NODE_ENV === "development") {
    console.info("[focus-priorities] ambiguous rows left unchanged", {
      userId,
      ambiguous: plan.ambiguous,
    });
  }

  if (plan.deleteIds.length > 0) {
    await prisma.focusPriority.deleteMany({
      where: { userId, id: { in: plan.deleteIds } },
    });
  }

  const afterDelete = await prisma.focusPriority.findMany({
    where: { userId },
    select: { id: true, title: true, sortOrder: true },
  });
  const titles = new Set(afterDelete.map((row) => row.title));
  let nextSort =
    afterDelete.reduce((max, row) => Math.max(max, row.sortOrder), -1) + 1;

  for (const seed of plan.createSeeds) {
    if (titles.has(seed.title)) {
      continue;
    }
    const area = areaByName.get(seed.lifeAreaName);
    if (!area) {
      continue;
    }
    await prisma.focusPriority.create({
      data: seedCreateData(userId, area.id, seed, nextSort),
    });
    titles.add(seed.title);
    nextSort += 1;
  }

  for (const id of plan.syncIds) {
    const row = existing.find((entry) => entry.id === id);
    if (!row) {
      continue;
    }
    const seed = CANONICAL_FOCUS_PRIORITY_SEEDS.find(
      (entry) => entry.title === row.title,
    );
    if (!seed) {
      continue;
    }
    const area = areaByName.get(seed.lifeAreaName);
    if (!area) {
      continue;
    }
    await prisma.focusPriority.update({
      where: { id },
      data: {
        description: seed.description,
        suggestedTaskTitle: seed.suggestedTaskTitle,
        defaultDurationMinutes: seed.defaultDurationMinutes,
        subtopics: [...seed.subtopics],
        lifeAreaId: area.id,
        // Intentionally does not re-archive restored priorities (e.g. Portfolio Polish).
        // Intentionally does not overwrite autoAddToDailyPlan — user preference.
      },
    });
  }

  return listFocusPriorities(userId, { includeArchived: true });
}

export async function createFocusPriority(
  userId: string,
  input: FocusPriorityWriteInput,
): Promise<SerializedFocusPriority> {
  await ensureDefaultFocusPriorities(userId);
  const title = sanitizeTitle(input.title);
  const description = sanitizeDescription(input.description);
  const suggestedTaskTitle = sanitizeSuggestedTaskTitle(
    input.suggestedTaskTitle,
    title,
  );
  const defaultDurationMinutes = sanitizeDuration(input.defaultDurationMinutes);
  const subtopics = sanitizeSubtopics(input.subtopics);
  const autoAddToDailyPlan = Boolean(input.autoAddToDailyPlan);
  await requireOwnedLifeArea(userId, input.lifeAreaId);

  const count = await prisma.focusPriority.count({ where: { userId } });
  if (count >= MAX_FOCUS_PRIORITIES_PER_USER) {
    throw new FocusPriorityError(
      `You can save up to ${MAX_FOCUS_PRIORITIES_PER_USER} Focus Priorities.`,
    );
  }

  const last = await prisma.focusPriority.findFirst({
    where: { userId, archivedAt: null },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });

  const row = await prisma.focusPriority.create({
    data: {
      userId,
      lifeAreaId: input.lifeAreaId,
      title,
      description,
      suggestedTaskTitle,
      defaultDurationMinutes,
      subtopics,
      autoAddToDailyPlan,
      sortOrder: last ? last.sortOrder + 1 : 0,
    },
    include: priorityInclude,
  });

  return serializePriority(row);
}

export async function updateFocusPriority(
  userId: string,
  priorityId: string,
  input: FocusPriorityWriteInput,
): Promise<SerializedFocusPriority> {
  await requireOwnedPriority(userId, priorityId);
  const title = sanitizeTitle(input.title);
  const description = sanitizeDescription(input.description);
  const suggestedTaskTitle = sanitizeSuggestedTaskTitle(
    input.suggestedTaskTitle,
    title,
  );
  const defaultDurationMinutes = sanitizeDuration(input.defaultDurationMinutes);
  const subtopics = sanitizeSubtopics(input.subtopics);
  const autoAddToDailyPlan = Boolean(input.autoAddToDailyPlan);
  await requireOwnedLifeArea(userId, input.lifeAreaId);

  // Updates only FocusPriority rows — never PlanItem / task history.
  const row = await prisma.focusPriority.update({
    where: { id: priorityId },
    data: {
      title,
      description,
      suggestedTaskTitle,
      defaultDurationMinutes,
      subtopics,
      autoAddToDailyPlan,
      lifeAreaId: input.lifeAreaId,
    },
    include: priorityInclude,
  });

  return serializePriority(row);
}

export async function archiveFocusPriority(
  userId: string,
  priorityId: string,
): Promise<SerializedFocusPriority> {
  await requireOwnedPriority(userId, priorityId);
  const row = await prisma.focusPriority.update({
    where: { id: priorityId },
    data: { archivedAt: new Date() },
    include: priorityInclude,
  });
  return serializePriority(row);
}

export async function restoreFocusPriority(
  userId: string,
  priorityId: string,
): Promise<SerializedFocusPriority> {
  await requireOwnedPriority(userId, priorityId);
  const row = await prisma.focusPriority.update({
    where: { id: priorityId },
    data: { archivedAt: null },
    include: priorityInclude,
  });
  return serializePriority(row);
}

export async function reorderFocusPriorities(
  userId: string,
  orderedIds: string[],
): Promise<SerializedFocusPriority[]> {
  const active = await prisma.focusPriority.findMany({
    where: { userId, archivedAt: null },
    select: { id: true },
  });
  const activeIds = new Set(active.map((row) => row.id));

  if (
    orderedIds.length !== activeIds.size ||
    orderedIds.some((id) => !activeIds.has(id))
  ) {
    throw new FocusPriorityError("Invalid Focus Priority order.");
  }

  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.focusPriority.update({
        where: { id },
        data: { sortOrder: index },
      }),
    ),
  );

  return listFocusPriorities(userId, { includeArchived: true });
}

export type AddFocusPriorityToTodayResult = {
  planId: string;
  itemId: string;
  created: boolean;
  /** YYYY-MM-DD in the user's Planlet timezone. */
  dayDate: string;
};

/**
 * Resolves today's calendar date for Daily Plan writes using the user's timezone.
 */
export async function resolveUserTodayDateString(
  userId: string,
  now = new Date(),
): Promise<string> {
  const timezone = await getUserTimezone(userId);
  return getTodayDateString(timezone, now);
}

/**
 * Confirms an edited task draft onto today's day plan.
 * Does not create duplicates when a same-titled root task already exists today.
 */
export async function confirmFocusPriorityTaskDraft(
  userId: string,
  input: FocusPriorityTaskDraftInput,
): Promise<AddFocusPriorityToTodayResult> {
  const priority = await prisma.focusPriority.findFirst({
    where: { id: input.priorityId, userId, archivedAt: null },
    select: {
      id: true,
      lifeAreaId: true,
      lifeArea: { select: { archivedAt: true } },
    },
  });

  if (!priority || priority.lifeArea.archivedAt) {
    throw new FocusPriorityError("Focus Priority not found.");
  }

  const title = sanitizeSuggestedTaskTitle(input.title, "Task");
  const durationMinutes = sanitizeDuration(input.durationMinutes);
  const primaryLifeAreaId =
    input.primaryLifeAreaId?.trim() || priority.lifeAreaId;
  await requireOwnedLifeArea(userId, primaryLifeAreaId);

  const dayDate = await resolveUserTodayDateString(userId);
  const plan = await getOrCreateDayPlan(userId, parseDateString(dayDate));
  const existing = await prisma.planItem.findFirst({
    where: {
      planId: plan.id,
      parentItemId: null,
      title: {
        equals: title,
        mode: "insensitive",
      },
    },
    select: { id: true },
  });

  if (existing) {
    return {
      planId: plan.id,
      itemId: existing.id,
      created: false,
      dayDate,
    };
  }

  const item = await createPlanItem({
    userId,
    planId: plan.id,
    title,
    type: "TASK",
    durationMinutes: durationMinutes ?? undefined,
    primaryLifeAreaId,
  });

  return {
    planId: plan.id,
    itemId: item.id,
    created: true,
    dayDate,
  };
}
/** @deprecated Prefer confirmFocusPriorityTaskDraft with an edited draft. */
export async function addFocusPriorityToToday(
  userId: string,
  priorityId: string,
): Promise<AddFocusPriorityToTodayResult> {
  const priority = await prisma.focusPriority.findFirst({
    where: { id: priorityId, userId, archivedAt: null },
    select: {
      suggestedTaskTitle: true,
      defaultDurationMinutes: true,
      lifeAreaId: true,
    },
  });
  if (!priority) {
    throw new FocusPriorityError("Focus Priority not found.");
  }
  return confirmFocusPriorityTaskDraft(userId, {
    priorityId,
    title: priority.suggestedTaskTitle,
    durationMinutes: priority.defaultDurationMinutes,
    primaryLifeAreaId: priority.lifeAreaId,
  });
}

export { groupFocusPrioritiesByLifeArea } from "@/lib/focus-priorities/group";

export {
  decideAutoAddPlacement,
  ensureAutoFocusPriorityTasksForToday,
} from "@/lib/focus-priorities/auto-add";

export type {
  FocusPriorityTaskDraftInput,
  FocusPriorityWriteInput,
  SerializedFocusPriority,
} from "@/lib/focus-priorities/types";

export {
  CANONICAL_FOCUS_PRIORITY_SEEDS,
  DEFAULT_FOCUS_PRIORITY_SEEDS,
  LEGACY_FOCUS_PRIORITY_DEFAULTS,
  MAX_FOCUS_PRIORITIES_PER_USER,
  MAX_FOCUS_PRIORITY_DESCRIPTION_LENGTH,
  MAX_FOCUS_PRIORITY_TASK_TITLE_LENGTH,
  MAX_FOCUS_PRIORITY_TITLE_LENGTH,
  defaultSuggestedTaskTitle,
  formatSubtopicsInput,
  isExactLegacyFocusPriorityDefault,
  parseSubtopicsInput,
  planFocusPriorityConsolidation,
} from "@/lib/focus-priorities/constants";

"use server";

import type {
  KudosType,
  PlanItemType,
  PlanType,
  ShareExportFormat,
} from "@/app/generated/prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { parsePlanFromText } from "@/lib/ai/parse-plan";
import {
  saveParsedPlanSchema,
  type ParsedPlan,
  type ParsedPlanItem,
  type SaveParsedPlanInput,
} from "@/lib/ai/plan-parser-schema";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { APP_TIMEZONE } from "@/config/time";
import {
  formatDateString,
  formatDayPlanTitle,
  formatWeekPlanTitle,
  formatWeekStartString,
  getDateRangeForPlanType,
  getMonthRange,
  getTodayRange,
  getWeekRange,
  getYearRange,
  isValidDateString,
  parseDateString,
} from "@/lib/dates";
import {
  createPlan,
  createPlanItem,
  deletePlanItem,
  getDayPlan,
  getOrCreateDayPlan,
  getOrCreateWeekPlan,
  getTodayPlan,
  getWeekPlan,
  reorderPlanItems,
  updatePlanItem,
  updatePlanItemStatus,
  type UpdatePlanItemInput,
} from "@/lib/plans";
import { KudosError, sendPlanKudos } from "@/lib/kudos";
import {
  getPlanAccess,
  removePlanShare,
  sharePlanWithUser,
} from "@/lib/plan-sharing";
import { prisma } from "@/lib/prisma";

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
  return session.user.id;
}

function revalidatePlanPaths(
  planId: string,
  options?: { dayDate?: string; weekDate?: string },
) {
  revalidatePath("/today");
  revalidatePath("/plans");
  revalidatePath("/dashboard");
  revalidatePath(`/plans/${planId}`);
  if (options?.dayDate) {
    revalidatePath(`/plans/day/${options.dayDate}`);
  }
  if (options?.weekDate) {
    revalidatePath(`/plans/week/${options.weekDate}`);
  }
}

function parseActionDateString(dateString: string): Date {
  if (!isValidDateString(dateString)) {
    throw new Error("Invalid date format. Use YYYY-MM-DD.");
  }

  return parseDateString(dateString);
}

export async function createTodayPlanAction() {
  const userId = await requireUserId();
  await getOrCreateDayPlan(userId, new Date());
  revalidatePath("/today");
  revalidatePath("/plans");
}

export async function createDayPlanForDateAction(dateString: string) {
  const userId = await requireUserId();
  const date = parseActionDateString(dateString);
  const plan = await getOrCreateDayPlan(userId, date);

  revalidatePlanPaths(plan.id, { dayDate: dateString });
  redirect(`/plans/day/${dateString}`);
}

export async function createWeekPlanForDateAction(dateString: string) {
  const userId = await requireUserId();
  const date = parseActionDateString(dateString);
  const weekStart = formatWeekStartString(date);
  const plan = await getOrCreateWeekPlan(userId, date);

  revalidatePlanPaths(plan.id, { weekDate: weekStart });
  redirect(`/plans/week/${weekStart}`);
}

export async function dayPlanExistsAction(dateString: string): Promise<boolean> {
  const userId = await requireUserId();

  if (!isValidDateString(dateString)) {
    return false;
  }

  const plan = await getDayPlan(userId, parseDateString(dateString));
  return Boolean(plan);
}

export async function weekPlanExistsAction(dateString: string): Promise<boolean> {
  const userId = await requireUserId();

  if (!isValidDateString(dateString)) {
    return false;
  }

  const plan = await getWeekPlan(userId, parseDateString(dateString));
  return Boolean(plan);
}

export async function createPlanAction(type: PlanType) {
  const userId = await requireUserId();
  const now = new Date();

  let title: string;
  let dateStart: Date;
  let dateEnd: Date;

  switch (type) {
    case "DAY": {
      const existing = await getTodayPlan(userId);
      if (existing) {
        redirect(`/plans/${existing.id}`);
      }
      const range = getTodayRange(now);
      dateStart = range.start;
      dateEnd = range.end;
      title = "Today's plan";
      break;
    }
    case "MONTH": {
      const range = getMonthRange(now);
      dateStart = range.start;
      dateEnd = range.end;
      title = `Plan for ${now.toLocaleString("en", { month: "long", year: "numeric", timeZone: APP_TIMEZONE })}`;
      break;
    }
    case "YEAR": {
      const range = getYearRange(now);
      dateStart = range.start;
      dateEnd = range.end;
      title = `Plan for ${new Intl.DateTimeFormat("en", { year: "numeric", timeZone: APP_TIMEZONE }).format(now)}`;
      break;
    }
    case "WEEK": {
      const existingWeek = await getWeekPlan(userId, now);
      if (existingWeek) {
        redirect(`/plans/week/${formatWeekStartString(now)}`);
      }
      const range = getWeekRange(now);
      dateStart = range.start;
      dateEnd = range.end;
      title = formatWeekPlanTitle(now);
      break;
    }
    default: {
      const range = getTodayRange(now);
      dateStart = range.start;
      dateEnd = range.end;
      title = "New plan";
    }
  }

  const plan = await createPlan({
    userId,
    type,
    title,
    dateStart,
    dateEnd,
    language: "UNKNOWN",
  });

  revalidatePath("/plans");
  if (type === "WEEK") {
    redirect(`/plans/week/${formatWeekStartString(now)}`);
  }
  redirect(`/plans/${plan.id}`);
}

export async function createPlanItemAction(input: {
  planId: string;
  title: string;
  parentItemId?: string;
  type?: PlanItemType;
}) {
  const userId = await requireUserId();
  const title = input.title.trim();

  if (!title) {
    throw new Error("Title is required");
  }

  await createPlanItem({
    userId,
    planId: input.planId,
    title,
    parentItemId: input.parentItemId,
    type: input.type,
  });

  revalidatePlanPaths(input.planId);
}

export async function updatePlanItemAction(
  input: Omit<UpdatePlanItemInput, "userId"> & { planId: string },
) {
  const userId = await requireUserId();
  const { planId, ...itemInput } = input;

  await updatePlanItem({
    userId,
    ...itemInput,
  });

  revalidatePlanPaths(planId);
}

export async function updatePlanItemStatusAction(input: {
  planId: string;
  itemId: string;
  status: UpdatePlanItemInput["status"];
}) {
  const userId = await requireUserId();

  if (!input.status) {
    throw new Error("Status is required");
  }

  await updatePlanItemStatus({
    userId,
    itemId: input.itemId,
    status: input.status,
  });

  revalidatePlanPaths(input.planId);
}

export async function deletePlanItemAction(planId: string, itemId: string) {
  const userId = await requireUserId();

  await deletePlanItem(itemId, userId);
  revalidatePlanPaths(planId);
}

export async function reorderPlanItemsAction(
  planId: string,
  orderedItemIds: string[],
): Promise<ShareActionResult> {
  const userId = await requireUserId();

  try {
    await reorderPlanItems(planId, userId, orderedItemIds);
    revalidatePlanPaths(planId);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to reorder items.",
    };
  }
}

export type ParsePlanTextResult =
  | { success: true; draft: ParsedPlan }
  | { success: false; error: string };

export async function parsePlanTextAction(
  rawText: string,
): Promise<ParsePlanTextResult> {
  await requireUserId();

  const trimmed = rawText.trim();

  if (!trimmed) {
    return { success: false, error: "Please enter some text to structure." };
  }

  try {
    const draft = await parsePlanFromText({ text: trimmed });
    return { success: true, draft };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to structure plan.";
    return { success: false, error: message };
  }
}

function formatAiParseTimestamp(now = new Date()): string {
  return format(toZonedTime(now, APP_TIMEZONE), "yyyy-MM-dd HH:mm");
}

function mergeRawInput(existing: string | null | undefined, newInput: string): string {
  const trimmedExisting = existing?.trim();
  if (!trimmedExisting) {
    return newInput;
  }

  return `${trimmedExisting}\n\n--- Added from AI parse at ${formatAiParseTimestamp()} ---\n\n${newInput}`;
}

async function appendParsedItemsToPlan(
  userId: string,
  planId: string,
  items: ParsedPlanItem[],
  startSortOrder: number,
) {
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const created = await createPlanItem({
      userId,
      planId,
      title: item.title.trim(),
      description: item.description?.trim(),
      type: item.type,
      timeHint: item.timeHint,
      importance: item.importance,
      urgency: item.urgency,
      durationMinutes: item.durationMinutes,
      shareable: item.shareable ?? true,
      sortOrder: startSortOrder + i,
    });

    if (item.subtasks?.length) {
      for (let j = 0; j < item.subtasks.length; j++) {
        const subtask = item.subtasks[j];
        await createPlanItem({
          userId,
          planId,
          parentItemId: created.id,
          title: subtask.title.trim(),
          type: subtask.type ?? "TASK",
          sortOrder: j,
        });
      }
    }
  }
}

export async function saveParsedPlanAction(input: unknown) {
  const userId = await requireUserId();
  const parsed = saveParsedPlanSchema.safeParse(input);

  if (!parsed.success) {
    throw new Error("Invalid plan data. Please review and try again.");
  }

  const data: SaveParsedPlanInput = parsed.data;
  const referenceDate =
    (data.planType === "DAY" || data.planType === "WEEK") && data.planDate
      ? parseDateString(data.planDate)
      : new Date();
  const { start, end } = getDateRangeForPlanType(data.planType, referenceDate);

  if (data.planType === "WEEK") {
    const existing = await getWeekPlan(userId, referenceDate);

    if (existing) {
      const rootItemCount = await prisma.planItem.count({
        where: { planId: existing.id, parentItemId: null },
      });

      await prisma.plan.update({
        where: { id: existing.id },
        data: {
          rawInput: mergeRawInput(existing.rawInput, data.rawInput),
          ...(!existing.summary?.trim() && data.summary?.trim()
            ? { summary: data.summary.trim() }
            : {}),
        },
      });

      await appendParsedItemsToPlan(
        userId,
        existing.id,
        data.items,
        rootItemCount,
      );

      revalidatePath("/plans");
      revalidatePath(`/plans/week/${formatWeekStartString(referenceDate)}`);
      redirect(`/plans/${existing.id}`);
    }
  }

  if (data.planType === "DAY") {
    const existing = await getDayPlan(userId, referenceDate);

    if (existing) {
      const rootItemCount = await prisma.planItem.count({
        where: { planId: existing.id, parentItemId: null },
      });

      await prisma.plan.update({
        where: { id: existing.id },
        data: {
          rawInput: mergeRawInput(existing.rawInput, data.rawInput),
          ...(!existing.summary?.trim() && data.summary?.trim()
            ? { summary: data.summary.trim() }
            : {}),
        },
      });

      await appendParsedItemsToPlan(
        userId,
        existing.id,
        data.items,
        rootItemCount,
      );

      revalidatePath("/plans");
      revalidatePath("/today");
      revalidatePath(
        `/plans/day/${data.planDate ?? formatDateString(referenceDate)}`,
      );
      redirect(`/plans/${existing.id}`);
    }
  }

  const plan = await createPlan({
    userId,
    type: data.planType,
    title:
      data.planType === "DAY"
        ? data.title.trim() || formatDayPlanTitle(referenceDate)
        : data.planType === "WEEK"
          ? data.title.trim() || formatWeekPlanTitle(referenceDate)
          : data.title.trim(),
    dateStart: start,
    dateEnd: end,
    rawInput: data.rawInput,
    summary: data.summary?.trim() || undefined,
    language: data.language,
  });

  await appendParsedItemsToPlan(userId, plan.id, data.items, 0);

  revalidatePath("/plans");
  revalidatePath("/today");
  if (data.planType === "DAY") {
    revalidatePath(
      `/plans/day/${data.planDate ?? formatDateString(referenceDate)}`,
    );
  }
  if (data.planType === "WEEK") {
    revalidatePath(`/plans/week/${formatWeekStartString(referenceDate)}`);
  }
  redirect(`/plans/${plan.id}`);
}

export type ShareActionResult =
  | { success: true }
  | { success: false; error: string };

export async function sharePlanWithUserAction(
  planId: string,
  targetEmail: string,
): Promise<ShareActionResult> {
  const userId = await requireUserId();

  try {
    await sharePlanWithUser(planId, userId, targetEmail);
    revalidatePlanPaths(planId);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to share plan.",
    };
  }
}

function revalidateNotificationSurfaces() {
  revalidatePath("/today", "layout");
  revalidatePath("/plans", "layout");
  revalidatePath("/insights", "layout");
  revalidatePath("/settings", "layout");
  revalidatePath("/dashboard", "layout");
}

export type KudosActionResult =
  | { success: true }
  | { success: false; error: string };

export async function sendPlanKudosAction(
  planId: string,
  type: KudosType,
): Promise<KudosActionResult> {
  const userId = await requireUserId();

  try {
    await sendPlanKudos(planId, userId, type);
    revalidatePlanPaths(planId);
    revalidateNotificationSurfaces();
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof KudosError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Failed to send kudos.",
    };
  }
}

export async function removePlanShareAction(
  planShareId: string,
): Promise<ShareActionResult> {
  const userId = await requireUserId();

  try {
    const planId = await removePlanShare(planShareId, userId);
    revalidatePlanPaths(planId);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to remove sharing.",
    };
  }
}

export async function createShareExportAction(
  planId: string,
  format: ShareExportFormat,
  content: string,
) {
  const userId = await requireUserId();
  const trimmed = content.trim();

  if (!trimmed) {
    throw new Error("Share content is empty");
  }

  const access = await getPlanAccess(planId, userId);

  if (!access) {
    throw new Error("Plan not found");
  }

  await prisma.shareExport.create({
    data: {
      planId,
      format,
      content: trimmed,
    },
  });

  revalidatePlanPaths(planId);
}

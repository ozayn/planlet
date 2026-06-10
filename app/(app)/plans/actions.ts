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
  deletePlan,
  deletePlanItem,
  getDayPlan,
  getMonthPlan,
  getOrCreateDayPlan,
  getOrCreateWeekPlan,
  getTodayPlan,
  getWeekPlan,
  getYearPlan,
  movePlanItem,
  reorderPlanItems,
  PlanError,
  updatePlanItem,
  updatePlanItemStatus,
  updatePlanTitle,
  type UpdatePlanItemInput,
} from "@/lib/plans";
import {
  addItemComment,
  deleteItemComment,
  getCommentsForItem,
  ItemCommentError,
  viewerCanDeleteComment,
} from "@/lib/item-comments";
import type { ObservationCategory } from "@/app/generated/prisma/client";
import {
  addPlanGratitude,
  deletePlanGratitude,
  GratitudeError,
  updatePlanGratitude,
  type SerializedGratitude,
} from "@/lib/gratitude";
import {
  addPlanObservation,
  deletePlanObservation,
  ObservationError,
  updatePlanObservation,
  type SerializedObservation,
} from "@/lib/observations";
import { KudosError, sendPlanKudos } from "@/lib/kudos";
import {
  buildDefaultPlanTitle,
  resolvePlanTitle,
} from "@/lib/plan-titles";
import {
  getPlanAccess,
  removePlanShare,
  sharePlanWithUser,
} from "@/lib/plan-sharing";
import { prisma } from "@/lib/prisma";
import { touchUserSeenSafely } from "@/lib/user-activity";

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
  return session.user.id;
}

async function recordUserActivity(userId: string) {
  await touchUserSeenSafely(userId);
}

function revalidatePlanPaths(
  planId: string,
  options?: { dayDate?: string; weekDate?: string },
) {
  revalidatePath("/today");
  revalidatePath("/plans");
  revalidatePath("/dashboard");
  revalidatePath("/insights");
  revalidatePath(`/plans/${planId}`);
  if (options?.dayDate) {
    revalidatePath(`/plans/day/${options.dayDate}`);
  }
  if (options?.weekDate) {
    revalidatePath(`/plans/week/${options.weekDate}`);
  }
}

function revalidateAfterPlanDelete(plan: {
  id: string;
  type: PlanType;
  dateStart: Date;
}) {
  revalidatePlanPaths(plan.id, {
    dayDate:
      plan.type === "DAY" ? formatDateString(plan.dateStart) : undefined,
    weekDate:
      plan.type === "WEEK"
        ? formatWeekStartString(plan.dateStart)
        : undefined,
  });
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
  await recordUserActivity(userId);
  revalidatePath("/today");
  revalidatePath("/plans");
}

export async function createDayPlanForDateAction(dateString: string) {
  const userId = await requireUserId();
  const date = parseActionDateString(dateString);
  const plan = await getOrCreateDayPlan(userId, date);

  await recordUserActivity(userId);
  revalidatePlanPaths(plan.id, { dayDate: dateString });
  redirect(`/plans/day/${dateString}`);
}

export async function createWeekPlanForDateAction(dateString: string) {
  const userId = await requireUserId();
  const date = parseActionDateString(dateString);
  const weekStart = formatWeekStartString(date);
  const plan = await getOrCreateWeekPlan(userId, date);

  await recordUserActivity(userId);
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

export async function monthPlanExistsAction(dateString: string): Promise<boolean> {
  const userId = await requireUserId();

  if (!isValidDateString(dateString)) {
    return false;
  }

  const plan = await getMonthPlan(userId, parseDateString(dateString));
  return Boolean(plan);
}

export async function yearPlanExistsAction(dateString: string): Promise<boolean> {
  const userId = await requireUserId();

  if (!isValidDateString(dateString)) {
    return false;
  }

  const plan = await getYearPlan(userId, parseDateString(dateString));
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
      title = buildDefaultPlanTitle({
        type: "DAY",
        dateStart: range.start,
        dateEnd: range.end,
      });
      break;
    }
    case "MONTH": {
      const range = getMonthRange(now);
      dateStart = range.start;
      dateEnd = range.end;
      title = buildDefaultPlanTitle({
        type: "MONTH",
        dateStart: range.start,
        dateEnd: range.end,
      });
      break;
    }
    case "YEAR": {
      const range = getYearRange(now);
      dateStart = range.start;
      dateEnd = range.end;
      title = buildDefaultPlanTitle({
        type: "YEAR",
        dateStart: range.start,
        dateEnd: range.end,
      });
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
      title = buildDefaultPlanTitle({
        type: "WEEK",
        dateStart: range.start,
        dateEnd: range.end,
      });
      break;
    }
    default: {
      const range = getTodayRange(now);
      dateStart = range.start;
      dateEnd = range.end;
      title = buildDefaultPlanTitle({
        type: "DAY",
        dateStart: range.start,
        dateEnd: range.end,
      });
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

  await recordUserActivity(userId);
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

  await recordUserActivity(userId);
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

  await recordUserActivity(userId);
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

  await recordUserActivity(userId);
  revalidatePlanPaths(input.planId);
}

export async function deletePlanItemAction(planId: string, itemId: string) {
  const userId = await requireUserId();

  await deletePlanItem(itemId, userId);
  await recordUserActivity(userId);
  revalidatePlanPaths(planId);
}

export type DeletePlanResult =
  | { success: true }
  | { success: false; error: string };

export async function deletePlanAction(
  planId: string,
  options?: { redirectTo?: string },
): Promise<DeletePlanResult> {
  const userId = await requireUserId();
  let plan;

  try {
    plan = await deletePlan(planId, userId);
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to delete plan.",
    };
  }

  await recordUserActivity(userId);
  revalidateAfterPlanDelete(plan);

  if (options?.redirectTo) {
    redirect(options.redirectTo);
  }

  return { success: true };
}

export async function reorderPlanItemsAction(
  planId: string,
  orderedItemIds: string[],
): Promise<ShareActionResult> {
  const userId = await requireUserId();

  try {
    await reorderPlanItems(planId, userId, orderedItemIds);
    await recordUserActivity(userId);
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

export async function movePlanItemAction(
  planId: string,
  itemId: string,
  direction: "up" | "down",
): Promise<ShareActionResult> {
  const userId = await requireUserId();

  try {
    await movePlanItem(planId, userId, itemId, direction);
    await recordUserActivity(userId);
    revalidatePlanPaths(planId);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to move item.",
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
      status: item.status,
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
  const referenceDate = data.planDate
    ? parseDateString(data.planDate)
    : new Date();
  const { start, end } = getDateRangeForPlanType(data.planType, referenceDate);

  if (data.planType === "YEAR") {
    const existing = await getYearPlan(userId, referenceDate);

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

      await recordUserActivity(userId);
      revalidatePath("/plans");
      redirect(`/plans/${existing.id}`);
    }
  }

  if (data.planType === "MONTH") {
    const existing = await getMonthPlan(userId, referenceDate);

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

      await recordUserActivity(userId);
      revalidatePath("/plans");
      redirect(`/plans/${existing.id}`);
    }
  }

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
      await recordUserActivity(userId);
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
      await recordUserActivity(userId);
      redirect(`/plans/${existing.id}`);
    }
  }

  const plan = await createPlan({
    userId,
    type: data.planType,
    title: resolvePlanTitle(data.title, data.planType, start, end),
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
  await recordUserActivity(userId);
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
    await recordUserActivity(userId);
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
    await recordUserActivity(userId);
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
    await recordUserActivity(userId);
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

export type SerializedItemComment = {
  id: string;
  body: string;
  createdAt: string;
  author: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  };
  canDelete: boolean;
};

export type ItemCommentsResult =
  | { success: true; comments: SerializedItemComment[] }
  | { success: false; error: string };

export async function getItemCommentsAction(
  itemId: string,
): Promise<ItemCommentsResult> {
  const userId = await requireUserId();

  try {
    const comments = await getCommentsForItem(itemId, userId);
    const item = await prisma.planItem.findFirst({
      where: { id: itemId },
      select: { plan: { select: { userId: true } } },
    });

    if (!item) {
      return { success: false, error: "Item not found." };
    }

    return {
      success: true,
      comments: comments.map((comment) => ({
        id: comment.id,
        body: comment.body,
        createdAt: comment.createdAt.toISOString(),
        author: comment.author,
        canDelete: viewerCanDeleteComment(
          comment.author.id,
          userId,
          item.plan.userId,
        ),
      })),
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof ItemCommentError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Failed to load comments.",
    };
  }
}

export type ItemCommentActionResult =
  | { success: true; comment: SerializedItemComment }
  | { success: false; error: string };

export async function addItemCommentAction(
  itemId: string,
  body: string,
): Promise<ItemCommentActionResult> {
  const userId = await requireUserId();

  try {
    const result = await addItemComment(itemId, userId, body);
    const plan = await prisma.plan.findFirst({
      where: { id: result.planId },
      select: { userId: true },
    });

    await recordUserActivity(userId);
    revalidatePlanPaths(result.planId);

    return {
      success: true,
      comment: {
        id: result.comment.id,
        body: result.comment.body,
        createdAt: result.comment.createdAt.toISOString(),
        author: result.comment.author,
        canDelete: viewerCanDeleteComment(
          result.comment.author.id,
          userId,
          plan?.userId ?? userId,
        ),
      },
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof ItemCommentError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Failed to add comment.",
    };
  }
}

export type DeleteItemCommentResult =
  | { success: true }
  | { success: false; error: string };

export async function deleteItemCommentAction(
  commentId: string,
): Promise<DeleteItemCommentResult> {
  const userId = await requireUserId();

  try {
    const result = await deleteItemComment(commentId, userId);
    await recordUserActivity(userId);
    revalidatePlanPaths(result.planId);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof ItemCommentError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Failed to delete comment.",
    };
  }
}

export type UpdatePlanTitleResult =
  | { success: true; title: string }
  | { success: false; error: string };

export async function updatePlanTitleAction(
  planId: string,
  title: string,
): Promise<UpdatePlanTitleResult> {
  const userId = await requireUserId();

  try {
    const plan = await updatePlanTitle(planId, userId, title);
    await recordUserActivity(userId);
    revalidatePlanPaths(plan.id, {
      dayDate:
        plan.type === "DAY" ? formatDateString(plan.dateStart) : undefined,
      weekDate:
        plan.type === "WEEK"
          ? formatWeekStartString(plan.dateStart)
          : undefined,
    });
    return { success: true, title: plan.title };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof PlanError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Failed to update title.",
    };
  }
}

export type ObservationActionResult =
  | { success: true; observation: SerializedObservation }
  | { success: false; error: string };

export type DeleteObservationResult =
  | { success: true }
  | { success: false; error: string };

export async function addPlanObservationAction(
  planId: string,
  data: { category: ObservationCategory; body: string },
): Promise<ObservationActionResult> {
  const userId = await requireUserId();

  try {
    const result = await addPlanObservation(planId, userId, data);
    await recordUserActivity(userId);
    revalidatePlanPaths(result.planId);
    return { success: true, observation: result.observation };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof ObservationError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Failed to add observation.",
    };
  }
}

export async function updatePlanObservationAction(
  observationId: string,
  data: { category: ObservationCategory; body: string },
): Promise<ObservationActionResult> {
  const userId = await requireUserId();

  try {
    const result = await updatePlanObservation(observationId, userId, data);
    await recordUserActivity(userId);
    revalidatePlanPaths(result.planId);
    return { success: true, observation: result.observation };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof ObservationError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Failed to update observation.",
    };
  }
}

export async function deletePlanObservationAction(
  observationId: string,
): Promise<DeleteObservationResult> {
  const userId = await requireUserId();

  try {
    const result = await deletePlanObservation(observationId, userId);
    await recordUserActivity(userId);
    revalidatePlanPaths(result.planId);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof ObservationError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Failed to delete observation.",
    };
  }
}

export type GratitudeActionResult =
  | { success: true; gratitude: SerializedGratitude }
  | { success: false; error: string };

export type DeleteGratitudeResult =
  | { success: true }
  | { success: false; error: string };

export async function addPlanGratitudeAction(
  planId: string,
  body: string,
): Promise<GratitudeActionResult> {
  const userId = await requireUserId();

  try {
    const result = await addPlanGratitude(planId, userId, body);
    await recordUserActivity(userId);
    revalidatePlanPaths(result.planId);
    return { success: true, gratitude: result.gratitude };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof GratitudeError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Failed to add gratitude.",
    };
  }
}

export async function updatePlanGratitudeAction(
  gratitudeId: string,
  body: string,
): Promise<GratitudeActionResult> {
  const userId = await requireUserId();

  try {
    const result = await updatePlanGratitude(gratitudeId, userId, body);
    await recordUserActivity(userId);
    revalidatePlanPaths(result.planId);
    return { success: true, gratitude: result.gratitude };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof GratitudeError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Failed to update gratitude.",
    };
  }
}

export async function deletePlanGratitudeAction(
  gratitudeId: string,
): Promise<DeleteGratitudeResult> {
  const userId = await requireUserId();

  try {
    const result = await deletePlanGratitude(gratitudeId, userId);
    await recordUserActivity(userId);
    revalidatePlanPaths(result.planId);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof GratitudeError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Failed to delete gratitude.",
    };
  }
}

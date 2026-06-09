"use server";

import type { PlanType, ShareExportFormat } from "@/app/generated/prisma/client";
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
import { getDateRangeForPlanType, getMonthRange, getTodayRange, getYearRange } from "@/lib/dates";
import {
  createPlan,
  createPlanItem,
  deletePlanItem,
  getTodayPlan,
  updatePlanItem,
  updatePlanItemStatus,
  type UpdatePlanItemInput,
} from "@/lib/plans";
import { prisma } from "@/lib/prisma";

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
  return session.user.id;
}

function revalidatePlanPaths(planId: string) {
  revalidatePath("/today");
  revalidatePath("/plans");
  revalidatePath(`/plans/${planId}`);
}

export async function createTodayPlanAction() {
  const userId = await requireUserId();
  const existing = await getTodayPlan(userId);

  if (existing) {
    revalidatePath("/today");
    return;
  }

  const { start, end } = getTodayRange();

  await createPlan({
    userId,
    type: "DAY",
    title: "Today's plan",
    dateStart: start,
    dateEnd: end,
    language: "UNKNOWN",
  });

  revalidatePath("/today");
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
      const range = getDateRangeForPlanType("WEEK", now);
      dateStart = range.start;
      dateEnd = range.end;
      title = "Weekly plan";
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
  redirect(`/plans/${plan.id}`);
}

export async function createPlanItemAction(input: {
  planId: string;
  title: string;
  parentItemId?: string;
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
  const { start, end } = getDateRangeForPlanType(data.planType);

  if (data.planType === "DAY") {
    const existing = await getTodayPlan(userId);

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
      redirect(`/plans/${existing.id}`);
    }
  }

  const plan = await createPlan({
    userId,
    type: data.planType,
    title: data.title.trim(),
    dateStart: start,
    dateEnd: end,
    rawInput: data.rawInput,
    summary: data.summary?.trim() || undefined,
    language: data.language,
  });

  await appendParsedItemsToPlan(userId, plan.id, data.items, 0);

  revalidatePath("/plans");
  revalidatePath("/today");
  redirect(`/plans/${plan.id}`);
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

  const plan = await prisma.plan.findFirst({
    where: { id: planId, userId },
    select: { id: true },
  });

  if (!plan) {
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

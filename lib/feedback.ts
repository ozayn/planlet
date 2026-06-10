import type {
  FeedbackArea,
  FeedbackPriority,
  FeedbackStatus,
} from "@/app/generated/prisma/client";

import {
  FEEDBACK_AREAS,
  FEEDBACK_PRIORITIES,
  FEEDBACK_STATUSES,
  MAX_FEEDBACK_BODY_LENGTH,
  MAX_FEEDBACK_PAGE_PATH_LENGTH,
  MAX_FEEDBACK_TITLE_LENGTH,
} from "@/lib/feedback-constants";
import { createAppFeedbackNotification } from "@/lib/notifications";
import { canGiveFeedback, isAdmin } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { touchUserSeen } from "@/lib/user-activity";

export class FeedbackError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FeedbackError";
  }
}

export type SerializedFeedback = {
  id: string;
  authorId: string;
  authorName: string | null;
  authorEmail: string | null;
  area: FeedbackArea;
  pagePath: string | null;
  title: string | null;
  body: string;
  status: FeedbackStatus;
  priority: FeedbackPriority;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  resolvedById: string | null;
};

export type FeedbackInput = {
  area: FeedbackArea;
  body: string;
  title?: string | null;
  pagePath?: string | null;
  priority?: FeedbackPriority;
};

function serializeFeedback(
  feedback: {
    id: string;
    authorId: string;
    area: FeedbackArea;
    pagePath: string | null;
    title: string | null;
    body: string;
    status: FeedbackStatus;
    priority: FeedbackPriority;
    createdAt: Date;
    updatedAt: Date;
    resolvedAt: Date | null;
    resolvedById: string | null;
    author: { name: string | null; email: string | null };
  },
): SerializedFeedback {
  return {
    id: feedback.id,
    authorId: feedback.authorId,
    authorName: feedback.author.name,
    authorEmail: feedback.author.email,
    area: feedback.area,
    pagePath: feedback.pagePath,
    title: feedback.title,
    body: feedback.body,
    status: feedback.status,
    priority: feedback.priority,
    createdAt: feedback.createdAt.toISOString(),
    updatedAt: feedback.updatedAt.toISOString(),
    resolvedAt: feedback.resolvedAt?.toISOString() ?? null,
    resolvedById: feedback.resolvedById,
  };
}

const feedbackInclude = {
  author: {
    select: { name: true, email: true },
  },
} as const;

async function requireFeedbackUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      canGiveFeedback: true,
      canUseReflectionFeatures: true,
    },
  });

  if (!user || !canGiveFeedback(user)) {
    throw new FeedbackError("Not authorized.");
  }

  return user;
}

async function requireAdminUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  if (!user || !isAdmin(user)) {
    throw new FeedbackError("Not authorized.");
  }

  return user;
}

function validateArea(area: string): FeedbackArea {
  if (!(FEEDBACK_AREAS as readonly string[]).includes(area)) {
    throw new FeedbackError("Choose an area.");
  }

  return area as FeedbackArea;
}

function validateStatus(status: string): FeedbackStatus {
  if (!(FEEDBACK_STATUSES as readonly string[]).includes(status)) {
    throw new FeedbackError("Invalid status.");
  }

  return status as FeedbackStatus;
}

function validatePriority(priority: string): FeedbackPriority {
  if (!(FEEDBACK_PRIORITIES as readonly string[]).includes(priority)) {
    throw new FeedbackError("Invalid priority.");
  }

  return priority as FeedbackPriority;
}

function validateBody(body: string): string {
  const trimmed = body.trim();

  if (!trimmed) {
    throw new FeedbackError("Feedback cannot be empty.");
  }

  if (trimmed.length > MAX_FEEDBACK_BODY_LENGTH) {
    throw new FeedbackError(
      `Feedback must be ${MAX_FEEDBACK_BODY_LENGTH} characters or fewer.`,
    );
  }

  return trimmed;
}

function validateTitle(title?: string | null): string | null {
  if (!title?.trim()) {
    return null;
  }

  const trimmed = title.trim();

  if (trimmed.length > MAX_FEEDBACK_TITLE_LENGTH) {
    throw new FeedbackError(
      `Title must be ${MAX_FEEDBACK_TITLE_LENGTH} characters or fewer.`,
    );
  }

  return trimmed;
}

function validatePagePath(pagePath?: string | null): string | null {
  if (!pagePath?.trim()) {
    return null;
  }

  const trimmed = pagePath.trim();

  if (trimmed.length > MAX_FEEDBACK_PAGE_PATH_LENGTH) {
    throw new FeedbackError("Page path is too long.");
  }

  return trimmed;
}

export async function getMyFeedback(
  userId: string,
): Promise<SerializedFeedback[]> {
  await requireFeedbackUser(userId);

  const items = await prisma.appFeedback.findMany({
    where: { authorId: userId },
    orderBy: { createdAt: "desc" },
    include: feedbackInclude,
  });

  return items.map(serializeFeedback);
}

export async function getAdminFeedback(options?: {
  status?: FeedbackStatus;
  area?: FeedbackArea;
}): Promise<SerializedFeedback[]> {
  const items = await prisma.appFeedback.findMany({
    where: {
      ...(options?.status ? { status: options.status } : {}),
      ...(options?.area ? { area: options.area } : {}),
    },
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    include: feedbackInclude,
  });

  return items.map(serializeFeedback);
}

export async function getAdminFeedbackCounts() {
  const [openCount, highPriorityCount] = await Promise.all([
    prisma.appFeedback.count({
      where: {
        status: { in: ["OPEN", "REVIEWED", "PLANNED"] },
      },
    }),
    prisma.appFeedback.count({
      where: {
        priority: "HIGH",
        status: { notIn: ["DONE", "WONT_DO"] },
      },
    }),
  ]);

  return { openCount, highPriorityCount };
}

export async function createFeedback(
  userId: string,
  input: FeedbackInput,
): Promise<SerializedFeedback> {
  const author = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      name: true,
      email: true,
      role: true,
      canGiveFeedback: true,
      canUseReflectionFeatures: true,
    },
  });

  if (!author || !canGiveFeedback(author)) {
    throw new FeedbackError("Not authorized.");
  }

  const area = validateArea(input.area);
  const body = validateBody(input.body);
  const title = validateTitle(input.title);
  const pagePath = validatePagePath(input.pagePath);
  const priority = input.priority
    ? validatePriority(input.priority)
    : "NORMAL";

  const feedback = await prisma.appFeedback.create({
    data: {
      authorId: userId,
      area,
      body,
      title,
      pagePath,
      priority,
    },
    include: feedbackInclude,
  });

  await touchUserSeen(userId);

  try {
    await createAppFeedbackNotification({
      authorName: author.name,
      authorEmail: author.email,
      area,
    });
  } catch (error) {
    console.warn("[planlet] feedback notification failed:", error);
  }

  return serializeFeedback(feedback);
}

export async function updateFeedbackStatus(
  adminUserId: string,
  feedbackId: string,
  status: FeedbackStatus,
): Promise<SerializedFeedback> {
  await requireAdminUser(adminUserId);
  const nextStatus = validateStatus(status);

  const existing = await prisma.appFeedback.findUnique({
    where: { id: feedbackId },
    select: { id: true },
  });

  if (!existing) {
    throw new FeedbackError("Feedback not found.");
  }

  const resolvedAt =
    nextStatus === "DONE" || nextStatus === "WONT_DO" ? new Date() : null;
  const resolvedById =
    nextStatus === "DONE" || nextStatus === "WONT_DO" ? adminUserId : null;

  const feedback = await prisma.appFeedback.update({
    where: { id: feedbackId },
    data: {
      status: nextStatus,
      resolvedAt,
      resolvedById,
    },
    include: feedbackInclude,
  });

  await touchUserSeen(adminUserId);

  return serializeFeedback(feedback);
}

export async function updateFeedbackPriority(
  adminUserId: string,
  feedbackId: string,
  priority: FeedbackPriority,
): Promise<SerializedFeedback> {
  await requireAdminUser(adminUserId);
  const nextPriority = validatePriority(priority);

  const existing = await prisma.appFeedback.findUnique({
    where: { id: feedbackId },
    select: { id: true },
  });

  if (!existing) {
    throw new FeedbackError("Feedback not found.");
  }

  const feedback = await prisma.appFeedback.update({
    where: { id: feedbackId },
    data: { priority: nextPriority },
    include: feedbackInclude,
  });

  await touchUserSeen(adminUserId);

  return serializeFeedback(feedback);
}

export async function deleteFeedback(
  adminUserId: string,
  feedbackId: string,
): Promise<void> {
  await requireAdminUser(adminUserId);

  const existing = await prisma.appFeedback.findUnique({
    where: { id: feedbackId },
    select: { id: true },
  });

  if (!existing) {
    throw new FeedbackError("Feedback not found.");
  }

  await prisma.appFeedback.delete({
    where: { id: feedbackId },
  });

  await touchUserSeen(adminUserId);
}

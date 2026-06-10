import type {
  KudosType,
  NotificationType,
} from "@/app/generated/prisma/client";
import { getKudosNotificationPhrase } from "@/lib/kudos-labels";
import { sendPushToUser } from "@/lib/push";
import { prisma } from "@/lib/prisma";

export class NotificationAccessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotificationAccessError";
  }
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  return prisma.notification.count({
    where: { userId, readAt: null },
  });
}

export async function getNotificationsForUser(userId: string, limit = 20) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function markNotificationRead(
  notificationId: string,
  userId: string,
): Promise<void> {
  const result = await prisma.notification.updateMany({
    where: { id: notificationId, userId },
    data: { readAt: new Date() },
  });

  if (result.count === 0) {
    throw new NotificationAccessError("Notification not found");
  }
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
}

export async function createNotification(input: {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  href?: string;
}) {
  return prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      href: input.href,
    },
  });
}

export async function createPlanKudosNotification(input: {
  recipientUserId: string;
  planId: string;
  planTitle: string;
  senderName: string | null;
  senderEmail: string | null;
  kudosType: KudosType;
}) {
  const senderLabel =
    input.senderName?.trim() || input.senderEmail?.trim() || "Someone";
  const phrase = getKudosNotificationPhrase(input.kudosType);

  const title = "You received kudos";
  const body = `${senderLabel} ${phrase} ${input.planTitle}`;
  const href = `/plans/${input.planId}`;

  const notification = await createNotification({
    userId: input.recipientUserId,
    type: "PLAN_KUDOS",
    title,
    body,
    href,
  });

  void sendPushToUser(input.recipientUserId, { title, body, url: href });

  return notification;
}

export async function createPlanSharedNotification(input: {
  recipientUserId: string;
  planId: string;
  planTitle: string;
  ownerName: string | null;
  ownerEmail: string | null;
}) {
  const ownerLabel =
    input.ownerName?.trim() || input.ownerEmail?.trim() || "Someone";

  const title = "A plan was shared with you";
  const body = `${ownerLabel} shared ${input.planTitle}`;
  const href = `/plans/${input.planId}`;

  const notification = await createNotification({
    userId: input.recipientUserId,
    type: "PLAN_SHARED",
    title,
    body,
    href,
  });

  void sendPushToUser(input.recipientUserId, { title, body, url: href });

  return notification;
}

export async function createPlanItemCommentNotification(input: {
  recipientUserId: string;
  planId: string;
  itemTitle: string;
  authorName: string | null;
  authorEmail: string | null;
}) {
  const authorLabel =
    input.authorName?.trim() || input.authorEmail?.trim() || "Someone";

  const title = "New comment on a task";
  const body = `${authorLabel} commented on ${input.itemTitle}`;
  const href = `/plans/${input.planId}`;

  const notification = await createNotification({
    userId: input.recipientUserId,
    type: "PLAN_ITEM_COMMENT",
    title,
    body,
    href,
  });

  void sendPushToUser(input.recipientUserId, { title, body, url: href });

  return notification;
}

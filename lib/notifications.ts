import type { NotificationType } from "@/app/generated/prisma/client";
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

export async function createPlanSharedNotification(input: {
  recipientUserId: string;
  planId: string;
  planTitle: string;
  ownerName: string | null;
  ownerEmail: string | null;
}) {
  const ownerLabel =
    input.ownerName?.trim() || input.ownerEmail?.trim() || "Someone";

  return createNotification({
    userId: input.recipientUserId,
    type: "PLAN_SHARED",
    title: "A plan was shared with you",
    body: `${ownerLabel} shared ${input.planTitle}`,
    href: `/plans/${input.planId}`,
  });
}

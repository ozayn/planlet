import type { KudosType } from "@/app/generated/prisma/client";
import { createPlanKudosNotification } from "@/lib/notifications";
import { touchPlan } from "@/lib/touch-plan";
import { canEditPlan, canViewPlan } from "@/lib/plan-sharing";
import { prisma } from "@/lib/prisma";

export {
  formatUserLabel,
  getKudosTypeLabel,
  getKudosTypeShortLabel,
  KUDOS_TYPES,
} from "@/lib/kudos-labels";

export class KudosError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "KudosError";
  }
}

async function assertCanSendKudos(planId: string, senderId: string) {
  const plan = await prisma.plan.findUnique({
    where: { id: planId },
    select: { id: true, userId: true, title: true },
  });

  if (!plan) {
    throw new KudosError("Plan not found.");
  }

  if (plan.userId === senderId) {
    throw new KudosError("You cannot send kudos to your own plan.");
  }

  const share = await prisma.planShare.findFirst({
    where: { planId, sharedWithUserId: senderId },
    select: { id: true },
  });

  if (!share) {
    throw new KudosError("You can only send kudos on plans shared with you.");
  }

  return plan;
}

export async function getViewerKudosForPlan(planId: string, viewerId: string) {
  if (!(await canViewPlan(planId, viewerId))) {
    return null;
  }

  return prisma.planKudos.findUnique({
    where: {
      planId_senderId: { planId, senderId: viewerId },
    },
    select: { id: true, type: true, createdAt: true },
  });
}

export async function getKudosForPlan(planId: string, viewerId: string) {
  if (!(await canEditPlan(planId, viewerId))) {
    return [];
  }

  return prisma.planKudos.findMany({
    where: { planId },
    include: {
      sender: {
        select: { id: true, name: true, email: true, image: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function sendPlanKudos(
  planId: string,
  senderId: string,
  type: KudosType,
  message?: string,
) {
  const plan = await assertCanSendKudos(planId, senderId);

  const existing = await prisma.planKudos.findUnique({
    where: {
      planId_senderId: { planId, senderId },
    },
    select: { id: true },
  });

  const kudos = await prisma.planKudos.upsert({
    where: {
      planId_senderId: { planId, senderId },
    },
    create: {
      planId,
      senderId,
      recipientId: plan.userId,
      type,
      message: message?.trim() || null,
    },
    update: {
      type,
      ...(message !== undefined ? { message: message?.trim() || null } : {}),
    },
  });

  if (!existing) {
    const sender = await prisma.user.findUnique({
      where: { id: senderId },
      select: { name: true, email: true },
    });

    try {
      await createPlanKudosNotification({
        recipientUserId: plan.userId,
        planId,
        planTitle: plan.title,
        senderName: sender?.name ?? null,
        senderEmail: sender?.email ?? null,
        kudosType: type,
      });
    } catch {
      // Notification failure should not block kudos creation.
    }
  }

  await touchPlan(planId);

  return kudos;
}

export async function removePlanKudos(planId: string, senderId: string) {
  await assertCanSendKudos(planId, senderId);

  const existing = await prisma.planKudos.findUnique({
    where: {
      planId_senderId: { planId, senderId },
    },
    select: { id: true },
  });

  if (!existing) {
    return;
  }

  await prisma.planKudos.delete({
    where: { id: existing.id },
  });
}

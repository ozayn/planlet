import { isEmailAllowed } from "@/lib/auth-allowlist";
import { prisma } from "@/lib/prisma";

export class PlanSharingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PlanSharingError";
  }
}

export async function canEditPlan(
  planId: string,
  userId: string,
): Promise<boolean> {
  const plan = await prisma.plan.findFirst({
    where: { id: planId, userId },
    select: { id: true },
  });

  return Boolean(plan);
}

export async function canViewPlan(
  planId: string,
  userId: string,
): Promise<boolean> {
  if (await canEditPlan(planId, userId)) {
    return true;
  }

  const share = await prisma.planShare.findFirst({
    where: { planId, sharedWithUserId: userId },
    select: { id: true },
  });

  return Boolean(share);
}

export type PlanAccess = "owner" | "view" | null;

export async function getPlanAccess(
  planId: string,
  userId: string,
): Promise<PlanAccess> {
  if (await canEditPlan(planId, userId)) {
    return "owner";
  }

  if (await canViewPlan(planId, userId)) {
    return "view";
  }

  return null;
}

export async function sharePlanWithUser(
  planId: string,
  ownerId: string,
  targetEmail: string,
) {
  const email = targetEmail.trim().toLowerCase();

  if (!email) {
    throw new PlanSharingError("Email is required.");
  }

  if (!(await canEditPlan(planId, ownerId))) {
    throw new PlanSharingError("Plan not found.");
  }

  const owner = await prisma.user.findUnique({
    where: { id: ownerId },
    select: { email: true },
  });

  if (owner?.email?.toLowerCase() === email) {
    throw new PlanSharingError("You cannot share a plan with yourself.");
  }

  if (!isEmailAllowed(email)) {
    throw new PlanSharingError(
      "This email is not allowed to use this Planlet workspace.",
    );
  }

  const targetUser = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: { id: true, email: true, name: true },
  });

  if (!targetUser) {
    throw new PlanSharingError(
      "This person needs to sign in to Planlet once before you can share with them.",
    );
  }

  return prisma.planShare.upsert({
    where: {
      planId_sharedWithUserId: {
        planId,
        sharedWithUserId: targetUser.id,
      },
    },
    create: {
      planId,
      ownerId,
      sharedWithUserId: targetUser.id,
      permission: "VIEW",
    },
    update: {
      permission: "VIEW",
    },
    include: {
      sharedWithUser: {
        select: { id: true, name: true, email: true },
      },
    },
  });
}

export async function removePlanShare(planShareId: string, ownerId: string) {
  const share = await prisma.planShare.findFirst({
    where: { id: planShareId, ownerId },
    select: { id: true, planId: true },
  });

  if (!share) {
    throw new PlanSharingError("Share not found.");
  }

  await prisma.planShare.delete({
    where: { id: planShareId },
  });

  return share.planId;
}

export async function getPlanSharesForOwner(planId: string, ownerId: string) {
  if (!(await canEditPlan(planId, ownerId))) {
    throw new PlanSharingError("Plan not found.");
  }

  return prisma.planShare.findMany({
    where: { planId, ownerId },
    include: {
      sharedWithUser: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });
}

export type SharedPlanEntry = {
  shareId: string;
  planId: string;
  title: string;
  type: import("@/app/generated/prisma/client").PlanType;
  dateStart: Date;
  dateEnd: Date;
  itemCount: number;
  ownerName: string | null;
  ownerEmail: string | null;
};

export async function getSharedPlansForUser(
  userId: string,
): Promise<SharedPlanEntry[]> {
  const shares = await prisma.planShare.findMany({
    where: { sharedWithUserId: userId },
    include: {
      plan: {
        include: {
          _count: { select: { items: true } },
        },
      },
      owner: {
        select: { name: true, email: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return shares.map((share) => ({
    shareId: share.id,
    planId: share.plan.id,
    title: share.plan.title,
    type: share.plan.type,
    dateStart: share.plan.dateStart,
    dateEnd: share.plan.dateEnd,
    itemCount: share.plan._count.items,
    ownerName: share.owner.name,
    ownerEmail: share.owner.email,
  }));
}

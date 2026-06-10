import type {
  PlanItemStatus,
  PlanType,
  UserRole,
} from "@/app/generated/prisma/client";
import { notFound } from "next/navigation";

import { auth } from "@/auth";
import { isAdminRole } from "@/lib/auth-roles";
import { prisma } from "@/lib/prisma";
import { sortUsersByRecentlySeen } from "@/lib/user-seen";

export type AdminUserStatRow = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: UserRole;
  createdAt: Date;
  lastSeenAt: Date | null;
  lastLoginAt: Date | null;
  loginCount: number;
  planCount: number;
  dayPlanCount: number;
  monthPlanCount: number;
  yearPlanCount: number;
  planItemCount: number;
  doneItemCount: number;
  partialItemCount: number;
  movedItemCount: number;
  shareExportCount: number;
  sharedOutCount: number;
  sharedWithMeCount: number;
  lastPlanActivityAt: Date | null;
};

export type AdminGlobalTotals = {
  userCount: number;
  adminCount: number;
  planCount: number;
  itemCount: number;
  shareExportCount: number;
  planShareCount: number;
};

export type AdminLoginEventRow = {
  id: string;
  email: string;
  provider: string | null;
  createdAt: Date;
};

export type AdminStats = {
  users: AdminUserStatRow[];
  totals: AdminGlobalTotals;
  recentLogins: AdminLoginEventRow[];
};

function incrementMap(
  map: Map<string, number>,
  key: string,
  amount = 1,
) {
  map.set(key, (map.get(key) ?? 0) + amount);
}

function incrementNestedMap(
  map: Map<string, Map<string, number>>,
  outerKey: string,
  innerKey: string,
  amount = 1,
) {
  const inner = map.get(outerKey) ?? new Map<string, number>();
  inner.set(innerKey, (inner.get(innerKey) ?? 0) + amount);
  map.set(outerKey, inner);
}

export async function requireAdminUser() {
  const session = await auth();

  if (!session?.user?.id || !isAdminRole(session.user.role)) {
    notFound();
  }

  return session.user;
}

export async function getAdminUserStats(): Promise<AdminStats> {
  await requireAdminUser();

  const [
    users,
    plans,
    planItems,
    shareExports,
    sharesOwned,
    sharesReceived,
    recentLogins,
    totals,
  ] = await Promise.all([
    prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        createdAt: true,
        lastSeenAt: true,
        lastLoginAt: true,
        loginCount: true,
      },
    }),
    prisma.plan.findMany({
      select: { id: true, userId: true, type: true, updatedAt: true },
    }),
    prisma.planItem.findMany({
      select: {
        status: true,
        plan: { select: { userId: true } },
      },
    }),
    prisma.shareExport.findMany({
      select: { plan: { select: { userId: true } } },
    }),
    prisma.planShare.groupBy({
      by: ["ownerId"],
      _count: { id: true },
    }),
    prisma.planShare.groupBy({
      by: ["sharedWithUserId"],
      _count: { id: true },
    }),
    prisma.loginEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: 25,
      select: {
        id: true,
        email: true,
        provider: true,
        createdAt: true,
      },
    }),
    Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: "ADMIN" } }),
      prisma.plan.count(),
      prisma.planItem.count(),
      prisma.shareExport.count(),
      prisma.planShare.count(),
    ]),
  ]);

  const planCountByUser = new Map<string, number>();
  const planTypeCountByUser = new Map<string, Map<PlanType, number>>();
  const lastPlanActivityByUser = new Map<string, Date>();

  for (const plan of plans) {
    incrementMap(planCountByUser, plan.userId);
    const typeMap = planTypeCountByUser.get(plan.userId) ?? new Map<PlanType, number>();
    typeMap.set(plan.type, (typeMap.get(plan.type) ?? 0) + 1);
    planTypeCountByUser.set(plan.userId, typeMap);

    const previous = lastPlanActivityByUser.get(plan.userId);
    if (!previous || plan.updatedAt > previous) {
      lastPlanActivityByUser.set(plan.userId, plan.updatedAt);
    }
  }

  const itemCountByUser = new Map<string, number>();
  const itemStatusByUser = new Map<string, Map<PlanItemStatus, number>>();

  for (const item of planItems) {
    const userId = item.plan.userId;
    incrementMap(itemCountByUser, userId);
    incrementNestedMap(itemStatusByUser, userId, item.status);
  }

  const shareExportByUser = new Map<string, number>();
  for (const exportRow of shareExports) {
    incrementMap(shareExportByUser, exportRow.plan.userId);
  }

  const sharedOutByUser = new Map(
    sharesOwned.map((row) => [row.ownerId, row._count.id]),
  );
  const sharedWithMeByUser = new Map(
    sharesReceived.map((row) => [row.sharedWithUserId, row._count.id]),
  );

  const userRows: AdminUserStatRow[] = users.map((user) => {
    const typeCounts = planTypeCountByUser.get(user.id);
    const statusCounts = itemStatusByUser.get(user.id);

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      role: user.role,
      createdAt: user.createdAt,
      lastSeenAt: user.lastSeenAt,
      lastLoginAt: user.lastLoginAt,
      loginCount: user.loginCount,
      planCount: planCountByUser.get(user.id) ?? 0,
      dayPlanCount: typeCounts?.get("DAY") ?? 0,
      monthPlanCount: typeCounts?.get("MONTH") ?? 0,
      yearPlanCount: typeCounts?.get("YEAR") ?? 0,
      planItemCount: itemCountByUser.get(user.id) ?? 0,
      doneItemCount: statusCounts?.get("DONE") ?? 0,
      partialItemCount: statusCounts?.get("PARTIAL") ?? 0,
      movedItemCount: statusCounts?.get("MOVED") ?? 0,
      shareExportCount: shareExportByUser.get(user.id) ?? 0,
      sharedOutCount: sharedOutByUser.get(user.id) ?? 0,
      sharedWithMeCount: sharedWithMeByUser.get(user.id) ?? 0,
      lastPlanActivityAt: lastPlanActivityByUser.get(user.id) ?? null,
    };
  });

  const [
    userCount,
    adminCount,
    planCount,
    itemCount,
    shareExportCount,
    planShareCount,
  ] = totals;

  return {
    users: sortUsersByRecentlySeen(userRows),
    totals: {
      userCount,
      adminCount,
      planCount,
      itemCount,
      shareExportCount,
      planShareCount,
    },
    recentLogins,
  };
}

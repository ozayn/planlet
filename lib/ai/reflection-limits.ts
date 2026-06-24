import { addWeeks, startOfDay, startOfWeek } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";

import { getCoachingReflectionWeeklyLimit } from "@/lib/app-settings";
import { AI_USAGE_FEATURES } from "@/lib/ai/usage";
import { isAdmin, type UserAccess } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { getUserTimezone } from "@/lib/user-timezone";
import { FALLBACK_TIMEZONE } from "@/lib/user-timezone-constants";

const WEEK_STARTS_ON = 1 as const;

export type CoachingReflectionLimitStatus = {
  limit: number;
  used: number;
  remaining: number;
  resetsAt: Date;
  isUnlimited: boolean;
  isAdminUser: boolean;
};

export class CoachingReflectionLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CoachingReflectionLimitError";
  }
}

type LimitOptions = {
  isAdmin?: boolean;
  timezone?: string | null;
};

function resolveTimezone(timezone?: string | null): string {
  const trimmed = timezone?.trim();
  return trimmed || FALLBACK_TIMEZONE;
}

export function getCoachingReflectionWeekRange(
  now: Date,
  timezone: string,
): { start: Date; end: Date } {
  const zoned = toZonedTime(now, timezone);
  const weekStart = startOfDay(
    startOfWeek(zoned, { weekStartsOn: WEEK_STARTS_ON }),
  );
  const nextWeekStart = addWeeks(weekStart, 1);

  return {
    start: fromZonedTime(weekStart, timezone),
    end: fromZonedTime(nextWeekStart, timezone),
  };
}

function coachingReflectionLimitErrorMessage(limit: number): string {
  return `You've used your ${limit} coaching reflections for this week. You can generate more next week.`;
}

async function countCoachingReflectionsThisWeek(
  userId: string,
  timezone: string,
  now = new Date(),
): Promise<{ used: number; resetsAt: Date }> {
  const { start, end } = getCoachingReflectionWeekRange(now, timezone);

  const used = await prisma.aiUsageLog.count({
    where: {
      userId,
      feature: AI_USAGE_FEATURES.COACHING_REFLECTION,
      createdAt: {
        gte: start,
        lt: end,
      },
    },
  });

  return { used, resetsAt: end };
}

export async function getCoachingReflectionLimitStatus(
  userId: string,
  options: LimitOptions = {},
): Promise<CoachingReflectionLimitStatus> {
  const configuredLimit = await getCoachingReflectionWeeklyLimit();
  const timezone = resolveTimezone(
    options.timezone ?? (await getUserTimezone(userId)),
  );
  const { end } = getCoachingReflectionWeekRange(new Date(), timezone);

  if (options.isAdmin === true) {
    return {
      limit: configuredLimit,
      used: 0,
      remaining: configuredLimit,
      resetsAt: end,
      isUnlimited: true,
      isAdminUser: true,
    };
  }

  const { used, resetsAt } = await countCoachingReflectionsThisWeek(
    userId,
    timezone,
  );

  if (configuredLimit === 0) {
    return {
      limit: 0,
      used,
      remaining: 0,
      resetsAt,
      isUnlimited: true,
      isAdminUser: false,
    };
  }

  return {
    limit: configuredLimit,
    used,
    remaining: Math.max(0, configuredLimit - used),
    resetsAt,
    isUnlimited: false,
    isAdminUser: false,
  };
}

export async function assertCanGenerateCoachingReflection(
  userId: string,
  options: LimitOptions = {},
): Promise<CoachingReflectionLimitStatus> {
  const status = await getCoachingReflectionLimitStatus(userId, options);

  if (status.isUnlimited) {
    return status;
  }

  if (status.remaining <= 0) {
    throw new CoachingReflectionLimitError(
      coachingReflectionLimitErrorMessage(status.limit),
    );
  }

  return status;
}

export function getCoachingReflectionLimitStatusForUser(
  userId: string,
  access: UserAccess & { timezone?: string | null },
): Promise<CoachingReflectionLimitStatus> {
  return getCoachingReflectionLimitStatus(userId, {
    isAdmin: isAdmin(access),
    timezone: access.timezone,
  });
}

import {
  COACHING_REFLECTION_WEEKLY_LIMIT_KEY,
  DEFAULT_COACHING_REFLECTION_WEEKLY_LIMIT,
  MAX_COACHING_REFLECTION_WEEKLY_LIMIT,
  MIN_COACHING_REFLECTION_WEEKLY_LIMIT,
} from "@/lib/app-settings-constants";
import { prisma } from "@/lib/prisma";

export {
  COACHING_REFLECTION_WEEKLY_LIMIT_KEY,
  DEFAULT_COACHING_REFLECTION_WEEKLY_LIMIT,
  MAX_COACHING_REFLECTION_WEEKLY_LIMIT,
  MIN_COACHING_REFLECTION_WEEKLY_LIMIT,
} from "@/lib/app-settings-constants";

export class AppSettingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AppSettingError";
  }
}

function parseCoachingReflectionWeeklyLimitValue(value: unknown): number | null {
  if (!value || typeof value !== "object" || !("limit" in value)) {
    return null;
  }

  const limit = (value as { limit: unknown }).limit;

  if (typeof limit !== "number" || !Number.isFinite(limit)) {
    return null;
  }

  return Math.min(
    MAX_COACHING_REFLECTION_WEEKLY_LIMIT,
    Math.max(MIN_COACHING_REFLECTION_WEEKLY_LIMIT, Math.round(limit)),
  );
}

export async function getCoachingReflectionWeeklyLimit(): Promise<number> {
  const setting = await prisma.appSetting.findUnique({
    where: { key: COACHING_REFLECTION_WEEKLY_LIMIT_KEY },
    select: { value: true },
  });

  if (!setting) {
    return DEFAULT_COACHING_REFLECTION_WEEKLY_LIMIT;
  }

  return (
    parseCoachingReflectionWeeklyLimitValue(setting.value) ??
    DEFAULT_COACHING_REFLECTION_WEEKLY_LIMIT
  );
}

export async function updateCoachingReflectionWeeklyLimit(
  limit: number,
): Promise<number> {
  if (
    !Number.isFinite(limit) ||
    limit < MIN_COACHING_REFLECTION_WEEKLY_LIMIT ||
    limit > MAX_COACHING_REFLECTION_WEEKLY_LIMIT
  ) {
    throw new AppSettingError(
      `Limit must be between ${MIN_COACHING_REFLECTION_WEEKLY_LIMIT} and ${MAX_COACHING_REFLECTION_WEEKLY_LIMIT}.`,
    );
  }

  const rounded = Math.round(limit);

  await prisma.appSetting.upsert({
    where: { key: COACHING_REFLECTION_WEEKLY_LIMIT_KEY },
    create: {
      key: COACHING_REFLECTION_WEEKLY_LIMIT_KEY,
      value: { limit: rounded },
    },
    update: {
      value: { limit: rounded },
    },
  });

  return rounded;
}

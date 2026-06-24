export type CoachingReflectionLimitStatusView = {
  limit: number;
  used: number;
  remaining: number;
  resetsAt: string;
  isUnlimited: boolean;
  isAdminUser: boolean;
};

export function formatCoachingReflectionRemainingLabel(
  status: Pick<
    CoachingReflectionLimitStatusView,
    "remaining" | "isUnlimited" | "isAdminUser"
  >,
): string {
  if (status.isUnlimited) {
    return status.isAdminUser ? "Unlimited for admin" : "Unlimited";
  }

  if (status.remaining === 0) {
    return "0 reflections left this week";
  }

  if (status.remaining === 1) {
    return "1 reflection left this week";
  }

  return `${status.remaining} reflections left this week`;
}

export function canGenerateCoachingReflection(
  status: Pick<
    CoachingReflectionLimitStatusView,
    "remaining" | "isUnlimited"
  >,
): boolean {
  return status.isUnlimited || status.remaining > 0;
}

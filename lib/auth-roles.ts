import type { UserRole } from "@/app/generated/prisma/client";
import {
  isAdminEmail,
  isBodyJourneyEmail,
  isCareerJourneyEmail,
  isCoachEmail,
  isFeedbackEmail,
  isJobTrackerEmail,
  isLearningJourneyEmail,
  isLifeLabEmail,
  isIdeasEmail,
  isActivityTimerEmail,
  isReflectorEmail,
} from "@/lib/auth-allowlist";
import { isAdmin } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

export type ResolvedUserAccess = {
  role: UserRole;
  canGiveFeedback: boolean;
  canUseReflectionFeatures: boolean;
  canUseCoachingFeatures: boolean;
  canUseJobTrackerFeatures: boolean;
  canUseCareerJourneyFeatures: boolean;
  canUseBodyJourneyFeatures: boolean;
  canUseLearningJourneyFeatures: boolean;
  canUseLifeLabFeatures: boolean;
  canUseIdeasFeatures: boolean;
  canUseActivityTimerFeatures: boolean;
};

type ExistingUserAccess = {
  role: UserRole;
  canGiveFeedback?: boolean;
  canUseReflectionFeatures?: boolean;
  canUseCoachingFeatures?: boolean;
  canUseJobTrackerFeatures?: boolean;
  canUseCareerJourneyFeatures?: boolean;
  canUseBodyJourneyFeatures?: boolean;
  canUseLearningJourneyFeatures?: boolean;
  canUseLifeLabFeatures?: boolean;
  canUseIdeasFeatures?: boolean;
  canUseActivityTimerFeatures?: boolean;
};

export function resolveUserAccessFromEmail(
  email: string,
  existing?: ExistingUserAccess,
): ResolvedUserAccess {
  if (isAdminEmail(email) || existing?.role === "ADMIN") {
    return {
      role: "ADMIN",
      canGiveFeedback: true,
      canUseReflectionFeatures: true,
      canUseCoachingFeatures: true,
      canUseJobTrackerFeatures: true,
      canUseCareerJourneyFeatures: true,
      canUseBodyJourneyFeatures: true,
      canUseLearningJourneyFeatures: true,
      canUseLifeLabFeatures: false,
      canUseIdeasFeatures: true,
      canUseActivityTimerFeatures: true,
    };
  }

  const canGiveFeedback = isFeedbackEmail(email);
  const canUseReflectionFeatures = isReflectorEmail(email);
  const canUseCoachingFeatures = isCoachEmail(email);
  const canUseJobTrackerFeatures = isJobTrackerEmail(email);
  const canUseCareerJourneyFeatures = isCareerJourneyEmail(email);
  const canUseBodyJourneyFeatures = isBodyJourneyEmail(email);
  const canUseLearningJourneyFeatures = isLearningJourneyEmail(email);

  let role: UserRole = "USER";
  if (canUseReflectionFeatures) {
    role = "REFLECTOR";
  } else if (isLifeLabEmail(email)) {
    role = "PERSONAL";
  }

  const canUseLifeLabFeatures = role === "PERSONAL";
  const canUseIdeasFeatures = isIdeasEmail(email);
  const canUseActivityTimerFeatures = isActivityTimerEmail(email);

  return {
    role,
    canGiveFeedback,
    canUseReflectionFeatures,
    canUseCoachingFeatures,
    canUseJobTrackerFeatures,
    canUseCareerJourneyFeatures,
    canUseBodyJourneyFeatures,
    canUseLearningJourneyFeatures,
    canUseLifeLabFeatures,
    canUseIdeasFeatures,
    canUseActivityTimerFeatures,
  };
}

/** @deprecated Use resolveUserAccessFromEmail */
export function resolveRoleFromEmail(
  email: string,
  currentRole: UserRole | undefined,
): UserRole {
  return resolveUserAccessFromEmail(email, currentRole ? { role: currentRole } : undefined)
    .role;
}

export async function syncUserAccessOnSignIn(
  userId: string,
  email: string,
): Promise<ResolvedUserAccess> {
  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      canGiveFeedback: true,
      canUseReflectionFeatures: true,
      canUseCoachingFeatures: true,
      canUseJobTrackerFeatures: true,
      canUseCareerJourneyFeatures: true,
      canUseBodyJourneyFeatures: true,
      canUseLearningJourneyFeatures: true,
      canUseLifeLabFeatures: true,
      canUseIdeasFeatures: true,
      canUseActivityTimerFeatures: true,
    },
  });

  const access = resolveUserAccessFromEmail(email, existing ?? undefined);

  if (
    existing?.role !== access.role ||
    existing?.canGiveFeedback !== access.canGiveFeedback ||
    existing?.canUseReflectionFeatures !== access.canUseReflectionFeatures ||
    existing?.canUseCoachingFeatures !== access.canUseCoachingFeatures ||
    existing?.canUseJobTrackerFeatures !== access.canUseJobTrackerFeatures ||
    existing?.canUseCareerJourneyFeatures !== access.canUseCareerJourneyFeatures ||
    existing?.canUseBodyJourneyFeatures !== access.canUseBodyJourneyFeatures ||
    existing?.canUseLearningJourneyFeatures !== access.canUseLearningJourneyFeatures ||
    existing?.canUseLifeLabFeatures !== access.canUseLifeLabFeatures ||
    existing?.canUseIdeasFeatures !== access.canUseIdeasFeatures ||
    existing?.canUseActivityTimerFeatures !== access.canUseActivityTimerFeatures
  ) {
    await prisma.user.update({
      where: { id: userId },
      data: access,
    });
  }

  return access;
}

/** @deprecated Use syncUserAccessOnSignIn */
export async function syncUserRoleOnSignIn(
  userId: string,
  email: string,
): Promise<UserRole> {
  const access = await syncUserAccessOnSignIn(userId, email);
  return access.role;
}

export function isAdminRole(role?: string | null): boolean {
  return isAdmin(role);
}

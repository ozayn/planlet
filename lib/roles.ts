import type { UserRole } from "@/app/generated/prisma/client";

export type UserAccess = {
  role?: UserRole | string | null;
  canGiveFeedback?: boolean | null;
  canUseReflectionFeatures?: boolean | null;
  canUseCoachingFeatures?: boolean | null;
  canUseJobTrackerFeatures?: boolean | null;
  canUseCareerJourneyFeatures?: boolean | null;
  canUseBodyJourneyFeatures?: boolean | null;
  canUseLearningJourneyFeatures?: boolean | null;
  canUseLifeLabFeatures?: boolean | null;
  canUseIdeasFeatures?: boolean | null;
};

type RoleInput = UserRole | string | null | undefined;

export function isAdmin(user: UserAccess | RoleInput): boolean {
  const role = typeof user === "object" && user !== null ? user.role : user;
  return role === "ADMIN";
}

export function isReflector(user: UserAccess | RoleInput): boolean {
  const role = typeof user === "object" && user !== null ? user.role : user;
  return role === "REFLECTOR";
}

export function isPersonalRole(user: UserAccess | RoleInput): boolean {
  const role = typeof user === "object" && user !== null ? user.role : user;
  return role === "PERSONAL";
}

export function canGiveFeedback(user: UserAccess): boolean {
  if (isAdmin(user)) {
    return true;
  }

  return user.canGiveFeedback === true;
}

export function canUseReflectionFeatures(user: UserAccess): boolean {
  if (isAdmin(user)) {
    return true;
  }

  return user.canUseReflectionFeatures === true;
}

export function canUseCoachingFeatures(user: UserAccess): boolean {
  if (isAdmin(user)) {
    return true;
  }

  return user.canUseCoachingFeatures === true;
}

export function canUseJobTrackerFeatures(user: UserAccess): boolean {
  if (isAdmin(user)) {
    return true;
  }

  return user.canUseJobTrackerFeatures === true;
}

export function canUseCareerJourneyFeatures(user: UserAccess): boolean {
  if (isAdmin(user)) {
    return true;
  }

  return user.canUseCareerJourneyFeatures === true;
}

export function canUseBodyJourneyFeatures(user: UserAccess): boolean {
  if (isAdmin(user)) {
    return true;
  }

  return user.canUseBodyJourneyFeatures === true;
}

export function canUseLearningJourneyFeatures(user: UserAccess): boolean {
  if (isAdmin(user)) {
    return true;
  }

  return user.canUseLearningJourneyFeatures === true;
}

export function canUseLifeLabFeatures(user: UserAccess): boolean {
  if (isAdmin(user)) {
    return true;
  }

  return isPersonalRole(user);
}

/** @deprecated Use canUseLifeLabFeatures */
export function canAccessLifeLabPage(user: UserAccess): boolean {
  return canUseLifeLabFeatures(user);
}

export function canUseIdeasFeatures(user: UserAccess): boolean {
  if (isAdmin(user)) {
    return true;
  }

  return user.canUseIdeasFeatures === true;
}

export function canUseTherapyThoughts(user: UserAccess | RoleInput): boolean {
  if (isAdmin(user)) {
    return true;
  }

  return isReflector(user);
}

export function formatUserRoleLabel(role: RoleInput): string {
  switch (role) {
    case "ADMIN":
      return "Admin";
    case "REFLECTOR":
      return "Reflector";
    case "PERSONAL":
      return "Personal";
    default:
      return "User";
  }
}

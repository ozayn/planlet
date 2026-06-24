import type { UserRole } from "@/app/generated/prisma/client";

export type UserAccess = {
  role?: UserRole | string | null;
  canGiveFeedback?: boolean | null;
  canUseReflectionFeatures?: boolean | null;
  canUseCoachingFeatures?: boolean | null;
  canUseJobTrackerFeatures?: boolean | null;
  canUseCareerJourneyFeatures?: boolean | null;
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
    default:
      return "User";
  }
}

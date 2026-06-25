import type { AdminUserStatRow } from "@/lib/admin-stats";

export function formatAdminRoleCapabilities(user: AdminUserStatRow): string {
  if (user.role === "ADMIN") {
    return "Admin";
  }

  const parts: string[] = [];

  if (user.role === "REFLECTOR") {
    parts.push("Reflector");
  } else {
    parts.push("User");
  }

  if (user.canGiveFeedback) {
    parts.push("Feedback");
  }

  if (user.canUseReflectionFeatures && user.role !== "REFLECTOR") {
    parts.push("Reflection");
  }

  if (user.canUseCoachingFeatures) {
    parts.push("Coach");
  }

  if (user.canUseJobTrackerFeatures) {
    parts.push("Job tracker");
  }

  if (user.canUseCareerJourneyFeatures) {
    parts.push("Career");
  }

  if (user.canUseBodyJourneyFeatures) {
    parts.push("Body journey");
  }

  if (user.canUseLearningJourneyFeatures) {
    parts.push("Learning");
  }

  return parts.join(" · ");
}

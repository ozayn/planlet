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

  return parts.join(" · ");
}

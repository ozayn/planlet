import { SettingsSection } from "@/components/settings/settings-section";
import { formatUserRoleLabel } from "@/lib/roles";
import type { UserRole } from "@/app/generated/prisma/client";

type SettingsReflectionFeaturesProps = {
  role: UserRole;
  canGiveFeedback: boolean;
  canUseReflectionFeatures: boolean;
  canUseCoachingFeatures: boolean;
};

export function SettingsReflectionFeatures({
  role,
  canGiveFeedback,
  canUseReflectionFeatures,
  canUseCoachingFeatures,
}: SettingsReflectionFeaturesProps) {
  const badges = [
    canGiveFeedback ? "Feedback enabled" : null,
    canUseReflectionFeatures ? "Reflection enabled" : null,
    canUseCoachingFeatures ? "Coaching enabled" : null,
  ].filter(Boolean);

  return (
    <SettingsSection title="Capabilities">
      {badges.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {badges.map((badge) => (
            <li
              key={badge}
              className="rounded-full bg-accent-cream px-2.5 py-1 text-xs text-foreground"
            >
              {badge}
            </li>
          ))}
        </ul>
      ) : null}
      <p className="text-xs text-muted-light">
        Role: {formatUserRoleLabel(role)}
      </p>
    </SettingsSection>
  );
}

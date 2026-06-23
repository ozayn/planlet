import Link from "next/link";

import { SettingsSection } from "@/components/settings/settings-section";

type SettingsReflectionCoachingProps = {
  canUseCoachingFeatures: boolean;
  canUseReflectionFeatures: boolean;
  canUseTherapyThoughts: boolean;
};

type ReflectionLink = {
  href: string;
  label: string;
  description: string;
};

export function SettingsReflectionCoaching({
  canUseCoachingFeatures,
  canUseReflectionFeatures,
  canUseTherapyThoughts,
}: SettingsReflectionCoachingProps) {
  const links: ReflectionLink[] = [];

  if (canUseCoachingFeatures) {
    links.push({
      href: "/coaching",
      label: "Reflection lens",
      description: "Choose perspectives for coaching feedback.",
    });
  }

  if (canUseReflectionFeatures) {
    links.push({
      href: "/insights",
      label: "Insights",
      description: "Review patterns across plans and reflections.",
    });
  }

  if (canUseTherapyThoughts) {
    links.push({
      href: "/therapy-thoughts",
      label: "Therapy thoughts",
      description: "Browse thoughts saved from day plans.",
    });
  }

  if (links.length === 0) {
    return null;
  }

  return (
    <SettingsSection title="Reflection & coaching">
      <ul className="space-y-3">
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className="ui-text-link text-sm font-medium">
              {link.label}
            </Link>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-light">
              {link.description}
            </p>
          </li>
        ))}
      </ul>
    </SettingsSection>
  );
}

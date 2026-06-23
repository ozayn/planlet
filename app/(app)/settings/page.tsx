import Link from "next/link";

import { auth } from "@/auth";
import { PageHeader } from "@/components/page-header";
import { SettingsAppNotifications } from "@/components/settings/settings-app-notifications";
import { getNotificationPreferencesForUser } from "@/lib/notification-preferences";
import { PlanItemViewSettings } from "@/components/settings/plan-item-view-settings";
import { SettingsInstallPlanlet } from "@/components/settings/settings-install-planlet";
import { SettingsProfile } from "@/components/settings/settings-profile";
import { SettingsReflectionCoaching } from "@/components/settings/settings-reflection-coaching";
import { SettingsSection } from "@/components/settings/settings-section";
import { TaskOrganizationDisplaySettings } from "@/components/settings/task-organization-display-settings";
import { SettingsTechnicalInfo } from "@/components/settings/settings-technical-info";
import { SettingsTimezone } from "@/components/settings/settings-timezone";
import { PRODUCT } from "@/config/product";
import { APP_TIMEZONE } from "@/config/time";
import {
  isImageExtractionConfigured,
  isOpenAIConfigured,
  isTextParserConfigured,
} from "@/lib/env";
import {
  canUseCoachingFeatures,
  canUseReflectionFeatures,
  canUseTherapyThoughts,
} from "@/lib/roles";
import { getPlanningPreferencesForUser } from "@/lib/user-preferences";
import { getUserTimezone } from "@/lib/user-timezone";

export default async function SettingsPage() {
  const session = await auth();
  const textParserConfigured = isTextParserConfigured();
  const openaiConfigured = isOpenAIConfigured();
  const imageExtractionConfigured = isImageExtractionConfigured();
  const planningPreferences = session?.user?.id
    ? await getPlanningPreferencesForUser(session.user.id)
    : { planItemView: "CHECKLIST" as const, taskOrganizationDisplay: "ASSIGNED_ONLY" as const };
  const userTimezone = session?.user?.id
    ? await getUserTimezone(session.user.id)
    : APP_TIMEZONE;
  const timezoneMode = session?.user?.timezoneMode ?? "AUTOMATIC";
  const notificationPreferences = session?.user?.id
    ? await getNotificationPreferencesForUser(session.user.id)
    : null;
  const user = session?.user ?? {};
  const showReflectionCoaching =
    canUseCoachingFeatures(user) ||
    canUseReflectionFeatures(user) ||
    canUseTherapyThoughts(user);

  return (
    <section className="ui-settings-page mx-auto max-w-lg space-y-5">
      <PageHeader title="Settings" subtitle="Account and preferences." />

      <SettingsProfile
        name={session?.user?.name}
        email={session?.user?.email}
        image={session?.user?.image}
      />

      <SettingsSection title="Planning" className="space-y-5">
        <PlanItemViewSettings value={planningPreferences.planItemView} />
        <TaskOrganizationDisplaySettings
          value={planningPreferences.taskOrganizationDisplay}
        />
        <p className="border-t border-border-soft pt-4 text-sm">
          <Link href="/themes" className="ui-text-link">
            Manage themes & projects
          </Link>
        </p>
      </SettingsSection>

      {session?.user?.id ? (
        <SettingsTimezone timezone={userTimezone} timezoneMode={timezoneMode} />
      ) : null}

      {showReflectionCoaching ? (
        <SettingsReflectionCoaching
          canUseCoachingFeatures={canUseCoachingFeatures(user)}
          canUseReflectionFeatures={canUseReflectionFeatures(user)}
          canUseTherapyThoughts={canUseTherapyThoughts(user)}
        />
      ) : null}

      {notificationPreferences ? (
        <SettingsAppNotifications preferences={notificationPreferences} />
      ) : null}

      <SettingsInstallPlanlet />

      <SettingsTechnicalInfo
        rows={[
          { label: "Name", value: PRODUCT.name },
          { label: "Your timezone", value: userTimezone },
          { label: "Fallback timezone", value: APP_TIMEZONE },
          {
            label: "AI parsing",
            value: textParserConfigured ? "Available" : "Not configured",
          },
          {
            label: "Audio transcription",
            value: openaiConfigured ? "Available" : "Not configured",
          },
          {
            label: "Image text extraction",
            value: imageExtractionConfigured ? "Available" : "Not configured",
          },
        ]}
      />
    </section>
  );
}

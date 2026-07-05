import Link from "next/link";

import { auth } from "@/auth";
import { PageHeader } from "@/components/page-header";
import { SettingsAppNotifications } from "@/components/settings/settings-app-notifications";
import { getNotificationPreferencesForUser } from "@/lib/notification-preferences";
import { MobileNavSettings } from "@/components/settings/mobile-nav-settings";
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
  canUseBodyJourneyFeatures,
  canUseCareerJourneyFeatures,
  canUseCoachingFeatures,
  canUseJobTrackerFeatures,
  canUseLearningJourneyFeatures,
  canUseLifeLabFeatures,
  canUseReflectionFeatures,
  canUseTherapyThoughts,
} from "@/lib/roles";
import { getPlanningPreferencesForUser, getMobileNavItemsForUser } from "@/lib/user-preferences";
import { resolveMobileNavItems } from "@/lib/mobile-nav";
import { getUserTimezone } from "@/lib/user-timezone";
import { isAdminRole } from "@/lib/auth-roles";

export default async function SettingsPage() {
  const session = await auth();
  const isAdmin = isAdminRole(session?.user?.role);
  const access = {
    isAdmin,
    canUseCoachingFeatures: canUseCoachingFeatures(session?.user ?? {}),
    canUseBodyJourneyFeatures: canUseBodyJourneyFeatures(session?.user ?? {}),
    canUseLearningJourneyFeatures: canUseLearningJourneyFeatures(
      session?.user ?? {},
    ),
    canUseLifeLabFeatures: canUseLifeLabFeatures(session?.user ?? {}),
    canUseJobTrackerFeatures: canUseJobTrackerFeatures(session?.user ?? {}),
    canUseCareerJourneyFeatures: canUseCareerJourneyFeatures(
      session?.user ?? {},
    ),
  };
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
  const mobileNavItems = session?.user?.id
    ? resolveMobileNavItems(
        await getMobileNavItemsForUser(session.user.id),
        access,
      )
    : resolveMobileNavItems([], access);
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
        <MobileNavSettings value={mobileNavItems} access={access} />
      ) : null}

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

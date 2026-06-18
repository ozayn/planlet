import { auth } from "@/auth";
import { PageHeader } from "@/components/page-header";
import { SettingsAppNotifications } from "@/components/settings/settings-app-notifications";
import { getNotificationPreferencesForUser } from "@/lib/notification-preferences";
import { PlanItemViewSettings } from "@/components/settings/plan-item-view-settings";
import { SettingsProfile } from "@/components/settings/settings-profile";
import { SettingsReflectionFeatures } from "@/components/settings/settings-reflection-features";
import { SettingsReflectionLens } from "@/components/settings/settings-reflection-lens";
import { SettingsSection } from "@/components/settings/settings-section";
import { SettingsTechnicalInfo } from "@/components/settings/settings-technical-info";
import { SettingsTimezone } from "@/components/settings/settings-timezone";
import { ThemeToggle } from "@/components/theme-toggle";
import { PRODUCT } from "@/config/product";
import { APP_TIMEZONE } from "@/config/time";
import {
  isImageExtractionConfigured,
  isOpenAIConfigured,
  isTextParserConfigured,
} from "@/lib/env";
import { getReflectionInfluencePreferencesForUser } from "@/lib/reflection-influence-preferences";
import {
  canGiveFeedback,
  canUseCoachingFeatures,
  canUseReflectionFeatures,
} from "@/lib/roles";
import { getPlanItemViewForUser } from "@/lib/user-preferences";
import { getUserTimezone } from "@/lib/user-timezone";

export default async function SettingsPage() {
  const session = await auth();
  const textParserConfigured = isTextParserConfigured();
  const openaiConfigured = isOpenAIConfigured();
  const imageExtractionConfigured = isImageExtractionConfigured();
  const planItemView = session?.user?.id
    ? await getPlanItemViewForUser(session.user.id)
    : "CHECKLIST";
  const userTimezone = session?.user?.id
    ? await getUserTimezone(session.user.id)
    : APP_TIMEZONE;
  const timezoneMode = session?.user?.timezoneMode ?? "AUTOMATIC";
  const notificationPreferences = session?.user?.id
    ? await getNotificationPreferencesForUser(session.user.id)
    : null;
  const showCoaching = canUseCoachingFeatures(session?.user ?? {});
  const reflectionPreferences =
    session?.user?.id && showCoaching
      ? await getReflectionInfluencePreferencesForUser(
          session.user.id,
          session.user,
        )
      : { primary: [], secondary: [] };

  return (
    <section className="ui-settings-page mx-auto max-w-lg space-y-5">
      <PageHeader title="Settings" subtitle="Account and preferences." />

      <SettingsProfile
        name={session?.user?.name}
        email={session?.user?.email}
        image={session?.user?.image}
      />

      <SettingsSection title="Appearance">
        <ThemeToggle variant="full" />
        <p className="text-xs text-muted-light">
          On desktop, theme is also in the header. On mobile, use the profile
          menu.
        </p>
      </SettingsSection>

      <PlanItemViewSettings value={planItemView} />

      {session?.user?.id ? (
        <SettingsTimezone timezone={userTimezone} timezoneMode={timezoneMode} />
      ) : null}

      {(canGiveFeedback(session?.user ?? {}) ||
        canUseReflectionFeatures(session?.user ?? {}) ||
        showCoaching) &&
      session?.user?.role ? (
        <SettingsReflectionFeatures
          role={session.user.role}
          canGiveFeedback={session.user.canGiveFeedback}
          canUseReflectionFeatures={session.user.canUseReflectionFeatures}
          canUseCoachingFeatures={showCoaching}
        />
      ) : null}

      {showCoaching ? (
        <SettingsReflectionLens preferences={reflectionPreferences} />
      ) : null}

      {notificationPreferences ? (
        <SettingsAppNotifications preferences={notificationPreferences} />
      ) : null}

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

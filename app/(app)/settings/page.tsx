import { auth } from "@/auth";
import { PageHeader } from "@/components/page-header";
import { SettingsAppNotifications } from "@/components/settings/settings-app-notifications";
import { PlanItemViewSettings } from "@/components/settings/plan-item-view-settings";
import { SettingsProfile } from "@/components/settings/settings-profile";
import { SettingsSection } from "@/components/settings/settings-section";
import { SettingsTechnicalInfo } from "@/components/settings/settings-technical-info";
import { ThemeToggle } from "@/components/theme-toggle";
import { PRODUCT } from "@/config/product";
import { APP_TIMEZONE } from "@/config/time";
import {
  isImageExtractionConfigured,
  isOpenAIConfigured,
  isTextParserConfigured,
} from "@/lib/env";
import { getPlanItemViewForUser } from "@/lib/user-preferences";

export default async function SettingsPage() {
  const session = await auth();
  const textParserConfigured = isTextParserConfigured();
  const openaiConfigured = isOpenAIConfigured();
  const imageExtractionConfigured = isImageExtractionConfigured();
  const planItemView = session?.user?.id
    ? await getPlanItemViewForUser(session.user.id)
    : "CHECKLIST";

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
      </SettingsSection>

      <PlanItemViewSettings value={planItemView} />

      <SettingsAppNotifications />

      <SettingsTechnicalInfo
        rows={[
          { label: "Name", value: PRODUCT.name },
          { label: "Timezone", value: APP_TIMEZONE },
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

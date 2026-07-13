import Link from "next/link";

import { SignOutButton } from "@/components/sign-out-button";
import { ActivityTimerPresetSettings } from "@/components/settings/activity-timer-preset-settings";
import { MobileNavSettings } from "@/components/settings/mobile-nav-settings";
import { PlanItemViewSettings } from "@/components/settings/plan-item-view-settings";
import { ReadingDensitySettings } from "@/components/settings/reading-density-settings";
import { SettingsAppNotifications } from "@/components/settings/settings-app-notifications";
import { SettingsBlock } from "@/components/settings/settings-group";
import { SettingsInstallPlanlet } from "@/components/settings/settings-install-planlet";
import { SettingsProfile } from "@/components/settings/settings-profile";
import { SettingsReadAloud } from "@/components/settings/settings-read-aloud";
import { SettingsReflectionCoaching } from "@/components/settings/settings-reflection-coaching";
import { SettingsTechnicalInfo } from "@/components/settings/settings-technical-info";
import { SettingsThemeControl } from "@/components/settings/settings-theme-control";
import { SettingsTimezone } from "@/components/settings/settings-timezone";
import { TaskOrganizationDisplaySettings } from "@/components/settings/task-organization-display-settings";
import type { SettingsPageData } from "@/lib/settings/load-context";
import { getSettingsCategory } from "@/lib/settings/registry";
import type { SettingsCategorySlug } from "@/lib/settings/types";

type SettingsCategoryContentProps = {
  slug: SettingsCategorySlug;
  data: SettingsPageData;
};

export function SettingsCategoryContent({
  slug,
  data,
}: SettingsCategoryContentProps) {
  const category = getSettingsCategory(slug);

  if (!category || !category.isAvailable(data.access)) {
    return null;
  }

  switch (slug) {
    case "appearance":
      return (
        <div className="ui-settings-category-stack">
          <SettingsBlock id="theme" title="Theme">
            <SettingsThemeControl />
          </SettingsBlock>
          {data.access.isSignedIn ? (
            <SettingsBlock id="reading-density" title="Reading density">
              <ReadingDensitySettings
                value={data.readingDensity}
                embedded
              />
            </SettingsBlock>
          ) : null}
        </div>
      );
    case "ai":
      return (
        <div className="ui-settings-category-stack">
          <SettingsBlock
            id="ai-parsing"
            title="AI capabilities"
            description="Server-side features available on this deployment."
          >
            <SettingsTechnicalInfo rows={data.technicalInfoRows.slice(4)} embedded />
          </SettingsBlock>
        </div>
      );
    case "voice-audio":
      return data.readAloudPreferences ? (
        <div className="ui-settings-category-stack">
          <SettingsBlock id="narration-provider" title="Read aloud">
            <SettingsReadAloud
              preferences={data.readAloudPreferences}
              openAiNarrationAvailable={data.openAiNarrationAvailable}
              embedded
            />
          </SettingsBlock>
        </div>
      ) : null;
    case "timer":
      return data.activityTimerPresetSettings ? (
        <div className="ui-settings-category-stack">
          <SettingsBlock id="timer-presets" title="Activity presets">
            <ActivityTimerPresetSettings
              data={data.activityTimerPresetSettings}
              embedded
            />
          </SettingsBlock>
        </div>
      ) : null;
    case "life-lab":
      return (
        <div className="ui-settings-category-stack">
          {data.access.canUseLifeLabFeatures ? (
            <SettingsBlock
              id="reading-preferences"
              title="Reading preferences"
              description="More Life Lab reading options are coming soon."
            >
              <p className="ui-settings-future-note">
                Diagram, playlist, and study preferences will live here.
              </p>
            </SettingsBlock>
          ) : null}
          {data.access.showReflectionCoaching ? (
            <SettingsBlock id="reflection-coaching" title="Reflection & coaching">
              <SettingsReflectionCoaching
                canUseCoachingFeatures={data.reflectionCoaching.canUseCoachingFeatures}
                canUseReflectionFeatures={
                  data.reflectionCoaching.canUseReflectionFeatures
                }
                canUseTherapyThoughts={data.reflectionCoaching.canUseTherapyThoughts}
                embedded
              />
            </SettingsBlock>
          ) : null}
        </div>
      );
    case "planner":
      return (
        <div className="ui-settings-category-stack">
          {data.access.isSignedIn ? (
            <>
              <SettingsBlock id="timezone" title="Timezone">
                <SettingsTimezone
                  timezone={data.userTimezone}
                  timezoneMode={data.timezoneMode}
                  embedded
                />
              </SettingsBlock>
              <SettingsBlock id="item-style" title="Item style">
                <PlanItemViewSettings
                  value={data.planningPreferences.planItemView}
                  embedded
                />
              </SettingsBlock>
              <SettingsBlock id="task-organization" title="Task organization">
                <TaskOrganizationDisplaySettings
                  value={data.planningPreferences.taskOrganizationDisplay}
                  embedded
                />
              </SettingsBlock>
              <SettingsBlock id="quick-access-tabs" title="Quick access tabs">
                <MobileNavSettings
                  value={data.mobileNavItems}
                  access={data.appNavAccess}
                  embedded
                />
              </SettingsBlock>
              <SettingsBlock id="themes-projects" title="Themes & projects">
                <Link href="/themes" className="ui-text-link text-sm font-medium">
                  Manage themes & projects
                </Link>
              </SettingsBlock>
            </>
          ) : null}
        </div>
      );
    case "notifications":
      return data.notificationPreferences ? (
        <div className="ui-settings-category-stack">
          <SettingsBlock id="push-notifications" title="Notifications">
            <SettingsAppNotifications
              preferences={data.notificationPreferences}
              embedded
            />
          </SettingsBlock>
        </div>
      ) : null;
    case "account":
      return data.access.isSignedIn ? (
        <div className="ui-settings-category-stack">
          <SettingsBlock id="profile" title="Profile">
            <SettingsProfile
              name={data.session?.user?.name}
              email={data.session?.user?.email}
              image={data.session?.user?.image}
              embedded
            />
          </SettingsBlock>
          <SettingsBlock id="sign-out" title="Sign out">
            <SignOutButton variant="quiet" />
          </SettingsBlock>
        </div>
      ) : null;
    case "about":
      return (
        <div className="ui-settings-category-stack">
          <SettingsBlock id="install-app" title="Install">
            <SettingsInstallPlanlet embedded />
          </SettingsBlock>
          <SettingsBlock id="technical-info" title="Technical info">
            <SettingsTechnicalInfo rows={data.technicalInfoRows} embedded />
          </SettingsBlock>
        </div>
      );
    default:
      return null;
  }
}

"use client";

import { PushNotificationSettings } from "@/components/notifications/push-notification-settings";
import { SettingsInstallPlanlet } from "@/components/settings/settings-install-planlet";
import { SettingsSection } from "@/components/settings/settings-section";

export function SettingsAppNotifications() {
  return (
    <SettingsSection title="App & notifications">
      <SettingsInstallPlanlet />
      <PushNotificationSettings embedded />
    </SettingsSection>
  );
}

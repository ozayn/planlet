"use client";

import { PushNotificationSettings } from "@/components/notifications/push-notification-settings";
import { SettingsSection } from "@/components/settings/settings-section";

export function SettingsAppNotifications() {
  return (
    <SettingsSection title="App & notifications">
      <div className="ui-settings-row-block">
        <p className="text-sm font-medium text-foreground">Install Planlet</p>
        <p className="text-xs text-muted-light">
          Use Add to Home Screen for the best mobile experience.
        </p>
      </div>
      <PushNotificationSettings embedded />
    </SettingsSection>
  );
}

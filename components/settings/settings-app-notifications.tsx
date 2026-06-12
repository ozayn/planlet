"use client";

import { useState } from "react";

import { PushNotificationSettings } from "@/components/notifications/push-notification-settings";
import { ReminderSettings } from "@/components/settings/reminder-settings";
import { SettingsInstallPlanlet } from "@/components/settings/settings-install-planlet";
import { SettingsSection } from "@/components/settings/settings-section";
import type { SerializedNotificationPreferences } from "@/lib/notification-preferences";

type SettingsAppNotificationsProps = {
  preferences: SerializedNotificationPreferences;
};

export function SettingsAppNotifications({
  preferences,
}: SettingsAppNotificationsProps) {
  const [pushSubscribed, setPushSubscribed] = useState(false);

  return (
    <SettingsSection title="App & notifications">
      <SettingsInstallPlanlet />
      <PushNotificationSettings
        embedded
        onSubscriptionChange={setPushSubscribed}
      />
      <ReminderSettings
        preferences={preferences}
        pushSubscribed={pushSubscribed}
      />
    </SettingsSection>
  );
}

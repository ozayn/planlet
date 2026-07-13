"use client";

import { useState } from "react";

import { PushNotificationSettings } from "@/components/notifications/push-notification-settings";
import { ReminderSettings } from "@/components/settings/reminder-settings";
import { SettingsSection } from "@/components/settings/settings-section";
import type { SerializedNotificationPreferences } from "@/lib/notification-preferences";

type SettingsAppNotificationsProps = {
  preferences: SerializedNotificationPreferences;
  embedded?: boolean;
};

export function SettingsAppNotifications({
  preferences,
  embedded = false,
}: SettingsAppNotificationsProps) {
  const [pushSubscribed, setPushSubscribed] = useState(false);

  const content = (
    <>
      <PushNotificationSettings
        embedded
        showInstallHints={false}
        onSubscriptionChange={setPushSubscribed}
      />
      <ReminderSettings
        preferences={preferences}
        pushSubscribed={pushSubscribed}
      />
    </>
  );

  if (embedded) {
    return content;
  }

  return <SettingsSection title="Notifications">{content}</SettingsSection>;
}

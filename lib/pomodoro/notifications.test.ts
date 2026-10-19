import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, it } from "node:test";

import { POMODORO_NOTIFICATION_TAG, POMODORO_OPEN_PATH } from "@/lib/pomodoro/constants";
import {
  claimPomodoroNotificationDelivery,
  getPomodoroNotificationCopy,
  pomodoroNotificationTagForPhase,
} from "@/lib/pomodoro/notifications";

describe("pomodoro notification copy", () => {
  it("uses focus and break copy without task titles", () => {
    const focus = getPomodoroNotificationCopy("focus-complete");
    assert.equal(focus.title, "Focus complete");
    assert.equal(focus.body, "Time for a short break.");
    assert.doesNotMatch(focus.body, /task|meeting|planlet/i);

    const brk = getPomodoroNotificationCopy("break-complete");
    assert.equal(brk.title, "Break complete");
    assert.equal(brk.body, "Ready for another focus session?");
  });

  it("scopes notification tags by transition token", () => {
    assert.equal(
      pomodoroNotificationTagForPhase("abc"),
      `${POMODORO_NOTIFICATION_TAG}-abc`,
    );
    assert.equal(pomodoroNotificationTagForPhase(null), POMODORO_NOTIFICATION_TAG);
    assert.equal(pomodoroNotificationTagForPhase("  "), POMODORO_NOTIFICATION_TAG);
  });

  it("targets /pomodoro on open", () => {
    assert.equal(POMODORO_OPEN_PATH, "/pomodoro");
  });
});

describe("pomodoro notification delivery claim", () => {
  const store = new Map<string, string>();

  afterEach(() => {
    store.clear();
    // @ts-expect-error test shim
    delete globalThis.window;
  });

  it("allows the first delivery and blocks duplicates for the same token", () => {
    // @ts-expect-error test shim
    globalThis.window = {
      localStorage: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => {
          store.set(key, value);
        },
      },
    };

    assert.equal(claimPomodoroNotificationDelivery("phase-1"), true);
    assert.equal(claimPomodoroNotificationDelivery("phase-1"), false);
    assert.equal(claimPomodoroNotificationDelivery("phase-2"), true);
  });

  it("allows test notifications without a token", () => {
    // @ts-expect-error test shim
    globalThis.window = {
      localStorage: {
        getItem: () => null,
        setItem: () => undefined,
      },
    };

    assert.equal(claimPomodoroNotificationDelivery(null), true);
    assert.equal(claimPomodoroNotificationDelivery(undefined), true);
  });
});

describe("pomodoro notification delivery wiring", () => {
  const root = join(import.meta.dirname, "../..");

  it("prefers an active service worker and confirms via getNotifications", () => {
    const notifications = readFileSync(
      join(root, "lib/pomodoro/notifications.ts"),
      "utf8",
    );
    const pushClient = readFileSync(join(root, "lib/push-client.ts"), "utf8");
    const settings = readFileSync(
      join(root, "components/settings/pomodoro-settings.tsx"),
      "utf8",
    );

    assert.match(notifications, /registerPushServiceWorker/);
    assert.match(notifications, /showNotification/);
    assert.match(notifications, /getNotifications/);
    assert.match(notifications, /confirmed/);
    assert.match(notifications, /showTestPomodoroNotification/);
    assert.doesNotMatch(notifications, /Test notification sent/);
    assert.match(pushClient, /scope: "\/"/);
    assert.match(pushClient, /service worker activation timed out/i);
    assert.match(settings, /Notification shown/);
    assert.doesNotMatch(settings, /Test notification sent/);
    assert.match(settings, /NODE_ENV === "development"/);
    assert.match(settings, /diagnostics/);
  });
});

import assert from "node:assert/strict";
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

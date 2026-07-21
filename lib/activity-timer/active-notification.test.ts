import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import {
  buildActiveTimerNotificationBody,
  buildActiveTimerNotificationPayload,
  buildCompletedTimerNotificationPayload,
  shouldRefreshActiveTimerNotification,
} from "@/lib/activity-timer/active-notification";
import {
  ACTIVITY_TIMER_ACTIVE_NOTIFICATION_TAG,
  ACTIVITY_TIMER_OPEN_PATH,
  MIN_TIMER_SESSION_SECONDS,
  type SerializedActiveActivityTimerSession,
} from "@/lib/activity-timer/constants";
import { shouldSaveTimerSession } from "@/lib/activity-timer/countdown";

const root = join(import.meta.dirname, "../..");

function session(
  partial: Partial<SerializedActiveActivityTimerSession> = {},
): SerializedActiveActivityTimerSession {
  return {
    id: "session-1",
    title: "Tidy room",
    presetId: null,
    category: "Chores",
    startedAt: "2026-07-08T12:00:00.000Z",
    notes: null,
    targetDurationSeconds: null,
    timerMode: "countUp",
    pausedAt: null,
    accumulatedPausedSeconds: 0,
    sessionNotes: [],
    ...partial,
  };
}

describe("activity timer minimum duration", () => {
  it("discards sessions under 30 seconds and saves at the threshold", () => {
    assert.equal(MIN_TIMER_SESSION_SECONDS, 30);
    assert.equal(shouldSaveTimerSession(29), false);
    assert.equal(shouldSaveTimerSession(30), true);
    assert.equal(shouldSaveTimerSession(31), true);
  });
});

describe("activity timer active notifications", () => {
  it("builds count-up, countdown, paused, and completion copy", () => {
    const nowMs = new Date("2026-07-08T12:12:34.000Z").getTime();

    assert.equal(
      buildActiveTimerNotificationBody(session(), nowMs),
      "Tidy room · 12:34 elapsed",
    );
    assert.equal(
      buildActiveTimerNotificationBody(
        session({
          title: "Tongue extension",
          timerMode: "countDown",
          targetDurationSeconds: 40,
          startedAt: "2026-07-08T12:00:00.000Z",
        }),
        new Date("2026-07-08T12:00:22.000Z").getTime(),
      ),
      "Tongue extension · 0:18 remaining",
    );
    assert.equal(
      buildActiveTimerNotificationBody(
        session({
          pausedAt: "2026-07-08T12:05:00.000Z",
          startedAt: "2026-07-08T12:00:00.000Z",
        }),
        new Date("2026-07-08T12:10:00.000Z").getTime(),
      ),
      "Tidy room · Paused at 5:00",
    );
    assert.deepEqual(buildCompletedTimerNotificationPayload("Tongue extension"), {
      kind: "complete",
      title: "Planlet Timer",
      body: "Tongue extension complete",
      url: ACTIVITY_TIMER_OPEN_PATH,
      tag: ACTIVITY_TIMER_ACTIVE_NOTIFICATION_TAG,
      renotify: false,
      requireInteraction: false,
    });
  });

  it("uses a stable tag and open path without private notes", () => {
    const payload = buildActiveTimerNotificationPayload(
      session({ notes: "private reflection" }),
      new Date("2026-07-08T12:01:00.000Z").getTime(),
    );

    assert.equal(payload.tag, "planlet-active-timer");
    assert.equal(payload.url, "/timer?active=1");
    assert.equal(payload.renotify, false);
    assert.doesNotMatch(payload.body, /private reflection/);
  });

  it("refreshes count-up every minute and countdown at thresholds", () => {
    assert.equal(
      shouldRefreshActiveTimerNotification({
        elapsedSeconds: 60,
        previousElapsedSeconds: 59,
        timerMode: "countUp",
      }),
      true,
    );
    assert.equal(
      shouldRefreshActiveTimerNotification({
        elapsedSeconds: 61,
        previousElapsedSeconds: 60,
        timerMode: "countUp",
      }),
      false,
    );
    assert.equal(
      shouldRefreshActiveTimerNotification({
        elapsedSeconds: 30,
        previousElapsedSeconds: 29,
        timerMode: "countDown",
        targetDurationSeconds: 40,
      }),
      true,
    );
  });

  it("wires stop endpoint, service worker actions, and settings enable path", () => {
    const sw = readFileSync(join(root, "public/sw.js"), "utf8");
    const stopRoute = readFileSync(
      join(root, "app/api/activity-timer/active/stop/route.ts"),
      "utf8",
    );
    const settings = readFileSync(
      join(root, "components/settings/active-timer-notification-settings.tsx"),
      "utf8",
    );
    const core = readFileSync(join(root, "lib/activity-timer.ts"), "utf8");

    assert.match(sw, /action === "stop-timer"/);
    assert.match(sw, /\/api\/activity-timer\/active\/stop/);
    assert.match(sw, /\/timer\?active=1/);
    assert.match(sw, /client\.navigate/);
    assert.match(stopRoute, /stopActiveActivityTimerSession/);
    assert.match(stopRoute, /auth\(\)/);
    assert.match(settings, /requestActiveTimerNotificationPermission/);
    assert.match(settings, /Enable/);
    assert.match(core, /shouldSaveTimerSession\(durationSeconds\)/);
    assert.match(core, /outcome: "discarded"/);
    assert.match(
      core,
      /if \(!shouldSaveTimerSession\(durationSeconds\)\) \{\s*await discardActiveTimerSession/,
    );
    assert.doesNotMatch(
      core,
      /stoppedAt,\s*durationSeconds,[\s\S]*under_minimum/,
    );
  });
});

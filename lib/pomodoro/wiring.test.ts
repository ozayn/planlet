import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

describe("Pomodoro feature wiring", () => {
  const root = join(import.meta.dirname, "../..");

  it("exposes /pomodoro route with feature gate", () => {
    const page = readFileSync(
      join(root, "app/(app)/pomodoro/page.tsx"),
      "utf8",
    );
    assert.match(page, /canUsePomodoroFeatures/);
    assert.match(page, /PomodoroPage/);
    assert.match(page, /getPomodoroPageData/);
  });

  it("keeps Pomodoro sessions separate from Activity Timer models", () => {
    const schema = readFileSync(join(root, "prisma/schema.prisma"), "utf8");
    assert.match(schema, /model PomodoroActiveRun/);
    assert.match(schema, /model PomodoroFocusLog/);
    assert.match(schema, /model PomodoroPreference/);
    assert.match(schema, /model PomodoroActivity/);
    assert.match(schema, /canUsePomodoroFeatures/);
    const activitySessionBlock = schema.match(
      /model ActivityTimerSession \{[^}]+\}/,
    )?.[0];
    assert.ok(activitySessionBlock);
    assert.doesNotMatch(activitySessionBlock, /pomodoro/i);
  });

  it("loads today's Daily Plan tasks and manages favorites separately", () => {
    const lib = readFileSync(join(root, "lib/pomodoro.ts"), "utf8");
    const todayTasks = readFileSync(
      join(root, "lib/pomodoro/today-tasks.ts"),
      "utf8",
    );
    const activities = readFileSync(
      join(root, "lib/pomodoro/activities.ts"),
      "utf8",
    );
    const page = readFileSync(
      join(root, "components/pomodoro/pomodoro-page.tsx"),
      "utf8",
    );
    const settings = readFileSync(
      join(root, "components/settings/settings-category-content.tsx"),
      "utf8",
    );

    assert.match(lib, /listTodayPlanTaskOptions/);
    assert.match(lib, /listPomodoroActivities/);
    assert.match(todayTasks, /getDayPlan/);
    assert.match(todayTasks, /getTodayDateString/);
    assert.doesNotMatch(lib, /updatePlanItemStatus/);
    assert.match(activities, /createPomodoroActivity/);
    assert.match(page, /Choose today/);
    assert.match(page, /Show completed/);
    assert.match(page, /Today/);
    assert.match(settings, /Manage activities/);
    assert.match(settings, /PomodoroActivitySettings/);
  });

  it("registers settings and nav keys", () => {
    const registry = readFileSync(
      join(root, "lib/settings/registry.ts"),
      "utf8",
    );
    const appNav = readFileSync(join(root, "lib/app-nav.ts"), "utf8");
    const mobileNav = readFileSync(join(root, "lib/mobile-nav.ts"), "utf8");

    assert.match(registry, /slug: "pomodoro"/);
    assert.match(appNav, /"pomodoro"/);
    assert.match(appNav, /\/pomodoro/);
    assert.match(mobileNav, /pomodoro: "Pomodoro"/);
  });

  it("reuses Activity Timer countdown math and ring", () => {
    const page = readFileSync(
      join(root, "components/pomodoro/pomodoro-page.tsx"),
      "utf8",
    );
    const lib = readFileSync(join(root, "lib/pomodoro.ts"), "utf8");

    assert.match(page, /ActivityTimerRing/);
    assert.match(page, /useActivityTimerClock/);
    assert.match(lib, /activeElapsedSecondsFromSession/);
    assert.match(lib, /shouldSaveTimerSession/);
  });

  it("wires remaining-time adjustment without changing global defaults", () => {
    const adjust = readFileSync(
      join(root, "lib/pomodoro/adjust-remaining.ts"),
      "utf8",
    );
    const lib = readFileSync(join(root, "lib/pomodoro.ts"), "utf8");
    const actions = readFileSync(
      join(root, "app/(app)/pomodoro/actions.ts"),
      "utf8",
    );
    const page = readFileSync(
      join(root, "components/pomodoro/pomodoro-page.tsx"),
      "utf8",
    );

    const adjustFnStart = lib.indexOf(
      "export async function adjustPomodoroRemaining",
    );
    const adjustFnEnd = lib.indexOf(
      "export async function skipPomodoroBreak",
      adjustFnStart,
    );
    const adjustFn = lib.slice(adjustFnStart, adjustFnEnd);

    assert.match(adjust, /computeAdjustedPomodoroTarget/);
    assert.match(adjustFn, /export async function adjustPomodoroRemaining/);
    assert.match(adjustFn, /computeAdjustedPomodoroTarget/);
    assert.match(adjustFn, /syncPomodoroPushSchedule/);
    assert.match(adjustFn, /requiresExplicitFinish/);
    assert.match(adjustFn, /awaiting_next/);
    assert.doesNotMatch(adjustFn, /upsertPomodoroPreferences/);
    assert.doesNotMatch(adjustFn, /createFocusLog/);
    assert.match(actions, /adjustPomodoroRemainingAction/);
    assert.match(page, /adjustPomodoroRemainingAction/);
    assert.match(page, /canAdjustRemaining/);
    // Visible while a session exists (running/paused/awaiting), not only isTiming.
    assert.match(
      page,
      /canAdjustRemaining = Boolean\(run && !needsExplicitFinish\)/,
    );
    assert.doesNotMatch(page, /canAdjustRemaining = Boolean\(isTiming &&/);
    assert.match(page, /aria-label="Adjust remaining time"/);
    assert.match(page, /clockAction/);
    assert.match(page, /AdjustTimePopover/);
    assert.match(page, /Escape/);
    assert.doesNotMatch(page, /AdjustTimeButton/);
    assert.doesNotMatch(page, /ui-pomodoro-clock-with-edit/);
    assert.doesNotMatch(page, /ui-pomodoro-adjust-time-anchor/);
    assert.doesNotMatch(page, /Pencil/);
    assert.match(page, /−5 min/);
    assert.match(page, /\+5 min/);
    assert.match(page, /Custom/);
    assert.match(page, /Finish/);
    assert.match(page, /DurationMinutesInput/);

    const ring = readFileSync(
      join(root, "components/activity-timer/activity-timer-ring.tsx"),
      "utf8",
    );
    assert.match(ring, /clockAction/);
    assert.match(ring, /Adjust remaining time/);
  });

  it("wires Skip break for short and long breaks without logging the break", () => {
    const lib = readFileSync(join(root, "lib/pomodoro.ts"), "utf8");
    const actions = readFileSync(
      join(root, "app/(app)/pomodoro/actions.ts"),
      "utf8",
    );
    const page = readFileSync(
      join(root, "components/pomodoro/pomodoro-page.tsx"),
      "utf8",
    );

    const skipFnStart = lib.indexOf("export async function skipPomodoroBreak");
    const skipFnEnd = lib.indexOf(
      "export async function stopPomodoroRun",
      skipFnStart,
    );
    const skipFn = lib.slice(skipFnStart, skipFnEnd);

    assert.match(skipFn, /export async function skipPomodoroBreak/);
    assert.match(skipFn, /Only breaks can be skipped/);
    assert.match(skipFn, /awaiting_next/);
    assert.match(skipFn, /cancelPomodoroPushJobByToken/);
    assert.match(skipFn, /cancelPendingPomodoroPushJobs/);
    assert.match(skipFn, /status: "awaiting_next"/);
    assert.match(skipFn, /phase: "focus"/);
    assert.match(skipFn, /nextFocusStateAfterBreak/);
    assert.doesNotMatch(skipFn, /createFocusLog/);
    assert.doesNotMatch(skipFn, /showPomodoroPhaseNotification/);
    assert.doesNotMatch(skipFn, /schedulePomodoroPhasePush/);
    assert.match(actions, /skipPomodoroBreakAction/);
    assert.match(page, /skipPomodoroBreakAction/);
    assert.match(page, /showSkipBreak/);
    assert.match(page, />\s*Skip\s*</);
    assert.match(page, /Start break/);
    assert.match(page, /isBreakPhase\(phase\)/);
    // Skip stays available while awaiting Start break (not gated on !awaiting).
    assert.match(
      page,
      /showSkipBreak = Boolean\(\s*run && isBreakPhase\(phase\) && !needsExplicitFinish,\s*\)/,
    );
    assert.match(page, /awaiting && isBreakPhase\(phase\)[\s\S]*skipBreakButton/);
  });

  it("offers a compact desktop/PWA timer layout without changing countdown logic", () => {
    const page = readFileSync(
      join(root, "components/pomodoro/pomodoro-page.tsx"),
      "utf8",
    );
    const constants = readFileSync(
      join(root, "lib/pomodoro/constants.ts"),
      "utf8",
    );
    const css = readFileSync(join(root, "app/globals.css"), "utf8");

    assert.match(constants, /POMODORO_COMPACT_STORAGE_KEY/);
    assert.match(page, /compactMode/);
    assert.match(page, /ui-pomodoro-compact/);
    assert.match(page, /ui-pomodoro-compact-clock/);
    assert.match(page, /Standard view/);
    assert.match(page, /Compact mode/);
    assert.match(page, /data-pomodoro-compact/);
    assert.match(page, /ActivityTimerRing/);
    assert.match(css, /html\[data-pomodoro-compact="true"\]/);
    assert.match(css, /\.ui-pomodoro-compact-clock/);
    assert.match(css, /\.ui-pomodoro-clock-action/);
    assert.doesNotMatch(css, /\.ui-pomodoro-clock-with-edit/);
    assert.doesNotMatch(css, /\.ui-pomodoro-adjust-time-anchor/);
    assert.match(css, /overflow-x:\s*hidden/);
    assert.match(css, /max-width:\s*24rem/);
    // Narrow desktop windows (≈320–380px): fluid clock, no fixed wide chrome.
    assert.match(css, /clamp\(2\.75rem,\s*18vw,\s*3\.75rem\)/);
  });

  it("schedules persistent Pomodoro push jobs via the reminders cron", () => {
    const schema = readFileSync(join(root, "prisma/schema.prisma"), "utf8");
    const cronScript = readFileSync(
      join(root, "scripts/run-reminders-cron.ts"),
      "utf8",
    );
    const pushJobs = readFileSync(
      join(root, "lib/pomodoro/push-jobs.ts"),
      "utf8",
    );
    const sw = readFileSync(join(root, "public/sw.js"), "utf8");
    const docs = readFileSync(join(root, "docs/PUSH_NOTIFICATIONS.md"), "utf8");

    assert.match(schema, /model PomodoroPushJob/);
    assert.match(cronScript, /runPomodoroPushCron/);
    assert.match(pushJobs, /schedulePomodoroPhasePush/);
    assert.match(pushJobs, /dispatchDuePomodoroPushJobs/);
    assert.match(sw, /kind: payload\.kind/);
    assert.match(docs, /Pomodoro completion notifications/);
    assert.match(docs, /Local development vs Railway/);
    assert.match(docs, /Do not claim reliable background delivery/);
    assert.match(docs, /Test notification/);
    assert.match(sw, /showNotification/);
    assert.match(sw, /notificationclick/);
  });
});

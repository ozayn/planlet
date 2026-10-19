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
    assert.match(docs, /Pomodoro completion push/);
    assert.match(docs, /Do not claim reliable background delivery/);
  });
});

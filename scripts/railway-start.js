const { execSync } = require("node:child_process");

const serviceKind = process.env.PLANLET_SERVICE_KIND?.trim().toLowerCase();
const serviceName = (
  process.env.RAILWAY_SERVICE_NAME ||
  process.env.RAILWAY_SERVICE_ID ||
  ""
).toLowerCase();

const isReminders =
  serviceKind === "reminders" || serviceName.includes("reminders");

const command = isReminders ? "npm run cron:reminders" : "npm run start";

const commit = process.env.RAILWAY_GIT_COMMIT_SHA?.slice(0, 7) || "(local)";

console.log(
  `[railway-start] commit=${commit} serviceKind=${serviceKind ?? "(unset)"} serviceName=${serviceName || "(unset)"} -> ${command}`,
);

execSync(command, { stdio: "inherit" });

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

console.log(
  `[railway-start] serviceKind=${serviceKind ?? "(unset)"} serviceName=${serviceName || "(unset)"} -> ${command}`,
);

execSync(command, { stdio: "inherit" });

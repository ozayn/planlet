export type LifeLabLogLevel = "off" | "error" | "summary" | "verbose";

const LEVEL_RANK: Record<LifeLabLogLevel, number> = {
  off: 0,
  error: 1,
  summary: 2,
  verbose: 3,
};

export function getDefaultLifeLabLogLevel(): LifeLabLogLevel {
  return process.env.NODE_ENV === "production" ? "error" : "summary";
}

export function parseLifeLabLogLevel(
  value: string | null | undefined,
): LifeLabLogLevel | null {
  const normalized = value?.trim().toLowerCase();

  if (
    normalized === "off" ||
    normalized === "error" ||
    normalized === "summary" ||
    normalized === "verbose"
  ) {
    return normalized;
  }

  return null;
}

export function getLifeLabLogLevel(): LifeLabLogLevel {
  return (
    parseLifeLabLogLevel(process.env.LIFE_LAB_LOG_LEVEL) ??
    getDefaultLifeLabLogLevel()
  );
}

export function lifeLabLogEnabled(
  minimum: LifeLabLogLevel,
  level: LifeLabLogLevel = getLifeLabLogLevel(),
): boolean {
  return LEVEL_RANK[level] >= LEVEL_RANK[minimum];
}

/** Test override — clear with `resetLifeLabLogLevelForTests()`. */
let testOverride: LifeLabLogLevel | null = null;

export function setLifeLabLogLevelForTests(level: LifeLabLogLevel | null): void {
  testOverride = level;
}

export function resetLifeLabLogLevelForTests(): void {
  testOverride = null;
}

export function resolveLifeLabLogLevel(): LifeLabLogLevel {
  return testOverride ?? getLifeLabLogLevel();
}

export function shouldLogLifeLab(
  minimum: LifeLabLogLevel,
): boolean {
  return lifeLabLogEnabled(minimum, resolveLifeLabLogLevel());
}

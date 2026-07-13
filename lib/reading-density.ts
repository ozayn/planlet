import type { ReadingDensity } from "@/app/generated/prisma/client";

export type ReadingDensityValue = "compact" | "comfortable";

export const READING_DENSITY_VALUES: ReadingDensityValue[] = [
  "compact",
  "comfortable",
];

export const READING_DENSITY_OPTIONS: Array<{
  value: ReadingDensityValue;
  label: string;
  description: string;
}> = [
  {
    value: "compact",
    label: "Compact",
    description: "More information on screen.",
  },
  {
    value: "comfortable",
    label: "Comfortable",
    description: "Larger typography and more breathing room.",
  },
];

export function isReadingDensityValue(value: string): value is ReadingDensityValue {
  return READING_DENSITY_VALUES.includes(value as ReadingDensityValue);
}

export function readingDensityFromPrisma(
  value: ReadingDensity | null | undefined,
): ReadingDensityValue {
  return value === "COMFORTABLE" ? "comfortable" : "compact";
}

export function readingDensityToPrisma(
  value: ReadingDensityValue,
): ReadingDensity {
  return value === "comfortable" ? "COMFORTABLE" : "COMPACT";
}

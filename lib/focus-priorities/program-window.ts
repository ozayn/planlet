import { addMonths, format } from "date-fns";

import { isValidDateString } from "@/lib/dates";

export const BETTERME_CALISTHENICS_TITLE = "BetterMe Calisthenics";
export const DEFAULT_PROGRAM_WINDOW_MONTHS = 3;

/**
 * Inclusive end date for an N-month program starting on `startDate`
 * (YYYY-MM-DD). Same calendar day N months later.
 */
export function programEndDateFromStart(
  startDate: string,
  windowMonths: number = DEFAULT_PROGRAM_WINDOW_MONTHS,
): string {
  if (!isValidDateString(startDate)) {
    throw new Error("Invalid program start date.");
  }
  if (!Number.isFinite(windowMonths) || windowMonths < 1 || windowMonths > 36) {
    throw new Error("Program window must be between 1 and 36 months.");
  }
  const [year, month, day] = startDate.split("-").map(Number);
  return format(addMonths(new Date(year, month - 1, day), windowMonths), "yyyy-MM-dd");
}

export type ProgramWindowGate =
  | { active: true }
  | {
      active: false;
      reason: "not_configured" | "before_start" | "after_end";
    };

/**
 * Whether `dayDate` (YYYY-MM-DD, user timezone) is inside the program window.
 * Priorities without a program window stay active whenever auto-add is on.
 */
export function evaluateProgramWindow(input: {
  dayDate: string;
  programWindowMonths: number | null | undefined;
  programStartsOn: string | null | undefined;
  programEndsOn: string | null | undefined;
}): ProgramWindowGate {
  const windowMonths = input.programWindowMonths ?? null;
  if (windowMonths == null) {
    return { active: true };
  }

  const start = input.programStartsOn?.trim() || null;
  const end = input.programEndsOn?.trim() || null;

  if (!start || !end) {
    return { active: false, reason: "not_configured" };
  }

  if (input.dayDate < start) {
    return { active: false, reason: "before_start" };
  }
  if (input.dayDate > end) {
    return { active: false, reason: "after_end" };
  }
  return { active: true };
}

export function sanitizeOptionalDateString(
  value: string | null | undefined,
): string | null {
  const trimmed = value?.trim() || null;
  if (!trimmed) {
    return null;
  }
  if (!isValidDateString(trimmed)) {
    throw new Error("Use YYYY-MM-DD for program dates.");
  }
  return trimmed;
}

/**
 * Normalize editable program dates. When a window length is set and start is
 * provided without end, derive end from start + months. Never invents a start.
 */
export function normalizeProgramWindowInput(input: {
  programWindowMonths?: number | null;
  programStartsOn?: string | null;
  programEndsOn?: string | null;
}): {
  programWindowMonths: number | null;
  programStartsOn: string | null;
  programEndsOn: string | null;
} {
  const rawMonths = input.programWindowMonths;
  const programWindowMonths =
    rawMonths == null || Number.isNaN(rawMonths)
      ? null
      : Math.round(rawMonths);

  if (
    programWindowMonths != null &&
    (programWindowMonths < 1 || programWindowMonths > 36)
  ) {
    throw new Error("Program window must be between 1 and 36 months.");
  }

  let programStartsOn = sanitizeOptionalDateString(input.programStartsOn);
  let programEndsOn = sanitizeOptionalDateString(input.programEndsOn);

  if (programWindowMonths != null && programStartsOn && !programEndsOn) {
    programEndsOn = programEndDateFromStart(
      programStartsOn,
      programWindowMonths,
    );
  }

  if (programStartsOn && programEndsOn && programEndsOn < programStartsOn) {
    throw new Error("Program end must be on or after the start date.");
  }

  return { programWindowMonths, programStartsOn, programEndsOn };
}

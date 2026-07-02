import type { PlanItemStatus } from "@/app/generated/prisma/client";
import { formatInTimeZone } from "date-fns-tz";

import { APP_TIMEZONE } from "@/config/time";
import {
  formatDayPlanDisplayDate,
  parseDateString,
  shiftDateString,
} from "@/lib/dates";

const MOVED_TO_PREFIX = "Moved to ";
const MOVED_DESTINATION_SEARCH_DAYS = 120;

export function formatCompactPlanDate(planDate: string): string {
  return formatInTimeZone(parseDateString(planDate), APP_TIMEZONE, "MMM d");
}

/** Parse destination date from the move note appended by movePlanItemToDate. */
export function parseMovedToDateFromComment(
  comment: string | null | undefined,
  sourcePlanDate: string,
): string | null {
  if (!comment) {
    return null;
  }

  const movedLine = comment
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.startsWith(MOVED_TO_PREFIX));

  if (!movedLine) {
    return null;
  }

  const destinationLabel = movedLine.slice(MOVED_TO_PREFIX.length).trim();
  if (!destinationLabel) {
    return null;
  }

  for (
    let delta = -MOVED_DESTINATION_SEARCH_DAYS;
    delta <= MOVED_DESTINATION_SEARCH_DAYS;
    delta += 1
  ) {
    const candidate = shiftDateString(sourcePlanDate, delta);
    if (formatDayPlanDisplayDate(candidate) === destinationLabel) {
      return candidate;
    }
  }

  return null;
}

export function buildUnfinishedTaskMetadataLine(input: {
  status: PlanItemStatus;
  planDate: string;
  assignmentLabel: string | null;
  parentTitle: string | null;
  comment: string | null;
}): string {
  const parts: string[] = [];
  const compactDate = formatCompactPlanDate(input.planDate);

  if (input.status === "MOVED") {
    const movedToDate = parseMovedToDateFromComment(
      input.comment,
      input.planDate,
    );

    if (movedToDate && movedToDate !== input.planDate) {
      parts.push(
        `Moved from ${compactDate} → ${formatCompactPlanDate(movedToDate)}`,
      );
    } else {
      parts.push(`Moved from ${compactDate}`);
    }
  } else if (input.status === "PARTIAL") {
    parts.push(compactDate, "Partial");
  } else if (input.status === "SKIPPED") {
    parts.push(compactDate, "Skipped");
  } else {
    parts.push(compactDate);
  }

  if (input.assignmentLabel) {
    parts.push(input.assignmentLabel);
  }

  if (input.parentTitle) {
    parts.push(`Subtask of ${input.parentTitle}`);
  }

  return parts.join(" · ");
}

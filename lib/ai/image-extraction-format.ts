import type { PlanItemStatus, PlanItemType } from "@/app/generated/prisma/client";

import { resolveDateHint } from "@/lib/ai/date-hints";

export type ImageItemHintStatus =
  | "OPEN"
  | "DONE"
  | "PARTIAL"
  | "NOT_DONE"
  | "MOVED"
  | "SKIPPED"
  | "RELEASED"
  | "UNKNOWN";

export type ImageItemHintType =
  | "TASK"
  | "NOTE"
  | "INTENTION"
  | "UNKNOWN";

export type ImageItemHint = {
  text: string;
  status: ImageItemHintStatus;
  type: ImageItemHintType;
  dateRawText?: string;
  confidence?: "LOW" | "MEDIUM" | "HIGH";
};

export type ImageExtractionStructured = {
  text: string;
  removedHeaderLines?: string[];
  possibleTitle?: string | null;
  itemHints?: ImageItemHint[];
  multipleDateSectionsDetected?: boolean;
};

export function statusMarkerForHint(
  status: ImageItemHintStatus,
): string | null {
  switch (status) {
    case "DONE":
      return "✅";
    case "OPEN":
      return "☐";
    case "PARTIAL":
      return "◐";
    case "NOT_DONE":
      return "❌";
    default:
      return null;
  }
}

function isTaskLikeHint(hint: ImageItemHint): boolean {
  return hint.type === "TASK" || hint.type === "UNKNOWN";
}

export function formatItemHintsAsText(itemHints: ImageItemHint[]): string {
  const lines: string[] = [];
  let currentSection: string | null = null;

  for (const hint of itemHints) {
    const text = hint.text.trim();
    if (!text) {
      continue;
    }

    const sectionLabel = hint.dateRawText?.trim();
    if (sectionLabel && sectionLabel !== currentSection) {
      if (lines.length > 0) {
        lines.push("");
      }

      lines.push(sectionLabel);
      currentSection = sectionLabel;
    }

    if (!isTaskLikeHint(hint)) {
      lines.push(text);
      continue;
    }

    const marker = statusMarkerForHint(hint.status);
    lines.push(marker ? `${marker} ${text}` : text);
  }

  return lines.join("\n").trim();
}

function collectDistinctDateStrings(
  removedHeaderLines: string[],
  itemHints: ImageItemHint[],
  primaryDateString?: string,
): Set<string> {
  const dates = new Set<string>();

  if (primaryDateString) {
    dates.add(primaryDateString);
  }

  for (const line of removedHeaderLines) {
    const resolved = resolveDateHint(line);
    if (resolved.dateString) {
      dates.add(resolved.dateString);
    }
  }

  for (const hint of itemHints) {
    if (!hint.dateRawText?.trim()) {
      continue;
    }

    const resolved = resolveDateHint(hint.dateRawText);
    if (resolved.dateString) {
      dates.add(resolved.dateString);
    }
  }

  return dates;
}

export function detectMultipleDateSections(input: {
  removedHeaderLines?: string[];
  itemHints?: ImageItemHint[];
  primaryDateString?: string;
  multipleDateSectionsDetected?: boolean;
}): boolean {
  if (input.multipleDateSectionsDetected) {
    return true;
  }

  const removedHeaderLines = input.removedHeaderLines ?? [];
  const itemHints = input.itemHints ?? [];
  const sectionLabels = new Set<string>();

  for (const line of removedHeaderLines) {
    const trimmed = line.trim();
    if (trimmed) {
      sectionLabels.add(trimmed);
    }
  }

  for (const hint of itemHints) {
    const label = hint.dateRawText?.trim();
    if (label) {
      sectionLabels.add(label);
    }
  }

  if (sectionLabels.size > 1) {
    return true;
  }

  const distinctDates = collectDistinctDateStrings(
    removedHeaderLines,
    itemHints,
    input.primaryDateString,
  );

  return distinctDates.size > 1;
}

export function buildTextareaContentFromExtraction(
  extraction: ImageExtractionStructured,
): string {
  if (extraction.itemHints?.length) {
    const formatted = formatItemHintsAsText(extraction.itemHints);
    if (formatted) {
      return formatted;
    }
  }

  return extraction.text.trim();
}

export function mapHintStatusToPlanStatus(
  status: ImageItemHintStatus,
): PlanItemStatus | undefined {
  switch (status) {
    case "OPEN":
    case "DONE":
    case "PARTIAL":
    case "NOT_DONE":
    case "MOVED":
    case "SKIPPED":
    case "RELEASED":
      return status;
    default:
      return undefined;
  }
}

export function mapHintTypeToPlanType(
  type: ImageItemHintType,
): PlanItemType | undefined {
  switch (type) {
    case "TASK":
      return "TASK";
    case "NOTE":
      return "NOTE";
    case "INTENTION":
      return "INTENTION";
    default:
      return undefined;
  }
}

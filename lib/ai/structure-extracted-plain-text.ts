import type { PlanLanguage } from "@/app/generated/prisma/client";

import {
  cleanImportedPlanText,
  dateHintFromRemovedHeaders,
} from "@/lib/ai/clean-imported-plan-text";
import { resolveDateHint } from "@/lib/ai/date-hints";
import type {
  ExtractImageTextResult,
  ImageDateHint,
} from "@/lib/ai/image-text-extraction-types";
import {
  detectMultipleDateSections,
  type ImageItemHint,
  type ImageItemHintStatus,
} from "@/lib/ai/image-extraction-format";
import { APP_TIMEZONE } from "@/config/time";

const CHECKBOX_LINE_PATTERN =
  /^(\s*)(✅|☑|✓|☐|□|◐|▢)\s+(.+)$/u;

function inferLanguage(text: string): PlanLanguage {
  const persian = (text.match(/[\u0600-\u06FF]/g) ?? []).length;
  const latin = (text.match(/[a-zA-Z]/g) ?? []).length;

  if (persian > 0 && latin > 0) {
    return "MIXED";
  }

  if (persian > latin) {
    return "FA";
  }

  if (latin > persian) {
    return "EN";
  }

  return persian > 0 ? "FA" : "UNKNOWN";
}

function statusFromMarker(marker: string): ImageItemHintStatus {
  if (marker === "✅" || marker === "☑" || marker === "✓") {
    return "DONE";
  }

  if (marker === "◐") {
    return "PARTIAL";
  }

  if (marker === "☐" || marker === "□" || marker === "▢") {
    return "OPEN";
  }

  return "UNKNOWN";
}

function parseItemHintsFromPlainText(text: string): ImageItemHint[] {
  const hints: ImageItemHint[] = [];
  let currentSection: string | undefined;

  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }

    const markerMatch = trimmed.match(CHECKBOX_LINE_PATTERN);
    if (markerMatch) {
      hints.push({
        text: markerMatch[3].trim(),
        status: statusFromMarker(markerMatch[2]),
        type: "UNKNOWN",
        dateRawText: currentSection,
      });
      continue;
    }

    const resolved = resolveDateHint(trimmed);
    if (
      resolved.dateString &&
      trimmed.length <= 60 &&
      !trimmed.startsWith("-")
    ) {
      currentSection = trimmed;
    }
  }

  return hints;
}

function buildDateHint(
  removedHeaderLines: string[],
  rawText: string,
  now = new Date(),
): ImageDateHint {
  const headerHint = dateHintFromRemovedHeaders(removedHeaderLines);

  if (headerHint?.dateString) {
    return {
      detected: true,
      rawText: headerHint.rawText,
      dateString: headerHint.dateString,
      confidence: headerHint.confidence,
      explanation: headerHint.explanation,
    };
  }

  for (const line of rawText.split(/\r?\n/).slice(0, 6)) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }

    const resolved = resolveDateHint(trimmed, now, APP_TIMEZONE);
    if (resolved.dateString && resolved.confidence !== "LOW") {
      return {
        detected: true,
        rawText: trimmed,
        dateString: resolved.dateString,
        confidence: resolved.confidence,
        explanation: resolved.explanation,
      };
    }
  }

  return { detected: false, confidence: "LOW" };
}

export function structureExtractedPlainText(
  rawText: string,
  now = new Date(),
): ExtractImageTextResult {
  const trimmed = rawText.trim();
  const itemHints = parseItemHintsFromPlainText(trimmed);
  const cleaned = cleanImportedPlanText(trimmed);
  const dateHint = buildDateHint(cleaned.removedHeaderLines, trimmed, now);

  const multipleDateSectionsDetected = detectMultipleDateSections({
    removedHeaderLines: cleaned.removedHeaderLines,
    itemHints,
    primaryDateString: dateHint.dateString,
  });

  const text = cleaned.cleanedText.trim();

  if (!text) {
    throw new Error("No text could be extracted from the image.");
  }

  return {
    text,
    language: inferLanguage(text),
    dateHint,
    removedHeaderLines: cleaned.removedHeaderLines,
    possibleTitle: cleaned.possibleTitle,
    itemHints,
    multipleDateSectionsDetected,
  };
}

import type {
  PlanItemStatus,
  PlanItemType,
  PlanLanguage,
  PlanType,
  ShareExportFormat,
  TimeHint,
} from "@/app/generated/prisma/client";

import { formatPlanPeriodForShare } from "@/lib/dates";
import { isDefaultPlanTitle } from "@/lib/plan-title";
import {
  getSimpleShareStatusMarker,
  getStatusIcon,
} from "@/lib/plan-status";

export { formatPlanPeriodForShare } from "@/lib/dates";

export type ShareLanguage = "fa" | "en";

export type SharePlanItem = {
  title: string;
  status: PlanItemStatus;
  type: PlanItemType;
  timeHint?: TimeHint | null;
  comment?: string | null;
  shareable: boolean;
  subtasks?: SharePlanItem[];
};

export type SharePlan = {
  title: string;
  type: PlanType;
  summary?: string | null;
  language?: PlanLanguage;
  dateStart: Date;
  dateEnd: Date;
  items: SharePlanItem[];
};

export type ShareHeaderOptions = {
  mode: ShareMode;
  style: ShareRenderStyle;
};

export type ShareMode = "PLAN" | "UPDATE";

export type ShareRenderStyle = "pretty" | "simple";

export type SharePlanOptions = {
  format: ShareExportFormat;
  mode?: ShareMode;
  includeSubtasks?: boolean;
};

export type ShareSectionKey =
  | "tasks"
  | "social"
  | "morning"
  | "afternoon"
  | "evening"
  | "intentions"
  | "notes";

export type ShareSection = {
  key: ShareSectionKey;
  label: string;
  items: SharePlanItem[];
};

const SECTION_ORDER: ShareSectionKey[] = [
  "tasks",
  "social",
  "morning",
  "afternoon",
  "evening",
  "intentions",
  "notes",
];

const SECTION_LABELS: Record<ShareLanguage, Record<ShareSectionKey, string>> = {
  fa: {
    tasks: "کارها",
    social: "بیرون / اجتماعی",
    morning: "صبح",
    afternoon: "بعدازظهر",
    evening: "عصر / شب",
    intentions: "اهداف / نیت‌ها",
    notes: "یادداشت‌ها",
  },
  en: {
    tasks: "Tasks",
    social: "Outside / social",
    morning: "Morning",
    afternoon: "Afternoon",
    evening: "Evening",
    intentions: "Intentions",
    notes: "Notes & reflections",
  },
};

const SIMPLE_SECTION_LABELS: Record<ShareLanguage, Record<ShareSectionKey, string>> = {
  fa: {
    tasks: "کارها",
    social: "بیرون / اجتماعی",
    morning: "صبح",
    afternoon: "بعدازظهر",
    evening: "عصر / شب",
    intentions: "اهداف / نیت‌ها",
    notes: "یادداشت‌ها",
  },
  en: {
    tasks: "Tasks",
    social: "Outside / social",
    morning: "Morning",
    afternoon: "Afternoon",
    evening: "Evening",
    intentions: "Intentions",
    notes: "Notes",
  },
};

const UPDATE_STATUS_ORDER: PlanItemStatus[] = [
  "DONE",
  "PARTIAL",
  "NOT_DONE",
  "MOVED",
  "SKIPPED",
  "RELEASED",
];

const UPDATE_STATUS_LABELS: Record<ShareLanguage, Record<PlanItemStatus, string>> = {
  fa: {
    OPEN: "باقی‌مانده",
    DONE: "انجام‌شده",
    PARTIAL: "در جریان",
    NOT_DONE: "انجام نشد",
    MOVED: "منتقل‌شده",
    SKIPPED: "ردشده",
    RELEASED: "رها شده",
  },
  en: {
    OPEN: "Remaining",
    DONE: "Done",
    PARTIAL: "In progress",
    NOT_DONE: "Not done",
    MOVED: "Moved",
    SKIPPED: "Skipped",
    RELEASED: "Released",
  },
};

function countPersianArabicChars(text: string): number {
  return (text.match(/[\u0600-\u06FF]/g) ?? []).length;
}

function countLatinChars(text: string): number {
  return (text.match(/[a-zA-Z]/g) ?? []).length;
}

function collectShareableText(plan: SharePlan): string {
  const parts = [plan.title, plan.summary ?? ""];

  for (const item of plan.items) {
    if (item.shareable) {
      parts.push(item.title, item.comment ?? "");
      for (const subtask of item.subtasks ?? []) {
        if (subtask.shareable) {
          parts.push(subtask.title);
        }
      }
    }
  }

  return parts.join(" ");
}

export function inferShareLanguage(plan: SharePlan): ShareLanguage {
  if (plan.language === "FA") return "fa";
  if (plan.language === "EN") return "en";

  const text = collectShareableText(plan);
  const persian = countPersianArabicChars(text);
  const latin = countLatinChars(text);

  if (persian > latin) return "fa";
  if (latin > persian) return "en";
  return persian > 0 ? "fa" : "en";
}

function shareableItems(items: SharePlanItem[]): SharePlanItem[] {
  return items.filter((item) => item.shareable);
}

function assignSection(item: SharePlanItem): ShareSectionKey {
  if (item.type === "INTENTION") return "intentions";
  if (item.type === "NOTE") return "notes";
  if (item.type === "SOCIAL" || item.type === "EVENT") return "social";
  if (item.timeHint === "MORNING") return "morning";
  if (item.timeHint === "AFTERNOON") return "afternoon";
  if (item.timeHint === "EVENING") return "evening";
  if (item.type === "REST") return "evening";
  return "tasks";
}

export function groupPlanItemsForShare(
  plan: SharePlan,
  lang?: ShareLanguage,
  style: ShareRenderStyle = "pretty",
): ShareSection[] {
  const language = lang ?? inferShareLanguage(plan);
  const labels =
    style === "simple" ? SIMPLE_SECTION_LABELS[language] : SECTION_LABELS[language];
  const buckets = new Map<ShareSectionKey, SharePlanItem[]>();

  for (const key of SECTION_ORDER) {
    buckets.set(key, []);
  }

  for (const item of shareableItems(plan.items)) {
    const section = assignSection(item);
    buckets.get(section)?.push(item);
  }

  return SECTION_ORDER.map((key) => ({
    key,
    label: labels[key],
    items: buckets.get(key) ?? [],
  })).filter((section) => section.items.length > 0);
}

function getRenderStyle(
  format: ShareExportFormat,
  mode: ShareMode,
): ShareRenderStyle {
  if (mode === "UPDATE") {
    return "simple";
  }
  return format === "PLAIN_TEXT" ? "simple" : "pretty";
}

function titleSeparator(style: ShareRenderStyle): string {
  return style === "pretty" ? " — " : " - ";
}

function formatSectionHeader(label: string, style: ShareRenderStyle): string {
  return style === "pretty" ? label : `${label}:`;
}

function formatPrettyItemTitle(item: SharePlanItem): string {
  if (item.type === "NOTE") {
    return `• ${item.title}`;
  }
  if (item.type === "INTENTION") {
    return `✨ ${item.title}`;
  }
  return `${getStatusIcon(item.status)} ${item.title}`;
}

function formatSimpleItemTitle(item: SharePlanItem, indent = ""): string {
  if (item.type === "NOTE" || item.type === "INTENTION") {
    return `${indent}- ${item.title}`;
  }

  const marker = getSimpleShareStatusMarker(item.status);
  const prefix = marker ? `${marker} ` : "";
  return `${indent}- ${prefix}${item.title}`;
}

function formatItemLine(
  item: SharePlanItem,
  style: ShareRenderStyle,
  mode: ShareMode,
  indent = "",
): string {
  if (style === "simple") {
    let line = formatSimpleItemTitle(item, indent);
    if (mode === "UPDATE" && item.comment?.trim()) {
      line += ` — ${item.comment.trim()}`;
    }
    return line;
  }

  const line = formatPrettyItemTitle(item);
  if (mode === "UPDATE" && item.comment?.trim()) {
    return `${line} — ${item.comment.trim()}`;
  }
  return indent ? `${indent}${line}` : line;
}

function formatSubtaskLines(
  subtasks: SharePlanItem[] | undefined,
  style: ShareRenderStyle,
  mode: ShareMode,
): string[] {
  const lines: string[] = [];
  const indent = style === "simple" ? "  " : "  ";

  for (const subtask of shareableItems(subtasks ?? [])) {
    lines.push(formatItemLine(subtask, style, mode, indent));
  }

  return lines;
}

export function isAutoGeneratedPlanTitle(plan: SharePlan): boolean {
  return isDefaultPlanTitle(
    plan.title,
    plan.type,
    plan.dateStart,
    plan.dateEnd,
  );
}

/** Copy/export header: period only for auto titles; title + period for custom titles. */
export function buildCopyHeader(
  plan: SharePlan,
  options: ShareHeaderOptions,
): string {
  const period = formatPlanPeriodForShare(plan);
  const { mode, style } = options;
  const separator = titleSeparator(style);
  const leaf = style === "pretty" ? " 🌿" : "";

  if (mode === "UPDATE") {
    const lang = inferShareLanguage(plan);
    if (lang === "fa") {
      return `آپدیت${separator}${period}${leaf}`;
    }
    return `Update${separator}${period}${leaf}`;
  }

  if (isAutoGeneratedPlanTitle(plan)) {
    return `${period}${leaf}`;
  }

  return `${plan.title.trim()}${separator}${period}${leaf}`;
}

export function buildShareHeader(
  plan: SharePlan,
  options: ShareHeaderOptions,
): string {
  return buildCopyHeader(plan, options);
}

function renderGroupedBody(
  plan: SharePlan,
  options: SharePlanOptions,
  lang: ShareLanguage,
  style: ShareRenderStyle,
): string[] {
  const mode = options.mode ?? "PLAN";
  const includeSubtasks = options.includeSubtasks ?? true;
  const sections = groupPlanItemsForShare(plan, lang, style);
  const lines: string[] = [];

  for (const section of sections) {
    if (section.items.length === 0) continue;

    lines.push(formatSectionHeader(section.label, style));

    for (const item of section.items) {
      lines.push(formatItemLine(item, style, mode));
      if (includeSubtasks && item.subtasks?.length) {
        lines.push(...formatSubtaskLines(item.subtasks, style, mode));
      }
    }

    lines.push("");
  }

  return lines;
}

function isUpdateCandidate(item: SharePlanItem): boolean {
  if (item.type === "NOTE" || item.type === "INTENTION") {
    return false;
  }
  return item.status !== "OPEN";
}

function collectUpdateItems(items: SharePlanItem[]): SharePlanItem[] {
  const result: SharePlanItem[] = [];

  for (const item of shareableItems(items)) {
    if (isUpdateCandidate(item)) {
      result.push(item);
    }

    if (item.subtasks?.length) {
      result.push(...collectUpdateItems(item.subtasks));
    }
  }

  return result;
}

function renderUpdateBody(plan: SharePlan, lang: ShareLanguage): string[] {
  const items = collectUpdateItems(plan.items);
  const lines: string[] = [];

  for (const status of UPDATE_STATUS_ORDER) {
    const grouped = items.filter((item) => item.status === status);
    if (grouped.length === 0) continue;

    lines.push(`${UPDATE_STATUS_LABELS[lang][status]}:`);

    for (const item of grouped) {
      lines.push(formatSimpleItemTitle(item));
    }

    lines.push("");
  }

  return lines;
}

function formatPlanShare(
  plan: SharePlan,
  options: SharePlanOptions,
): string {
  const mode = options.mode ?? "PLAN";
  const style = getRenderStyle(options.format, mode);
  const lang = inferShareLanguage(plan);
  const header = buildShareHeader(plan, { mode, style });

  const body =
    mode === "UPDATE"
      ? renderUpdateBody(plan, lang)
      : renderGroupedBody(plan, options, lang, style);

  const lines = [header, "", ...body];

  if (plan.summary && mode === "PLAN") {
    lines.splice(2, 0, plan.summary, "");
  }

  return lines.join("\n").trim();
}

export function generateShareText(
  plan: SharePlan,
  options: SharePlanOptions,
): string {
  const mode =
    options.mode ?? (options.format === "SUMMARY" ? "UPDATE" : "PLAN");

  return formatPlanShare(plan, { ...options, mode });
}

export type ShareUiFormat = "plan" | "plain" | "update";

export const SHARE_UI_FORMAT_META: Record<
  ShareUiFormat,
  { label: string; description: string }
> = {
  plan: {
    label: "Pretty plan",
    description: "Sections, icons, and readable layout for messaging.",
  },
  plain: {
    label: "Simple text",
    description: "Flat bullet list with no decoration.",
  },
  update: {
    label: "Progress update",
    description: "Done, partial, and skipped items only.",
  },
};

export function shareUiFormatToOptions(format: ShareUiFormat): SharePlanOptions {
  switch (format) {
    case "plain":
      return { format: "PLAIN_TEXT", mode: "PLAN" };
    case "update":
      return { format: "SUMMARY", mode: "UPDATE" };
    case "plan":
    default:
      return { format: "TELEGRAM", mode: "PLAN" };
  }
}

export function shareUiFormatToExportFormat(
  format: ShareUiFormat,
): ShareExportFormat {
  switch (format) {
    case "plain":
      return "PLAIN_TEXT";
    case "update":
      return "SUMMARY";
    case "plan":
    default:
      return "TELEGRAM";
  }
}

export function serializedPlanToSharePlan(plan: {
  title: string;
  type: PlanType;
  summary: string | null;
  language: PlanLanguage;
  dateStart: string;
  dateEnd: string;
  items: Array<{
    title: string;
    status: PlanItemStatus;
    type: PlanItemType;
    timeHint: TimeHint | null;
    comment: string | null;
    shareable: boolean;
    subtasks: Array<{
      title: string;
      status: PlanItemStatus;
      type: PlanItemType;
      timeHint: TimeHint | null;
      comment: string | null;
      shareable: boolean;
    }>;
  }>;
}): SharePlan {
  const mapItem = (
    item: (typeof plan.items)[number] | (typeof plan.items)[number]["subtasks"][number],
  ): SharePlanItem => ({
    title: item.title,
    status: item.status,
    type: item.type,
    timeHint: item.timeHint,
    comment: item.comment,
    shareable: item.shareable,
    subtasks:
      "subtasks" in item && item.subtasks
        ? item.subtasks.map(mapItem)
        : undefined,
  });

  return {
    title: plan.title,
    type: plan.type,
    summary: plan.summary,
    language: plan.language,
    dateStart: new Date(plan.dateStart),
    dateEnd: new Date(plan.dateEnd),
    items: plan.items.map(mapItem),
  };
}

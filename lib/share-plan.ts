import type {
  PlanItemStatus,
  PlanItemType,
  PlanLanguage,
  PlanType,
  ShareExportFormat,
  TimeHint,
} from "@/app/generated/prisma/client";

import { formatPlanPeriodForShare } from "@/lib/dates";
import { getStatusIcon } from "@/lib/plan-status";

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
};

export type ShareMode = "PLAN" | "UPDATE";

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
    notes: "Notes",
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
): ShareSection[] {
  const language = lang ?? inferShareLanguage(plan);
  const labels = SECTION_LABELS[language];
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

function getIntentionIcon(status: PlanItemStatus): string {
  if (status === "DONE" || status === "PARTIAL") {
    return "✨";
  }
  return "•";
}

function getItemIcon(item: SharePlanItem, mode: ShareMode): string {
  if (item.type === "INTENTION" && mode === "PLAN") {
    return getIntentionIcon(item.status);
  }
  return getStatusIcon(item.status);
}

function formatItemTitle(item: SharePlanItem, mode: ShareMode): string {
  const icon = getItemIcon(item, mode);
  let line = `${icon} ${item.title}`;

  if (mode === "UPDATE" && item.comment?.trim()) {
    line += ` — ${item.comment.trim()}`;
  }

  return line;
}

function formatSubtaskLines(
  subtasks: SharePlanItem[] | undefined,
  mode: ShareMode,
  subtaskPrefix: string,
): string[] {
  const lines: string[] = [];

  for (const subtask of shareableItems(subtasks ?? [])) {
    lines.push(`${subtaskPrefix}${formatItemTitle(subtask, mode)}`);
  }

  return lines;
}

function shouldIncludeInUpdate(item: SharePlanItem): boolean {
  if (item.type === "INTENTION") return true;
  return item.status !== "OPEN";
}

function filterItemsForMode(
  items: SharePlanItem[],
  mode: ShareMode,
): SharePlanItem[] {
  if (mode === "PLAN") {
    return items;
  }
  return items.filter(shouldIncludeInUpdate);
}

function titleAlreadyIncludesPeriod(title: string, period: string): boolean {
  const normalizedTitle = title.toLowerCase();
  const normalizedPeriod = period.toLowerCase();
  return normalizedTitle.includes(normalizedPeriod);
}

export function buildShareHeader(
  plan: SharePlan,
  options: ShareHeaderOptions,
): string {
  const period = formatPlanPeriodForShare(plan);
  const mode = options.mode;

  if (mode === "UPDATE") {
    const lang = inferShareLanguage(plan);
    if (lang === "fa") {
      return `آپدیت — ${period} 🌿`;
    }
    return `Update — ${period} 🌿`;
  }

  switch (plan.type) {
    case "DAY": {
      if (titleAlreadyIncludesPeriod(plan.title, period)) {
        return `${plan.title} 🌿`;
      }
      return `${plan.title} — ${period} 🌿`;
    }
    case "MONTH": {
      const header = `${period} plan 🌿`;
      if (titleAlreadyIncludesPeriod(plan.title, period)) {
        return plan.title.endsWith("🌿") ? plan.title : `${plan.title} 🌿`;
      }
      return header;
    }
    case "YEAR": {
      const header = `${period} plan 🌿`;
      if (titleAlreadyIncludesPeriod(plan.title, period)) {
        return plan.title.endsWith("🌿") ? plan.title : `${plan.title} 🌿`;
      }
      return header;
    }
    case "WEEK":
      return `Week of ${period} 🌿`;
    default:
      return `${plan.title} — ${period} 🌿`;
  }
}

function renderGroupedBody(
  plan: SharePlan,
  options: SharePlanOptions,
  lang: ShareLanguage,
): string[] {
  const mode = options.mode ?? "PLAN";
  const includeSubtasks = options.includeSubtasks ?? true;
  const subtaskPrefix = options.format === "PLAIN_TEXT" ? "  - " : "  ";
  const sections = groupPlanItemsForShare(plan, lang);
  const lines: string[] = [];

  for (const section of sections) {
    const items = filterItemsForMode(section.items, mode);
    if (items.length === 0) continue;

    lines.push(`${section.label}:`);

    for (const item of items) {
      lines.push(formatItemTitle(item, mode));
      if (includeSubtasks && item.subtasks?.length) {
        lines.push(...formatSubtaskLines(item.subtasks, mode, subtaskPrefix));
      }
    }

    lines.push("");
  }

  return lines;
}

function formatGroupedShare(
  plan: SharePlan,
  options: SharePlanOptions,
): string {
  const lang = inferShareLanguage(plan);
  const mode = options.mode ?? "PLAN";
  const header = buildShareHeader(plan, { mode });

  const lines = [header, "", ...renderGroupedBody(plan, options, lang)];

  if (plan.summary && mode === "PLAN") {
    lines.splice(2, 0, plan.summary, "");
  }

  return lines.join("\n").trim();
}

function formatPlainUpdate(plan: SharePlan, options: SharePlanOptions): string {
  return formatGroupedShare(plan, { ...options, format: "PLAIN_TEXT" });
}

export function generateShareText(
  plan: SharePlan,
  options: SharePlanOptions,
): string {
  const mode = options.mode ?? (options.format === "SUMMARY" ? "UPDATE" : "PLAN");

  switch (options.format) {
    case "SUMMARY":
      return formatGroupedShare(plan, { ...options, mode: "UPDATE" });
    case "TELEGRAM":
      return formatGroupedShare(plan, { ...options, mode });
    case "PLAIN_TEXT":
    default:
      if (mode === "UPDATE") {
        return formatPlainUpdate(plan, options);
      }
      return formatGroupedShare(plan, { ...options, mode: "PLAN" });
  }
}

export type ShareUiFormat = "plan" | "plain" | "update";

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

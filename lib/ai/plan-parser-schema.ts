import { z } from "zod";

const planTypeSchema = z.enum(["DAY", "WEEK", "MONTH", "YEAR"]);
const planLanguageSchema = z.enum(["FA", "EN", "MIXED", "UNKNOWN"]);
const planItemTypeSchema = z.enum([
  "TASK",
  "EVENT",
  "INTENTION",
  "NOTE",
  "WORK_BLOCK",
  "ERRAND",
  "SOCIAL",
  "REST",
]);
const timeHintSchema = z.enum([
  "MORNING",
  "AFTERNOON",
  "EVENING",
  "ANYTIME",
  "ALL_DAY",
  "SPECIFIC",
]);
const prioritySchema = z.enum(["LOW", "MEDIUM", "HIGH"]);
const subtaskTypeSchema = z.enum(["TASK", "NOTE"]);

export const parsedSubtaskSchema = z.object({
  title: z.string().min(1),
  type: subtaskTypeSchema.optional(),
});

export const parsedPlanItemSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  type: planItemTypeSchema,
  timeHint: timeHintSchema.optional(),
  importance: prioritySchema.optional(),
  urgency: prioritySchema.optional(),
  durationMinutes: z.number().int().positive().optional(),
  shareable: z.boolean().optional(),
  subtasks: z.array(parsedSubtaskSchema).optional(),
});

export const parsedPlanSchema = z.object({
  title: z.string().min(1),
  planType: planTypeSchema,
  language: planLanguageSchema,
  summary: z.string().optional(),
  items: z.array(parsedPlanItemSchema),
});

export const saveParsedPlanSchema = z.object({
  rawInput: z.string().min(1),
  title: z.string().min(1),
  planType: planTypeSchema,
  language: planLanguageSchema,
  summary: z.string().optional(),
  items: z.array(parsedPlanItemSchema).min(1),
});

export type ParsedSubtask = z.infer<typeof parsedSubtaskSchema>;
export type ParsedPlanItem = z.infer<typeof parsedPlanItemSchema>;
export type ParsedPlan = z.infer<typeof parsedPlanSchema>;
export type SaveParsedPlanInput = z.infer<typeof saveParsedPlanSchema>;

export function validateParsedPlan(json: unknown): ParsedPlan {
  const result = parsedPlanSchema.safeParse(json);

  if (!result.success) {
    throw new Error("Parser returned an invalid plan structure");
  }

  if (result.data.items.length === 0) {
    throw new Error("Parser found no items. Add at least one line to your plan.");
  }

  return result.data;
}

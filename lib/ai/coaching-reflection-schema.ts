import { z } from "zod";

export const coachingReflectionSchema = z.object({
  reflection: z.string().min(1),
  question: z.string().min(1),
  experiment: z.string().min(1),
});

export type CoachingReflection = z.infer<typeof coachingReflectionSchema>;

export function validateCoachingReflection(json: unknown): CoachingReflection {
  const result = coachingReflectionSchema.safeParse(json);

  if (!result.success) {
    throw new Error("Reflection response was invalid.");
  }

  return result.data;
}

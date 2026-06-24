import { z } from "zod";

export const careerReflectionSchema = z.object({
  reflection: z.string().min(1),
  nextKindAction: z.string().min(1),
});

export type CareerReflection = z.infer<typeof careerReflectionSchema>;

export function validateCareerReflection(json: unknown): CareerReflection {
  const result = careerReflectionSchema.safeParse(json);

  if (!result.success) {
    throw new Error("Career reflection response was invalid.");
  }

  return result.data;
}

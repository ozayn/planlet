import type { CareerPracticeType } from "@/app/generated/prisma/client";

export type TinyStepPreset = {
  id: string;
  title: string;
  type: CareerPracticeType;
};

export const TINY_STEP_PRESETS: Record<CareerPracticeType, TinyStepPreset[]> = {
  LEETCODE: [
    { id: "lc-read", title: "Read one solution", type: "LEETCODE" },
    { id: "lc-easy", title: "Solve one easy problem", type: "LEETCODE" },
    { id: "lc-pattern", title: "Review one pattern", type: "LEETCODE" },
  ],
  ML_REVIEW: [
    { id: "ml-concept", title: "Review one concept", type: "ML_REVIEW" },
    { id: "ml-watch", title: "Watch 10 minutes", type: "ML_REVIEW" },
    { id: "ml-flashcards", title: "Make 3 flashcards", type: "ML_REVIEW" },
  ],
  NETWORKING: [
    { id: "net-send", title: "Send one message", type: "NETWORKING" },
    { id: "net-reply", title: "Reply to one person", type: "NETWORKING" },
    {
      id: "net-review",
      title: "Review one contact/company",
      type: "NETWORKING",
    },
  ],
  APPLICATION: [
    { id: "app-save", title: "Save one job", type: "APPLICATION" },
    { id: "app-apply", title: "Apply to one job", type: "APPLICATION" },
    {
      id: "app-update",
      title: "Update one job tracker entry",
      type: "APPLICATION",
    },
  ],
  PROJECT: [
    {
      id: "proj-expoprint",
      title: "Work 15 minutes on ExpoPrint",
      type: "PROJECT",
    },
    {
      id: "proj-planlet",
      title: "Work 15 minutes on Planlet",
      type: "PROJECT",
    },
    { id: "proj-other", title: "Work 15 minutes on a project", type: "PROJECT" },
  ],
  RECOVERY: [
    { id: "rec-walk", title: "Take a walk", type: "RECOVERY" },
    { id: "rec-journal", title: "Journal for 5 minutes", type: "RECOVERY" },
    { id: "rec-stop", title: "Stop before overwhelm", type: "RECOVERY" },
  ],
  INTERVIEW_PREP: [
    {
      id: "iq-behavioral",
      title: "Practice one behavioral answer",
      type: "INTERVIEW_PREP",
    },
    {
      id: "iq-hard-gentle",
      title: "Review one hard question gently",
      type: "INTERVIEW_PREP",
    },
    {
      id: "iq-write",
      title: "Write one answer without judging it",
      type: "INTERVIEW_PREP",
    },
  ],
  COURSE: [
    { id: "course-10", title: "Watch 10 minutes of a course", type: "COURSE" },
    { id: "course-notes", title: "Take notes on one lesson", type: "COURSE" },
    { id: "course-exercise", title: "Do one course exercise", type: "COURSE" },
  ],
  SYSTEM_DESIGN: [
    {
      id: "sd-sketch",
      title: "Sketch one system design",
      type: "SYSTEM_DESIGN",
    },
    {
      id: "sd-review",
      title: "Review one design pattern",
      type: "SYSTEM_DESIGN",
    },
    {
      id: "sd-15",
      title: "15 minutes of system design practice",
      type: "SYSTEM_DESIGN",
    },
  ],
};

export function getAllTinyStepPresets(): TinyStepPreset[] {
  return Object.values(TINY_STEP_PRESETS).flat();
}

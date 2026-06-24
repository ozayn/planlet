export type DemoTourStepId = "today" | "week" | "month" | "coaching";

export type DemoTourStep = {
  id: DemoTourStepId;
  title: string;
  caption: string;
};

/**
 * Ordered steps for the landing-page product tour.
 * Add future screens (Insights, Career, Job Tracker, Themes) here.
 */
export const DEMO_TOUR_STEPS: DemoTourStep[] = [
  {
    id: "today",
    title: "Today",
    caption: "Capture what matters now — tasks, themes, and private gratitude.",
  },
  {
    id: "week",
    title: "Week",
    caption: "Balance different tracks — job search, learning, and recovery.",
  },
  {
    id: "month",
    title: "Month",
    caption: "See broader direction — priorities over daily clutter.",
  },
  {
    id: "coaching",
    title: "Coaching",
    caption: "Receive thoughtful feedback shaped by your reflection lens.",
  },
];

export function getDemoTourStep(id: DemoTourStepId): DemoTourStep {
  const step = DEMO_TOUR_STEPS.find((entry) => entry.id === id);
  if (!step) {
    throw new Error(`Unknown demo tour step: ${id}`);
  }
  return step;
}

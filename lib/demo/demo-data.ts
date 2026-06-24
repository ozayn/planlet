import type { PlanItemStatus } from "@/app/generated/prisma/client";

/**
 * Fictional fixture data for the public landing-page product tour.
 * Not connected to any user session or database records.
 */

export type DemoSubtask = {
  id: string;
  title: string;
  status: PlanItemStatus;
};

export type DemoTask = {
  id: string;
  title: string;
  status: PlanItemStatus;
  themeLabel?: string;
  subtasks?: DemoSubtask[];
};

export const DEMO_TODAY_DATA = {
  pageTitle: "Today",
  pageSubtitle: "Monday, June 24 · Updated 8:14 AM",
  tasksSectionLabel: "Tasks",
  tasks: [
    {
      id: "task-project-notes",
      title: "Review project notes",
      status: "DONE",
    },
    {
      id: "task-follow-up",
      title: "Send one follow-up message",
      status: "DONE",
    },
    {
      id: "task-apply-role",
      title: "Apply to one saved role",
      status: "OPEN",
      themeLabel: "Career · Job Search",
      subtasks: [
        {
          id: "subtask-job-desc",
          title: "Review job description",
          status: "DONE",
        },
        {
          id: "subtask-resume",
          title: "Update resume bullet",
          status: "OPEN",
        },
        {
          id: "subtask-submit",
          title: "Submit application",
          status: "OPEN",
        },
      ],
    },
    {
      id: "task-walk",
      title: "Take a short walk",
      status: "OPEN",
    },
    {
      id: "task-draft-plan",
      title: "Draft tomorrow's plan",
      status: "OPEN",
    },
  ] satisfies DemoTask[],
  gratitude: {
    count: 1,
    preview: "A quiet morning and a clear next step.",
  },
  observation: {
    count: 1,
    preview: "Energy feels better after starting small.",
  },
} as const;

export const DEMO_COACHING_DATA = {
  pageTitle: "Coaching",
  pageSubtitle: "Thoughtful feedback on your recent plans and reflections.",
  lensSummary: "Perspectives currently guiding your reflections.",
  influences: ["James Clear", "Gabor Maté", "Alain de Botton"] as const,
  influenceCount: 3,
  reflection:
    "You are carrying several tracks, but they do not all need the same kind of effort today. A small, honest step can protect momentum without turning the day into a test.",
  question: "Which part of the plan would feel lighter if it were made smaller?",
  experiment:
    "Choose one 15-minute version of a task and stop when the timer ends.",
  remainingLabel: "2 reflections left this week",
} as const;

export type DemoWeekGroup = {
  id: string;
  label: string;
  tasks: DemoTask[];
};

export const DEMO_WEEK_DATA = {
  pageTitle: "Week of June 24",
  pageSubtitle: "Jun 24–30 · Updated yesterday",
  navLabel: "This week",
  intentions: [
    { id: "week-focus-momentum", title: "Keep job search momentum" },
    { id: "week-focus-technical", title: "Review one technical topic" },
    { id: "week-focus-portfolio", title: "Make progress on portfolio project" },
    { id: "week-focus-recovery", title: "Protect recovery time" },
  ],
  groups: [
    {
      id: "career",
      label: "Career",
      tasks: [
        { id: "w-apply", title: "Apply to 3 roles", status: "PARTIAL" },
        { id: "w-network", title: "Send 2 networking messages", status: "OPEN" },
        { id: "w-saved", title: "Review saved jobs", status: "DONE" },
      ],
    },
    {
      id: "learning",
      label: "Learning",
      tasks: [
        { id: "w-eval", title: "Review model evaluation", status: "OPEN" },
        { id: "w-sql", title: "Practice one SQL problem", status: "OPEN" },
        { id: "w-course", title: "Watch one course lesson", status: "DONE" },
      ],
    },
    {
      id: "recovery",
      label: "Recovery",
      tasks: [
        { id: "w-walks", title: "Take two walks", status: "PARTIAL" },
        { id: "w-evening", title: "Keep one evening unscheduled", status: "OPEN" },
      ],
    },
  ] satisfies DemoWeekGroup[],
  progress: {
    done: 3,
    total: 8,
    label: "This week",
  },
} as const;

export type DemoMonthPriority = {
  id: string;
  label: string;
  note: string;
  progress: number;
};

export const DEMO_MONTH_DATA = {
  pageTitle: "June 2026",
  pageSubtitle: "Updated 2 days ago",
  navLabel: "This month",
  priorities: [
    {
      id: "career",
      label: "Career momentum",
      note: "Applications, networking, interviews",
      progress: 0.68,
    },
    {
      id: "portfolio",
      label: "Portfolio project",
      note: "Ship one portfolio milestone",
      progress: 0.45,
    },
    {
      id: "learning",
      label: "Learning review",
      note: "Technical topics and course progress",
      progress: 0.32,
    },
    {
      id: "health",
      label: "Health & recovery",
      note: "Walks, rest, unscheduled evenings",
      progress: 0.55,
    },
    {
      id: "community",
      label: "Community",
      note: "Friends and local groups",
      progress: 0.25,
    },
  ] satisfies DemoMonthPriority[],
} as const;

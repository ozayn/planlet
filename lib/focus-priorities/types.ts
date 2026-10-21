export type SerializedFocusPriority = {
  id: string;
  lifeAreaId: string;
  lifeAreaName: string;
  title: string;
  description: string | null;
  suggestedTaskTitle: string;
  defaultDurationMinutes: number | null;
  subtopics: string[];
  autoAddToDailyPlan: boolean;
  programWindowMonths: number | null;
  programStartsOn: string | null;
  programEndsOn: string | null;
  sortOrder: number;
  archivedAt: string | null;
};

export type FocusPriorityWriteInput = {
  title: string;
  lifeAreaId: string;
  description?: string | null;
  suggestedTaskTitle?: string | null;
  defaultDurationMinutes?: number | null;
  subtopics?: string[] | null;
  autoAddToDailyPlan?: boolean | null;
  programWindowMonths?: number | null;
  programStartsOn?: string | null;
  programEndsOn?: string | null;
};

export type FocusPriorityTaskDraftInput = {
  priorityId: string;
  title: string;
  durationMinutes?: number | null;
  primaryLifeAreaId?: string | null;
};

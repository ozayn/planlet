export type SerializedFocusPriority = {
  id: string;
  lifeAreaId: string;
  lifeAreaName: string;
  title: string;
  description: string | null;
  suggestedTaskTitle: string;
  defaultDurationMinutes: number | null;
  subtopics: string[];
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
};

export type FocusPriorityTaskDraftInput = {
  priorityId: string;
  title: string;
  durationMinutes?: number | null;
  primaryLifeAreaId?: string | null;
};

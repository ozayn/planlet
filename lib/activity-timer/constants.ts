export const DEFAULT_ACTIVITY_TIMER_PRESETS = [
  { title: "Foot tapping — right foot", category: "Movement" },
  { title: "Foot tapping — left foot", category: "Movement" },
  { title: "Wash face", category: "Care" },
  { title: "Tidy room", category: "Chores" },
  { title: "Learning session", category: "Focus" },
  { title: "Stretching", category: "Movement" },
] as const;

export const MAX_ACTIVITY_TITLE_LENGTH = 120;
export const MAX_ACTIVITY_NOTES_LENGTH = 2000;
export const MAX_ACTIVITY_CATEGORY_LENGTH = 60;
export const RECENT_ACTIVITY_SESSION_LIMIT = 20;

export type SerializedActivityTimerPreset = {
  id: string;
  title: string;
  category: string | null;
  sortOrder: number;
};

export type SerializedActiveActivityTimerSession = {
  id: string;
  title: string;
  presetId: string | null;
  category: string | null;
  startedAt: string;
  notes: string | null;
};

export type SerializedActivityTimerSession = {
  id: string;
  presetId: string | null;
  title: string;
  category: string | null;
  notes: string | null;
  startedAt: string;
  stoppedAt: string | null;
  durationSeconds: number | null;
  timeLabel: string;
  durationLabel: string;
  dayGroupLabel: string;
  clockTimeLabel: string;
  durationShortLabel: string;
  notesPreview: string | null;
};

export type ActivityTimerTimelineEntry = {
  id: string;
  title: string;
  timeRangeLabel: string;
};

export type ActivityTimerInsights = {
  todayTotalSeconds: number;
  weekTotalSeconds: number;
  mostTimedActivity: string | null;
  todayTotalLabel: string;
  weekTotalLabel: string;
  todayTimeline: ActivityTimerTimelineEntry[];
  todayTotalMinutesLabel: string;
};

/** Optional target duration for progress-ring mode (future). */
export type ActivityTimerTargetDuration = number | null;

export type ActivityTimerPageData = {
  presets: SerializedActivityTimerPreset[];
  activeSession: SerializedActiveActivityTimerSession | null;
  recentSessions: SerializedActivityTimerSession[];
  insights: ActivityTimerInsights;
};

export type StartActivityTimerInput = {
  title: string;
  presetId?: string | null;
  notes?: string | null;
};

export type StopActivityTimerInput = {
  sessionId: string;
  notes?: string | null;
};

export type UpdateActivityTimerSessionInput = {
  sessionId: string;
  title?: string;
  notes?: string | null;
  category?: string | null;
  durationSeconds?: number | null;
};

export type CreateActivityTimerPresetInput = {
  title: string;
  category?: string | null;
};

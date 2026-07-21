import type { SerializedActivityTimerSessionNote } from "@/lib/activity-timer/session-notes";

export type { SerializedActivityTimerSessionNote } from "@/lib/activity-timer/session-notes";
export {
  MAX_SESSION_NOTE_LENGTH,
  VOICE_TRANSCRIPTION_PRIVACY_TEXT,
} from "@/lib/activity-timer/session-notes";

export type ActivityTimerMode = "countUp" | "countDown";

export const ACTIVITY_TIMER_MODES = ["countUp", "countDown"] as const;

export const DEFAULT_ACTIVITY_TIMER_PRESETS = [
  {
    title: "Foot tapping (R)",
    category: "Movement",
    targetDurationSeconds: null,
    timerMode: "countUp" as const,
    iconName: "foot",
  },
  {
    title: "Foot tapping (L)",
    category: "Movement",
    targetDurationSeconds: null,
    timerMode: "countUp" as const,
    iconName: "foot",
  },
  {
    title: "Tapping",
    category: "Movement",
    targetDurationSeconds: null,
    timerMode: "countUp" as const,
    iconName: "foot",
  },
  {
    title: "Wash face",
    category: "Care",
    targetDurationSeconds: null,
    timerMode: "countUp" as const,
    iconName: "droplets",
  },
  {
    title: "Walk apartment stairs",
    category: "Movement",
    targetDurationSeconds: 600,
    timerMode: "countUp" as const,
    iconName: "stairs",
  },
  {
    title: "Tidy room",
    category: "Chores",
    targetDurationSeconds: null,
    timerMode: "countUp" as const,
    iconName: "home",
  },
  {
    title: "Learning session",
    category: "Focus",
    targetDurationSeconds: null,
    timerMode: "countUp" as const,
    iconName: "book-open",
  },
  {
    title: "Stretching",
    category: "Movement",
    targetDurationSeconds: 300,
    timerMode: "countUp" as const,
    iconName: "stretch",
  },
  {
    title: "Tongue extension",
    category: "Nervous system",
    targetDurationSeconds: 40,
    timerMode: "countDown" as const,
    iconName: "smile",
  },
] as const;

/** Built-in defaults renamed in place; matched by exact legacy title only. */
export const LEGACY_DEFAULT_ACTIVITY_TIMER_PRESET_TITLES = [
  {
    from: "Foot tapping — right foot",
    to: "Foot tapping (R)",
  },
  {
    from: "Foot tapping — left foot",
    to: "Foot tapping (L)",
  },
] as const;

export const MAX_ACTIVITY_TITLE_LENGTH = 120;
export const MAX_ACTIVITY_NOTES_LENGTH = 2000;
export const MAX_ACTIVITY_CATEGORY_LENGTH = 60;
export const MAX_TARGET_DURATION_SECONDS = 24 * 60 * 60;
export const RECENT_ACTIVITY_SESSION_LIMIT = 20;

/** Sessions shorter than this are discarded without creating a saved row. */
export const MIN_TIMER_SESSION_SECONDS = 30;

export const ACTIVITY_TIMER_ACTIVE_NOTIFICATION_TAG = "planlet-active-timer";
export const ACTIVITY_TIMER_ACTIVE_NOTIFICATION_STORAGE_KEY =
  "activity-timer-active-notification";
export const ACTIVITY_TIMER_OPEN_PATH = "/timer?active=1";

/** Optional targets for count-up presets (progress ring). */
export const QUICK_TARGET_DURATION_OPTIONS = [
  { label: "No target", seconds: null },
  { label: "5 min", seconds: 300 },
  { label: "10 min", seconds: 600 },
  { label: "15 min", seconds: 900 },
] as const;

/** Countdown preset duration choices in Settings. */
export const QUICK_COUNTDOWN_DURATION_OPTIONS = [
  { label: "30 sec", seconds: 30 },
  { label: "40 sec", seconds: 40 },
  { label: "1 min", seconds: 60 },
  { label: "5 min", seconds: 300 },
  { label: "10 min", seconds: 600 },
] as const;

export type SerializedActivityTimerPreset = {
  id: string;
  title: string;
  category: string | null;
  targetDurationSeconds: number | null;
  targetDurationLabel: string | null;
  timerMode: ActivityTimerMode;
  iconName: string | null;
  sortOrder: number;
};

export type SerializedActivityTimerPresetManagement =
  SerializedActivityTimerPreset & {
    isArchived: boolean;
  };

export type ActivityTimerPresetSettingsData = {
  activePresets: SerializedActivityTimerPresetManagement[];
  archivedPresets: SerializedActivityTimerPresetManagement[];
};

export type SerializedActiveActivityTimerSession = {
  id: string;
  title: string;
  presetId: string | null;
  category: string | null;
  startedAt: string;
  notes: string | null;
  targetDurationSeconds: number | null;
  timerMode: ActivityTimerMode;
  pausedAt: string | null;
  accumulatedPausedSeconds: number;
  sessionNotes: SerializedActivityTimerSessionNote[];
};

export type SerializedActivityTimerSession = {
  id: string;
  presetId: string | null;
  title: string;
  category: string | null;
  notes: string | null;
  targetDurationSeconds: number | null;
  timerMode: ActivityTimerMode;
  completed: boolean;
  startedAt: string;
  stoppedAt: string | null;
  durationSeconds: number | null;
  timeLabel: string;
  durationLabel: string;
  dayGroupLabel: string;
  clockTimeLabel: string;
  durationShortLabel: string;
  notesPreview: string | null;
  sessionNotes: SerializedActivityTimerSessionNote[];
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
  targetDurationSeconds?: number | null;
  timerMode?: ActivityTimerMode;
};

export type StopActivityTimerInput = {
  sessionId: string;
  notes?: string | null;
  completed?: boolean;
  discard?: boolean;
};

export type UpdateActivityTimerSessionInput = {
  sessionId: string;
  title?: string;
  notes?: string | null;
  category?: string | null;
  durationSeconds?: number | null;
};

export type AddActivityTimerSessionNoteInput = {
  sessionId: string;
  text: string;
};

export type UpdateActivityTimerSessionNoteInput = {
  noteId: string;
  text: string;
};

export type CreateActivityTimerPresetInput = {
  title: string;
  category?: string | null;
  targetDurationSeconds?: number | null;
  timerMode?: ActivityTimerMode;
  iconName?: string | null;
};

export type UpdateActivityTimerPresetInput = {
  presetId: string;
  title?: string;
  category?: string | null;
  targetDurationSeconds?: number | null;
  timerMode?: ActivityTimerMode;
  iconName?: string | null;
  isArchived?: boolean;
};

export const ACTIVITY_TIMER_SOUNDS_STORAGE_KEY = "activity-timer-sounds-enabled";

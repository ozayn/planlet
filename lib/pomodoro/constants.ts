import { MIN_TIMER_SESSION_SECONDS } from "@/lib/activity-timer/constants";

export type PomodoroPhase = "focus" | "short_break" | "long_break";
export type PomodoroRunStatus = "running" | "paused" | "awaiting_next";

export const DEFAULT_POMODORO_FOCUS_SECONDS = 25 * 60;
export const DEFAULT_POMODORO_SHORT_BREAK_SECONDS = 5 * 60;
export const DEFAULT_POMODORO_LONG_BREAK_SECONDS = 15 * 60;
export const DEFAULT_POMODORO_SESSIONS_BEFORE_LONG_BREAK = 4;

export const MIN_POMODORO_DURATION_SECONDS = 60;
export const MAX_POMODORO_DURATION_SECONDS = 3 * 60 * 60;
export const MIN_POMODORO_SESSIONS_BEFORE_LONG_BREAK = 1;
export const MAX_POMODORO_SESSIONS_BEFORE_LONG_BREAK = 12;
export const MAX_POMODORO_TITLE_LENGTH = 120;
export const MAX_POMODORO_ACTIVITIES = 20;

/** Reuse Activity Timer minimum for saving focus logs. */
export const MIN_POMODORO_FOCUS_LOG_SECONDS = MIN_TIMER_SESSION_SECONDS;

export const POMODORO_OPEN_PATH = "/pomodoro";
/** Settings entry from the timer; back link returns to Pomodoro. */
export const POMODORO_SETTINGS_PATH = "/settings/pomodoro?from=/pomodoro";
export const POMODORO_NOTIFICATION_TAG = "planlet-pomodoro";
export const POMODORO_NOTIFICATION_STORAGE_KEY = "pomodoro-notifications";
/** localStorage: compact desktop/PWA timer layout on /pomodoro. */
export const POMODORO_COMPACT_STORAGE_KEY = "planlet-pomodoro-compact";

export type PomodoroPreferences = {
  focusDurationSeconds: number;
  shortBreakSeconds: number;
  longBreakSeconds: number;
  sessionsBeforeLongBreak: number;
  autoStartBreaks: boolean;
  autoStartFocus: boolean;
  completionSound: boolean;
  notificationsEnabled: boolean;
};

export const DEFAULT_POMODORO_PREFERENCES: PomodoroPreferences = {
  focusDurationSeconds: DEFAULT_POMODORO_FOCUS_SECONDS,
  shortBreakSeconds: DEFAULT_POMODORO_SHORT_BREAK_SECONDS,
  longBreakSeconds: DEFAULT_POMODORO_LONG_BREAK_SECONDS,
  sessionsBeforeLongBreak: DEFAULT_POMODORO_SESSIONS_BEFORE_LONG_BREAK,
  autoStartBreaks: false,
  autoStartFocus: false,
  completionSound: true,
  notificationsEnabled: false,
};

export type SerializedPomodoroActiveRun = {
  id: string;
  phase: PomodoroPhase;
  status: PomodoroRunStatus;
  focusIndex: number;
  completedFocusCount: number;
  startedAt: string | null;
  pausedAt: string | null;
  accumulatedPausedSeconds: number;
  targetDurationSeconds: number;
  taskId: string | null;
  customTitle: string | null;
  transitionToken: string | null;
  updatedAt: string;
};

export type SerializedPomodoroFocusLog = {
  id: string;
  taskId: string | null;
  customTitle: string | null;
  plannedDurationSeconds: number;
  actualFocusedSeconds: number;
  startedAt: string;
  endedAt: string;
  completed: boolean;
  interrupted: boolean;
  cycleNumber: number;
  displayTitle: string;
};

export type PomodoroDailySummary = {
  sessionCount: number;
  focusedSeconds: number;
};

export type PomodoroTaskOption = {
  id: string;
  title: string;
  /** True when the Daily Plan item is DONE (or otherwise not incomplete). */
  completed: boolean;
  /** Selected task no longer exists in the Planner. */
  missing?: boolean;
};

/** Favorite focus activities managed in Settings → Pomodoro. */
export type PomodoroActivityOption = {
  id: string;
  title: string;
  sortOrder: number;
};

export type PomodoroPageData = {
  preferences: PomodoroPreferences;
  activeRun: SerializedPomodoroActiveRun | null;
  todaySummary: PomodoroDailySummary;
  recentLogs: SerializedPomodoroFocusLog[];
  /** Today's Daily Plan tasks (incomplete first). Not copied into Pomodoro tables. */
  taskOptions: PomodoroTaskOption[];
  activities: PomodoroActivityOption[];
};

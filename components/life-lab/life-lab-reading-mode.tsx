"use client";

import {
  createContext,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import type { LifeLabNoteMetadata } from "@/lib/life-lab/constants";
import {
  clearLifeLabReadingPreferences,
  DEFAULT_LIFE_LAB_READING_PREFERENCES,
  readLifeLabReadingPreferences,
  writeLifeLabReadingPreferences,
  type LifeLabReadingPreferences,
} from "@/lib/life-lab/reading-preferences";
import {
  buildStudyTargets,
  type StudyTarget,
} from "@/lib/life-lab/reading-text";

type ReadingPreferenceKey = keyof LifeLabReadingPreferences;

type LifeLabReadingModeContextValue = {
  preferences: LifeLabReadingPreferences;
  studyTargets: StudyTarget[];
  setPreference: <Key extends ReadingPreferenceKey>(
    key: Key,
    value: LifeLabReadingPreferences[Key],
  ) => void;
  resetPreferences: () => void;
};

const LifeLabReadingModeContext =
  createContext<LifeLabReadingModeContextValue | null>(null);

const listeners = new Set<() => void>();
let clientSnapshot = DEFAULT_LIFE_LAB_READING_PREFERENCES;
let clientSnapshotLoaded = false;

function emitPreferenceChange(): void {
  for (const listener of listeners) {
    listener();
  }
}

function getClientSnapshot(): LifeLabReadingPreferences {
  if (!clientSnapshotLoaded && typeof window !== "undefined") {
    clientSnapshot = readLifeLabReadingPreferences(window.localStorage);
    clientSnapshotLoaded = true;
  }

  return clientSnapshot;
}

function getServerSnapshot(): LifeLabReadingPreferences {
  return DEFAULT_LIFE_LAB_READING_PREFERENCES;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);

  const handleStorage = () => {
    clientSnapshotLoaded = false;
    emitPreferenceChange();
  };

  window.addEventListener("storage", handleStorage);

  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", handleStorage);
  };
}

function updateClientPreferences(
  preferences: LifeLabReadingPreferences,
): void {
  clientSnapshot = preferences;
  clientSnapshotLoaded = true;
  writeLifeLabReadingPreferences(window.localStorage, preferences);
  emitPreferenceChange();
}

export function LifeLabReadingModeProvider({
  metadata,
  children,
}: {
  metadata?: LifeLabNoteMetadata;
  children: ReactNode;
}) {
  const preferences = useSyncExternalStore(
    subscribe,
    getClientSnapshot,
    getServerSnapshot,
  );
  const studyTargets = useMemo(() => buildStudyTargets(metadata), [metadata]);
  const value = useMemo<LifeLabReadingModeContextValue>(
    () => ({
      preferences,
      studyTargets,
      setPreference(key, nextValue) {
        updateClientPreferences({
          ...getClientSnapshot(),
          [key]: nextValue,
        });
      },
      resetPreferences() {
        clearLifeLabReadingPreferences(window.localStorage);
        clientSnapshot = DEFAULT_LIFE_LAB_READING_PREFERENCES;
        clientSnapshotLoaded = true;
        emitPreferenceChange();
      },
    }),
    [preferences, studyTargets],
  );

  return (
    <LifeLabReadingModeContext.Provider value={value}>
      <div
        className="ui-life-lab-reading-root"
        data-reading-mode={preferences.readingMode}
        data-reading-font-size={preferences.readingFontSize}
        data-reading-line-height={preferences.readingLineHeight}
        data-reading-width={preferences.readingWidth}
        data-reading-high-contrast={
          preferences.readingHighContrast ? "true" : "false"
        }
      >
        {children}
      </div>
    </LifeLabReadingModeContext.Provider>
  );
}

export function useLifeLabReadingMode(): LifeLabReadingModeContextValue {
  const context = useContext(LifeLabReadingModeContext);

  if (!context) {
    return {
      preferences: DEFAULT_LIFE_LAB_READING_PREFERENCES,
      studyTargets: [],
      setPreference: () => undefined,
      resetPreferences: () => undefined,
    };
  }

  return context;
}

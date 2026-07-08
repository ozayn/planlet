"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { SerializedActiveActivityTimerSession } from "@/lib/activity-timer/constants";

type ActivityTimerContextValue = {
  activeSession: SerializedActiveActivityTimerSession | null;
  setActiveSession: (
    session: SerializedActiveActivityTimerSession | null,
  ) => void;
};

const ActivityTimerContext = createContext<ActivityTimerContextValue | null>(
  null,
);

type ActivityTimerProviderProps = {
  initialActiveSession: SerializedActiveActivityTimerSession | null;
  children: ReactNode;
};

export function ActivityTimerProvider({
  initialActiveSession,
  children,
}: ActivityTimerProviderProps) {
  const [activeSession, setActiveSession] = useState(
    initialActiveSession,
  );

  useEffect(() => {
    setActiveSession(initialActiveSession);
  }, [initialActiveSession]);

  const value = useMemo(
    () => ({
      activeSession,
      setActiveSession,
    }),
    [activeSession],
  );

  return (
    <ActivityTimerContext.Provider value={value}>
      {children}
    </ActivityTimerContext.Provider>
  );
}

export function useActivityTimer() {
  const context = useContext(ActivityTimerContext);

  if (!context) {
    throw new Error("useActivityTimer must be used within ActivityTimerProvider");
  }

  return context;
}

export function useOptionalActivityTimer() {
  return useContext(ActivityTimerContext);
}

import type { CareerPracticeMode } from "@/app/generated/prisma/client";

export type CareerCapacity = "LOW" | "MEDIUM" | "HIGH";

export type EmotionalSafety = "TINY" | "WARMUP" | "FOCUS" | "RECOVERY";

export type TodayCapacityState = {
  capacity: CareerCapacity;
  safety: EmotionalSafety | null;
};

const STORAGE_KEY = "planlet-career-capacity";

export const CAPACITY_OPTIONS: { value: CareerCapacity; label: string; hint: string }[] = [
  { value: "LOW", label: "Low", hint: "Protect energy — tiny steps only" },
  { value: "MEDIUM", label: "Medium", hint: "Room for a warm-up or two" },
  { value: "HIGH", label: "High", hint: "Space for focus when it feels right" },
];

export const SAFETY_OPTIONS: { value: EmotionalSafety; label: string }[] = [
  { value: "TINY", label: "Tiny step only" },
  { value: "WARMUP", label: "Warm-up" },
  { value: "FOCUS", label: "Focus session" },
  { value: "RECOVERY", label: "Recovery" },
];

export function defaultModeForCapacity(
  capacity: CareerCapacity,
  safety: EmotionalSafety | null,
): CareerPracticeMode {
  if (safety === "TINY") return "TINY";
  if (safety === "WARMUP") return "WARMUP";
  if (safety === "RECOVERY") return "TINY";
  if (safety === "FOCUS") {
    return capacity === "HIGH" ? "DEEP" : "MODERATE";
  }

  switch (capacity) {
    case "LOW":
      return "TINY";
    case "MEDIUM":
      return "WARMUP";
    case "HIGH":
      return "MODERATE";
  }
}

export function suggestedModesForCapacity(
  capacity: CareerCapacity,
  safety: EmotionalSafety | null,
): CareerPracticeMode[] {
  if (safety === "RECOVERY") {
    return ["TINY"];
  }

  const defaultMode = defaultModeForCapacity(capacity, safety);

  if (capacity === "LOW" || safety === "TINY") {
    return defaultMode === "WARMUP" ? ["TINY", "WARMUP"] : ["TINY", "WARMUP"];
  }

  if (capacity === "MEDIUM") {
    return ["TINY", "WARMUP", "MODERATE"];
  }

  return ["TINY", "WARMUP", "MODERATE", "DEEP"];
}

export function loadTodayCapacity(todayDate: string): TodayCapacityState {
  if (typeof window === "undefined") {
    return { capacity: "MEDIUM", safety: null };
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { capacity: "MEDIUM", safety: null };
    }

    const parsed = JSON.parse(raw) as {
      date?: string;
      capacity?: CareerCapacity;
      safety?: EmotionalSafety | null;
    };

    if (parsed.date !== todayDate) {
      return { capacity: "MEDIUM", safety: null };
    }

    const capacity =
      parsed.capacity === "LOW" || parsed.capacity === "MEDIUM" || parsed.capacity === "HIGH"
        ? parsed.capacity
        : "MEDIUM";

    const safety =
      parsed.safety === "TINY" ||
      parsed.safety === "WARMUP" ||
      parsed.safety === "FOCUS" ||
      parsed.safety === "RECOVERY"
        ? parsed.safety
        : null;

    return { capacity, safety };
  } catch {
    return { capacity: "MEDIUM", safety: null };
  }
}

export function saveTodayCapacity(
  todayDate: string,
  state: TodayCapacityState,
): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      date: todayDate,
      capacity: state.capacity,
      safety: state.safety,
    }),
  );
}

import { completePomodoroPhase } from "@/lib/pomodoro";
import type { PomodoroPhase } from "@/lib/pomodoro/constants";
import {
  dispatchDuePomodoroPushJobs,
  type DispatchPomodoroPushResult,
} from "@/lib/pomodoro/push-jobs";

export async function runPomodoroPushCron(options?: {
  now?: Date;
  debug?: boolean;
}): Promise<DispatchPomodoroPushResult> {
  const result = await dispatchDuePomodoroPushJobs({
    now: options?.now,
    completeOverduePhase: async (userId, transitionToken) => {
      try {
        const completion = await completePomodoroPhase(userId, {
          transitionToken,
        });
        return {
          completed: completion.didComplete,
          phase: completion.completedPhase,
        };
      } catch (error) {
        if (options?.debug) {
          console.warn("[cron:pomodoro-push] Phase complete skipped:", {
            userId,
            message: error instanceof Error ? error.message : "unknown",
          });
        }
        return { completed: false, phase: "focus" as PomodoroPhase };
      }
    },
  });

  if (options?.debug) {
    console.log("[cron:pomodoro-push] Summary:", result);
  }

  return result;
}

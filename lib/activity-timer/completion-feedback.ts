"use client";

const COMPLETION_SOUND_FREQUENCY_HZ = 440;
const COMPLETION_SOUND_DURATION_MS = 120;
const COMPLETION_SOUND_VOLUME = 0.08;
const VIBRATION_PATTERN_MS = [40, 30, 40];

export function areActivityTimerSoundsEnabled(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    return window.localStorage.getItem("activity-timer-sounds-enabled") === "true";
  } catch {
    return false;
  }
}

export function playActivityTimerCompletionFeedback(): void {
  if (typeof window === "undefined") {
    return;
  }

  if ("vibrate" in navigator) {
    navigator.vibrate(VIBRATION_PATTERN_MS);
  }

  if (!areActivityTimerSoundsEnabled()) {
    return;
  }

  try {
    const AudioContextClass =
      window.AudioContext ??
      (window as typeof window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;

    if (!AudioContextClass) {
      return;
    }

    const context = new AudioContextClass();
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = "sine";
    oscillator.frequency.value = COMPLETION_SOUND_FREQUENCY_HZ;
    gain.gain.value = COMPLETION_SOUND_VOLUME;

    oscillator.connect(gain);
    gain.connect(context.destination);

    oscillator.start();
    oscillator.stop(context.currentTime + COMPLETION_SOUND_DURATION_MS / 1000);

    window.setTimeout(() => {
      void context.close();
    }, COMPLETION_SOUND_DURATION_MS + 40);
  } catch {
    // Quiet completion feedback is best-effort only.
  }
}

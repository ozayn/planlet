"use client";

const COMPLETION_SOUND_FREQUENCY_HZ = 523;
const COMPLETION_SOUND_DURATION_MS = 140;
const COMPLETION_SOUND_VOLUME = 0.06;
const VIBRATION_PATTERN_MS = [35, 25, 35];

export function playPomodoroCompletionFeedback(soundEnabled: boolean): void {
  if (typeof window === "undefined") {
    return;
  }

  if ("vibrate" in navigator) {
    try {
      navigator.vibrate(VIBRATION_PATTERN_MS);
    } catch {
      // Ignore vibration failures.
    }
  }

  if (!soundEnabled) {
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

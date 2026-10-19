"use client";

const COMPLETION_SOUND_FREQUENCY_HZ = 523;
const COMPLETION_SOUND_DURATION_MS = 140;
const COMPLETION_SOUND_VOLUME = 0.06;
const VIBRATION_PATTERN_MS = [35, 25, 35];

let sharedAudioContext: AudioContext | null = null;

function getAudioContextClass(): typeof AudioContext | null {
  if (typeof window === "undefined") {
    return null;
  }

  return (
    window.AudioContext ??
    (window as typeof window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext ??
    null
  );
}

/** Call from a user gesture (Start) so later completion tones are allowed. */
export function warmPomodoroCompletionAudio(): void {
  const AudioContextClass = getAudioContextClass();
  if (!AudioContextClass) {
    return;
  }

  try {
    if (!sharedAudioContext || sharedAudioContext.state === "closed") {
      sharedAudioContext = new AudioContextClass();
    }

    if (sharedAudioContext.state === "suspended") {
      void sharedAudioContext.resume();
    }
  } catch {
    // Best-effort unlock for autoplay policies.
  }
}

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
    const AudioContextClass = getAudioContextClass();
    if (!AudioContextClass) {
      return;
    }

    if (!sharedAudioContext || sharedAudioContext.state === "closed") {
      sharedAudioContext = new AudioContextClass();
    }

    const context = sharedAudioContext;
    if (context.state === "suspended") {
      void context.resume();
    }

    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = "sine";
    oscillator.frequency.value = COMPLETION_SOUND_FREQUENCY_HZ;
    gain.gain.value = COMPLETION_SOUND_VOLUME;

    oscillator.connect(gain);
    gain.connect(context.destination);

    const stopAt = context.currentTime + COMPLETION_SOUND_DURATION_MS / 1000;
    oscillator.start();
    oscillator.stop(stopAt);
  } catch {
    // Quiet completion feedback is best-effort only.
  }
}

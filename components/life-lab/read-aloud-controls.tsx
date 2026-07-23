"use client";

// Chrome on macOS may expose speechSynthesis voices but fail to start audio;
// Safari is more reliable for native speech. We show a calm fallback instead of forcing Chrome.
import { useEffect, useRef, type ReactNode } from "react";

import {
  SPEECH_TOOLBAR_ICONS,
  SpeechIconToolbar,
  type SpeechToolbarPrimaryAction,
} from "@/components/life-lab/speech-icon-toolbar";
import { useSpeechSynthesis } from "@/components/life-lab/use-speech-synthesis";
import {
  SPEECH_BROWSER_FALLBACK_MESSAGE,
} from "@/lib/life-lab/speech";

type ReadAloudControlsProps = {
  text: string | string[];
  className?: string;
  /** @deprecated Compact layout is now the shared icon toolbar. */
  compact?: boolean;
  developerMode?: boolean;
};

function SpeechPlaybackNotice({ show }: { show: boolean }) {
  if (!show) {
    return null;
  }

  return (
    <p className="w-full text-xs leading-relaxed text-muted">
      {SPEECH_BROWSER_FALLBACK_MESSAGE}
    </p>
  );
}

function SpeechVoiceFallbackNotice({ message }: { message: string | null }) {
  if (!message) {
    return null;
  }

  return (
    <p className="w-full text-xs leading-relaxed text-muted">{message}</p>
  );
}

function buildNotices(input: {
  playbackFailed: boolean;
  voiceFallbackNotice: string | null;
  voiceUnavailableNotice: string | null;
}): ReactNode {
  return (
    <>
      <SpeechVoiceFallbackNotice message={input.voiceUnavailableNotice} />
      <SpeechVoiceFallbackNotice message={input.voiceFallbackNotice} />
      <SpeechPlaybackNotice show={input.playbackFailed} />
    </>
  );
}

export function ReadAloudControls({
  text,
  className = "",
  developerMode = false,
}: ReadAloudControlsProps) {
  const {
    isSupported,
    isSpeaking,
    isPaused,
    playbackFailed,
    voiceFallbackNotice,
    voiceUnavailableNotice,
    diagnostics,
    selectableVoices,
    selectedVoiceId,
    setSelectedVoiceId,
    rate,
    setRate,
    speak,
    stop,
    pause,
    resume,
  } = useSpeechSynthesis();

  if (!isSupported) {
    return null;
  }

  const hasText = Array.isArray(text)
    ? text.some((segment) => segment.trim())
    : text.trim();

  if (!hasText) {
    return null;
  }

  const primaryActions: SpeechToolbarPrimaryAction[] = !isSpeaking
    ? [
        {
          id: "read",
          label: "Read aloud",
          icon: SPEECH_TOOLBAR_ICONS.read,
          onClick: () => speak(text),
        },
      ]
    : [
        {
          id: "stop",
          label: "Stop",
          icon: SPEECH_TOOLBAR_ICONS.stop,
          onClick: stop,
          active: true,
        },
        {
          id: isPaused ? "resume" : "pause",
          label: isPaused ? "Resume" : "Pause",
          icon: isPaused
            ? SPEECH_TOOLBAR_ICONS.resume
            : SPEECH_TOOLBAR_ICONS.pause,
          onClick: isPaused ? resume : pause,
        },
      ];

  return (
    <SpeechIconToolbar
      className={className}
      primaryActions={primaryActions}
      voices={selectableVoices}
      selectedVoiceId={selectedVoiceId}
      setSelectedVoiceId={setSelectedVoiceId}
      rate={rate}
      setRate={setRate}
      rateDisabled={isSpeaking}
      voiceDisabled={isSpeaking}
      developerMode={developerMode}
      diagnostics={diagnostics}
      notices={buildNotices({
        playbackFailed,
        voiceFallbackNotice,
        voiceUnavailableNotice,
      })}
    />
  );
}

type FlashcardReadAloudControlsProps = {
  question: string;
  answer: string;
  revealed: boolean;
  cardKey: string;
  className?: string;
  /** Kept for callers; toolbar is always compact icons. */
  compact?: boolean;
  /** Show speech diagnostics only in developer mode. */
  developerMode?: boolean;
};

export function FlashcardReadAloudControls({
  question,
  answer,
  revealed,
  cardKey,
  className = "",
  developerMode = false,
}: FlashcardReadAloudControlsProps) {
  const {
    isSupported,
    isSpeaking,
    isPaused,
    playbackFailed,
    voiceFallbackNotice,
    voiceUnavailableNotice,
    diagnostics,
    selectableVoices,
    selectedVoiceId,
    setSelectedVoiceId,
    rate,
    setRate,
    speak,
    stop,
    pause,
    resume,
  } = useSpeechSynthesis();
  const previousCardKeyRef = useRef(cardKey);

  useEffect(() => {
    if (previousCardKeyRef.current === cardKey) {
      return;
    }

    previousCardKeyRef.current = cardKey;

    if (isSpeaking) {
      stop();
    }
  }, [cardKey, isSpeaking, stop]);

  if (!isSupported) {
    return null;
  }

  const primaryActions: SpeechToolbarPrimaryAction[] = !isSpeaking
    ? [
        {
          id: "question",
          label: "Read question",
          icon: SPEECH_TOOLBAR_ICONS.question,
          onClick: () => speak(question),
        },
        {
          id: "answer",
          label: "Read answer",
          icon: SPEECH_TOOLBAR_ICONS.answer,
          onClick: () => speak(answer),
          disabled: !revealed,
        },
        {
          id: "both",
          label: "Read both",
          icon: SPEECH_TOOLBAR_ICONS.both,
          onClick: () => speak([question, answer]),
          disabled: !revealed,
        },
      ]
    : [
        {
          id: "stop",
          label: "Stop",
          icon: SPEECH_TOOLBAR_ICONS.stop,
          onClick: stop,
          active: true,
        },
        {
          id: isPaused ? "resume" : "pause",
          label: isPaused ? "Resume" : "Pause",
          icon: isPaused
            ? SPEECH_TOOLBAR_ICONS.resume
            : SPEECH_TOOLBAR_ICONS.pause,
          onClick: isPaused ? resume : pause,
        },
      ];

  return (
    <SpeechIconToolbar
      className={`print:hidden ${className}`.trim()}
      primaryActions={primaryActions}
      voices={selectableVoices}
      selectedVoiceId={selectedVoiceId}
      setSelectedVoiceId={setSelectedVoiceId}
      rate={rate}
      setRate={setRate}
      rateDisabled={isSpeaking}
      voiceDisabled={isSpeaking}
      developerMode={developerMode}
      diagnostics={diagnostics}
      notices={buildNotices({
        playbackFailed,
        voiceFallbackNotice,
        voiceUnavailableNotice,
      })}
    />
  );
}

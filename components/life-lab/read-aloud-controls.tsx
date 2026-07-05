"use client";

import { useEffect, useRef, type ReactNode } from "react";

import { useSpeechSynthesis } from "@/components/life-lab/use-speech-synthesis";
import {
  formatSpeechRate,
  formatSpeechVoiceLabel,
  getSpeechVoiceId,
  SPEECH_AUTO_VOICE_ID,
  SPEECH_BROWSER_FALLBACK_MESSAGE,
  SPEECH_RATE_OPTIONS,
  type SpeechDiagnostics,
  type SpeechRate,
} from "@/lib/life-lab/speech";

type ReadAloudControlsProps = {
  text: string | string[];
  className?: string;
};

function ControlButton({
  children,
  onClick,
  disabled = false,
  active = false,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
        active
          ? "bg-accent-cream text-foreground"
          : "border border-border/70 text-muted hover:bg-accent-cream/50 hover:text-foreground"
      } disabled:cursor-not-allowed disabled:opacity-50`}
    >
      {children}
    </button>
  );
}

function SpeechRateControls({
  rate,
  setRate,
  disabled = false,
}: {
  rate: SpeechRate;
  setRate: (rate: SpeechRate) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-1">
      {SPEECH_RATE_OPTIONS.map((option) => (
        <ControlButton
          key={option}
          onClick={() => setRate(option)}
          active={rate === option}
          disabled={disabled}
        >
          {formatSpeechRate(option)}
        </ControlButton>
      ))}
    </div>
  );
}

function SpeechVoiceSelector({
  voices,
  selectedVoiceId,
  setSelectedVoiceId,
  disabled = false,
}: {
  voices: SpeechSynthesisVoice[];
  selectedVoiceId: string;
  setSelectedVoiceId: (voiceId: string) => void;
  disabled?: boolean;
}) {
  if (voices.length === 0) {
    return null;
  }

  return (
    <label className="inline-flex min-w-0 items-center gap-1.5 text-xs text-muted">
      <span className="shrink-0">Voice</span>
      <select
        value={selectedVoiceId}
        onChange={(event) => setSelectedVoiceId(event.target.value)}
        disabled={disabled}
        className="max-w-[9.5rem] truncate rounded-full border border-border/70 bg-transparent px-2 py-1.5 text-xs text-foreground disabled:cursor-not-allowed disabled:opacity-50 sm:max-w-[12rem]"
      >
        <option value={SPEECH_AUTO_VOICE_ID}>Auto</option>
        {voices.map((voice) => (
          <option key={getSpeechVoiceId(voice)} value={getSpeechVoiceId(voice)}>
            {formatSpeechVoiceLabel(voice)}
          </option>
        ))}
      </select>
    </label>
  );
}

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
    <p className="w-full text-xs leading-relaxed text-muted">
      {message}
    </p>
  );
}

function SpeechDevDiagnostic({ diagnostics }: { diagnostics: SpeechDiagnostics }) {
  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  return (
    <p className="w-full font-mono text-[10px] leading-relaxed text-muted/80">
      speech: {diagnostics.browserName} · supported=
      {diagnostics.isSupported ? "yes" : "no"} · voices=
      {diagnostics.voiceCount}
      {diagnostics.lastError ? ` · last=${diagnostics.lastError}` : ""}
    </p>
  );
}

type ReadAloudPanelProps = {
  className?: string;
  children: ReactNode;
  playbackFailed: boolean;
  voiceFallbackNotice: string | null;
  diagnostics: SpeechDiagnostics;
};

function ReadAloudPanel({
  className = "",
  children,
  playbackFailed,
  voiceFallbackNotice,
  diagnostics,
}: ReadAloudPanelProps) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
      <SpeechVoiceFallbackNotice message={voiceFallbackNotice} />
      <SpeechPlaybackNotice show={playbackFailed} />
      <SpeechDevDiagnostic diagnostics={diagnostics} />
    </div>
  );
}

export function ReadAloudControls({
  text,
  className = "",
}: ReadAloudControlsProps) {
  const {
    isSupported,
    isSpeaking,
    isPaused,
    playbackFailed,
    voiceFallbackNotice,
    diagnostics,
    englishVoices,
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

  return (
    <ReadAloudPanel
      className={className}
      playbackFailed={playbackFailed}
      voiceFallbackNotice={voiceFallbackNotice}
      diagnostics={diagnostics}
    >
      {!isSpeaking ? (
        <>
          <ControlButton onClick={() => speak(text)}>
            Read aloud
          </ControlButton>
          {process.env.NODE_ENV === "development" ? (
            <ControlButton onClick={() => speak("Planlet read aloud test.")}>
              Test voice
            </ControlButton>
          ) : null}
        </>
      ) : (
        <>
          <ControlButton onClick={stop} active>
            Stop
          </ControlButton>
          {isPaused ? (
            <ControlButton onClick={resume}>Resume</ControlButton>
          ) : (
            <ControlButton onClick={pause}>Pause</ControlButton>
          )}
        </>
      )}

      <SpeechVoiceSelector
        voices={englishVoices}
        selectedVoiceId={selectedVoiceId}
        setSelectedVoiceId={setSelectedVoiceId}
        disabled={isSpeaking}
      />

      <SpeechRateControls
        rate={rate}
        setRate={setRate}
        disabled={isSpeaking}
      />
    </ReadAloudPanel>
  );
}

type FlashcardReadAloudControlsProps = {
  question: string;
  answer: string;
  revealed: boolean;
  cardKey: string;
  className?: string;
};

export function FlashcardReadAloudControls({
  question,
  answer,
  revealed,
  cardKey,
  className = "",
}: FlashcardReadAloudControlsProps) {
  const {
    isSupported,
    isSpeaking,
    isPaused,
    playbackFailed,
    voiceFallbackNotice,
    diagnostics,
    englishVoices,
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

  return (
    <ReadAloudPanel
      className={className}
      playbackFailed={playbackFailed}
      voiceFallbackNotice={voiceFallbackNotice}
      diagnostics={diagnostics}
    >
      {!isSpeaking ? (
        <>
          <ControlButton onClick={() => speak(question)}>
            Read question
          </ControlButton>
          {revealed ? (
            <>
              <ControlButton onClick={() => speak(answer)}>
                Read answer
              </ControlButton>
              <ControlButton onClick={() => speak([question, answer])}>
                Read both
              </ControlButton>
            </>
          ) : null}
        </>
      ) : (
        <>
          <ControlButton onClick={stop} active>
            Stop
          </ControlButton>
          {isPaused ? (
            <ControlButton onClick={resume}>Resume</ControlButton>
          ) : (
            <ControlButton onClick={pause}>Pause</ControlButton>
          )}
        </>
      )}

      <SpeechVoiceSelector
        voices={englishVoices}
        selectedVoiceId={selectedVoiceId}
        setSelectedVoiceId={setSelectedVoiceId}
        disabled={isSpeaking}
      />

      <SpeechRateControls
        rate={rate}
        setRate={setRate}
        disabled={isSpeaking}
      />
    </ReadAloudPanel>
  );
}

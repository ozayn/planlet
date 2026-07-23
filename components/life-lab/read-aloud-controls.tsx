"use client";

// Chrome on macOS may expose speechSynthesis voices but fail to start audio;
// Safari is more reliable for native speech. We show a calm fallback instead of forcing Chrome.
import { useEffect, useRef, type ReactNode } from "react";

import { useSpeechSynthesis } from "@/components/life-lab/use-speech-synthesis";
import {
  formatSpeechRate,
  SPEECH_AUTO_VOICE_ID,
  SPEECH_BROWSER_FALLBACK_MESSAGE,
  SPEECH_RATE_OPTIONS,
  DEFAULT_SPEECH_RATE,
  type ListedSelectableSpeechVoice,
  type SpeechDiagnostics,
  type SpeechRate,
} from "@/lib/life-lab/speech";

type ReadAloudControlsProps = {
  text: string | string[];
  className?: string;
  compact?: boolean;
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
  voices: ListedSelectableSpeechVoice[];
  selectedVoiceId: string;
  setSelectedVoiceId: (voiceId: string) => void;
  disabled?: boolean;
}) {
  return (
    <label className="inline-flex min-w-0 items-center gap-1.5 text-xs text-muted">
      <span className="shrink-0">Voice</span>
      <select
        value={selectedVoiceId}
        onChange={(event) => setSelectedVoiceId(event.target.value)}
        disabled={disabled}
        className="max-w-[11rem] truncate rounded-full border border-border/70 bg-transparent px-2 py-1.5 text-xs text-foreground disabled:cursor-not-allowed disabled:opacity-50 sm:max-w-[14rem]"
      >
        <option value={SPEECH_AUTO_VOICE_ID}>Auto</option>
        {voices.map((voice) => (
          <option key={voice.id} value={voice.id}>
            {voice.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function SpeechPlaybackNotice({ show }: { show: boolean }) {
  // Expected on Chrome/macOS when speechSynthesis never reaches onstart.
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
  voiceUnavailableNotice?: string | null;
  diagnostics: SpeechDiagnostics;
};

function ReadAloudPanel({
  className = "",
  children,
  playbackFailed,
  voiceFallbackNotice,
  voiceUnavailableNotice = null,
  diagnostics,
}: ReadAloudPanelProps) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
      <SpeechVoiceFallbackNotice message={voiceUnavailableNotice} />
      <SpeechVoiceFallbackNotice message={voiceFallbackNotice} />
      <SpeechPlaybackNotice show={playbackFailed} />
      <SpeechDevDiagnostic diagnostics={diagnostics} />
    </div>
  );
}

export function ReadAloudControls({
  text,
  className = "",
  compact = false,
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

  if (compact) {
    return (
      <>
        <div className={`md:hidden ${className}`}>
          <div className="flex flex-wrap items-center gap-2">
            {!isSpeaking ? (
              <ControlButton onClick={() => speak(text)}>
                Read aloud
              </ControlButton>
            ) : null}
            {!isSpeaking && rate !== DEFAULT_SPEECH_RATE ? (
              <span className="text-xs text-muted">{formatSpeechRate(rate)}</span>
            ) : null}
          </div>

          <details className="ui-settings-details group mt-1.5">
            <summary className="ui-settings-details-summary !py-1.5 !text-xs !normal-case !tracking-normal">
              Audio options
            </summary>
            <div className="ui-settings-details-body space-y-2">
              <SpeechVoiceSelector
                voices={selectableVoices}
                selectedVoiceId={selectedVoiceId}
                setSelectedVoiceId={setSelectedVoiceId}
                disabled={isSpeaking}
              />
              <SpeechRateControls
                rate={rate}
                setRate={setRate}
                disabled={isSpeaking}
              />
              <SpeechVoiceFallbackNotice message={voiceUnavailableNotice} />
              <SpeechVoiceFallbackNotice message={voiceFallbackNotice} />
              <SpeechPlaybackNotice show={playbackFailed} />
              <SpeechDevDiagnostic diagnostics={diagnostics} />
            </div>
          </details>

          {isSpeaking ? (
            <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-center gap-2 border-t border-border/60 bg-surface/95 px-4 py-2.5 backdrop-blur">
              <ControlButton onClick={stop} active>
                Stop
              </ControlButton>
              {isPaused ? (
                <ControlButton onClick={resume}>Resume</ControlButton>
              ) : (
                <ControlButton onClick={pause}>Pause</ControlButton>
              )}
              <span className="text-xs text-muted">{formatSpeechRate(rate)}</span>
            </div>
          ) : null}
        </div>

        <ReadAloudPanel
          className={`hidden md:flex ${className}`}
          playbackFailed={playbackFailed}
          voiceFallbackNotice={voiceFallbackNotice}
          voiceUnavailableNotice={voiceUnavailableNotice}
          diagnostics={diagnostics}
        >
          {!isSpeaking ? (
            <ControlButton onClick={() => speak(text)}>Read aloud</ControlButton>
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
            voices={selectableVoices}
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
      </>
    );
  }

  return (
    <ReadAloudPanel
      className={className}
      playbackFailed={playbackFailed}
      voiceFallbackNotice={voiceFallbackNotice}
      voiceUnavailableNotice={voiceUnavailableNotice}
      diagnostics={diagnostics}
    >
      {!isSpeaking ? (
        <ControlButton onClick={() => speak(text)}>
          Read aloud
        </ControlButton>
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
        voices={selectableVoices}
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
  /** Compact Listen button with popover panel (default Explore layout). */
  compact?: boolean;
  /** Show speech diagnostics (Chrome · voices=…) only in developer mode. */
  developerMode?: boolean;
};

export function FlashcardReadAloudControls({
  question,
  answer,
  revealed,
  cardKey,
  className = "",
  compact = false,
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

  const actionButtons = !isSpeaking ? (
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
  );

  const voiceAndRate = (
    <>
      <SpeechVoiceSelector
        voices={selectableVoices}
        selectedVoiceId={selectedVoiceId}
        setSelectedVoiceId={setSelectedVoiceId}
        disabled={isSpeaking}
      />
      <SpeechRateControls
        rate={rate}
        setRate={setRate}
        disabled={isSpeaking}
      />
    </>
  );

  if (compact) {
    return (
      <details
        className={`flashcard-listen group relative print:hidden ${className}`.trim()}
      >
        <summary
          className="inline-flex min-h-10 cursor-pointer list-none items-center rounded-full border border-border/70 px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-accent-cream/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border [&::-webkit-details-marker]:hidden"
          aria-label="Listen"
        >
          Listen
        </summary>
        <div className="flashcard-listen-panel absolute right-0 z-20 mt-2 w-[min(100vw-2rem,18rem)] space-y-3 rounded-xl border border-border/70 bg-background p-3 shadow-lg">
          <div className="flex flex-wrap gap-2">{actionButtons}</div>
          <div className="space-y-2 border-t border-border/50 pt-2">
            {voiceAndRate}
          </div>
          <SpeechVoiceFallbackNotice message={voiceUnavailableNotice} />
          <SpeechVoiceFallbackNotice message={voiceFallbackNotice} />
          <SpeechPlaybackNotice show={playbackFailed} />
          {developerMode ? (
            <SpeechDevDiagnostic diagnostics={diagnostics} />
          ) : null}
        </div>
      </details>
    );
  }

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <div className="flex flex-wrap items-center gap-2">
        {actionButtons}
        {voiceAndRate}
      </div>
      <SpeechVoiceFallbackNotice message={voiceUnavailableNotice} />
      <SpeechVoiceFallbackNotice message={voiceFallbackNotice} />
      <SpeechPlaybackNotice show={playbackFailed} />
      {developerMode ? (
        <SpeechDevDiagnostic diagnostics={diagnostics} />
      ) : null}
    </div>
  );
}

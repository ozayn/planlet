"use client";

import { useState } from "react";

import { AudioRecorder } from "@/components/audio/audio-recorder";
import { VOICE_TRANSCRIPTION_PRIVACY_TEXT } from "@/lib/activity-timer/session-notes";
import {
  combineVoiceTranscript,
  type VoiceTranscriptMode,
} from "@/lib/voice-transcription";

type VoiceTextFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  multiline?: boolean;
  transcriptMode?: VoiceTranscriptMode;
  onTranscriptApplied?: (value: string) => void;
};

export function VoiceTextField({
  id,
  label,
  value,
  onChange,
  placeholder,
  disabled = false,
  multiline = false,
  transcriptMode = "replace",
  onTranscriptApplied,
}: VoiceTextFieldProps) {
  const [showVoice, setShowVoice] = useState(false);

  function handleTranscript(transcript: string) {
    const nextValue = combineVoiceTranscript(value, transcript, transcriptMode);
    onChange(nextValue);
    setShowVoice(false);
    onTranscriptApplied?.(nextValue);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="text-sm font-medium text-foreground">
          {label}
        </label>
        <button
          type="button"
          onClick={() => setShowVoice((current) => !current)}
          disabled={disabled}
          aria-label={showVoice ? "Hide voice input" : "Record voice input"}
          aria-pressed={showVoice}
          className="inline-flex min-h-8 min-w-8 items-center justify-center rounded-full text-base text-muted transition-colors hover:bg-accent-cream/40 hover:text-foreground disabled:opacity-50"
        >
          <span aria-hidden="true">🎤</span>
        </button>
      </div>

      {multiline ? (
        <textarea
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          rows={3}
          className="ui-input w-full resize-y"
          dir="auto"
        />
      ) : (
        <input
          id={id}
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="ui-input w-full"
          dir="auto"
        />
      )}

      {showVoice ? (
        <div className="rounded-xl border border-border/60 bg-accent-cream/20 p-3">
          <p className="mb-2 text-xs text-muted">
            {VOICE_TRANSCRIPTION_PRIVACY_TEXT}
          </p>
          <AudioRecorder
            recordLabel="Record"
            successMessage="Transcript added. Edit before saving."
            discardAfterTranscribe
            autoTranscribeOnStop
            compact
            onTranscript={handleTranscript}
          />
        </div>
      ) : null}
    </div>
  );
}

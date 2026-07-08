"use client";

import { useEffect, useState } from "react";

import { AudioRecorder } from "@/components/audio/audio-recorder";

type VoiceTextFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  multiline?: boolean;
};

export function VoiceTextField({
  id,
  label,
  value,
  onChange,
  placeholder,
  disabled = false,
  multiline = false,
}: VoiceTextFieldProps) {
  const [showVoice, setShowVoice] = useState(false);

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
          className="text-xs font-medium text-muted transition-colors hover:text-foreground disabled:opacity-50"
        >
          {showVoice ? "Hide voice" : "Use voice"}
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
        />
      )}

      {showVoice ? (
        <div className="rounded-xl border border-border/60 bg-accent-cream/20 p-3">
          <p className="mb-2 text-xs text-muted">
            Record briefly, transcribe, then edit the text. Audio is not saved.
          </p>
          <AudioRecorder
            onTranscript={(transcript) => {
              onChange(transcript);
            }}
          />
        </div>
      ) : null}
    </div>
  );
}

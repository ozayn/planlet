"use client";

import { useMemo, useState } from "react";

import {
  NARRATION_PREVIEW_TEXT,
  OPENAI_NARRATION_STYLES,
  OPENAI_NARRATION_SUGGESTED_VOICES,
  OPENAI_NARRATION_VOICES,
  type OpenAiNarrationStyleId,
} from "@/lib/life-lab/narration-config";
import {
  createNarrationObjectUrl,
  replaceAudioObjectUrl,
} from "@/lib/life-lab/narration-playback";
import { formatOpenAiNarrationVoiceLabel } from "@/lib/life-lab/openai-narration-preferences";

const PREVIEW_STYLES: OpenAiNarrationStyleId[] = [
  "NEUTRAL_EDUCATIONAL",
  "BRITISH_FEMALE_CALM",
  "WARM_CONVERSATIONAL",
];

const PRIMARY_VOICES = OPENAI_NARRATION_SUGGESTED_VOICES.map((id) => ({
  id,
  label: formatOpenAiNarrationVoiceLabel(id),
}));

const MORE_VOICES = OPENAI_NARRATION_VOICES.filter(
  (voice) =>
    !(OPENAI_NARRATION_SUGGESTED_VOICES as readonly string[]).includes(voice.id),
);

type CellState = {
  status: "idle" | "loading" | "ready" | "error";
  message?: string;
  objectUrl?: string;
  voice?: string;
  styleSlug?: string;
};

function cellKey(voice: string, style: OpenAiNarrationStyleId): string {
  return `${voice}:${style}`;
}

type NarrationVoicePreviewMatrixProps = {
  selectedVoice?: string;
  selectedStyle?: OpenAiNarrationStyleId;
  onUseVoice?: (voice: string) => void;
  disabled?: boolean;
};

export function NarrationVoicePreviewMatrix({
  selectedVoice,
  selectedStyle = "NEUTRAL_EDUCATIONAL",
  onUseVoice,
  disabled = false,
}: NarrationVoicePreviewMatrixProps) {
  const [cells, setCells] = useState<Record<string, CellState>>({});
  const [showMoreVoices, setShowMoreVoices] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const sampleText = useMemo(() => NARRATION_PREVIEW_TEXT, []);
  const voices = showMoreVoices
    ? [...PRIMARY_VOICES, ...MORE_VOICES]
    : PRIMARY_VOICES;

  async function generatePreview(voice: string, style: OpenAiNarrationStyleId) {
    const key = cellKey(voice, style);

    setCells((current) => ({
      ...current,
      [key]: { status: "loading" },
    }));

    try {
      const response = await fetch("/api/life-lab/narration/voice-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voice, narrationStyle: style }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        setCells((current) => ({
          ...current,
          [key]: {
            status: "error",
            message: payload?.error ?? "Preview failed.",
          },
        }));
        return;
      }

      const blob = await response.blob();
      const objectUrl = createNarrationObjectUrl(blob);

      setCells((current) => {
        const previous = current[key]?.objectUrl;

        if (previous) {
          URL.revokeObjectURL(previous);
        }

        return {
          ...current,
          [key]: {
            status: "ready",
            objectUrl,
            voice: response.headers.get("X-Narration-Voice") ?? voice,
            styleSlug:
              response.headers.get("X-Narration-Style") ??
              OPENAI_NARRATION_STYLES[style].slug,
          },
        };
      });
    } catch {
      setCells((current) => ({
        ...current,
        [key]: { status: "error", message: "Preview failed." },
      }));
    }
  }

  function handleUseVoice(voice: string) {
    onUseVoice?.(voice);
    setStatusMessage(
      `Saved ${formatOpenAiNarrationVoiceLabel(voice)}. Voice changes apply the next time you start narration.`,
    );
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">Preview voices</p>
        <p className="text-xs leading-relaxed text-muted">
          Compare the same sample text across voices and styles. Previews bypass
          note cache. Accent is best-effort and may vary by voice — none is
          guaranteed British.
        </p>
      </div>

      <p className="rounded-xl border border-border/70 bg-accent-cream/20 px-3 py-2 text-xs leading-relaxed text-muted">
        {sampleText}
      </p>

      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-xs">
          <thead>
            <tr>
              <th className="border border-border/70 px-2 py-2 text-left font-medium text-foreground">
                Voice
              </th>
              {PREVIEW_STYLES.map((styleId) => (
                <th
                  key={styleId}
                  className="border border-border/70 px-2 py-2 text-left font-medium text-foreground"
                >
                  {OPENAI_NARRATION_STYLES[styleId].label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {voices.map((voice) => (
              <tr key={voice.id}>
                <td className="border border-border/70 px-2 py-2 align-top">
                  <div className="space-y-1.5">
                    <p className="font-medium text-foreground">
                      {voice.label}
                      {selectedVoice === voice.id ? (
                        <span className="ml-1 font-normal text-muted-light">
                          (saved)
                        </span>
                      ) : null}
                    </p>
                    {onUseVoice ? (
                      <button
                        type="button"
                        disabled={disabled || selectedVoice === voice.id}
                        onClick={() => handleUseVoice(voice.id)}
                        className="rounded-full border border-border/70 px-2.5 py-1 text-[0.6875rem] font-medium text-muted transition-colors hover:bg-accent-cream/50 hover:text-foreground disabled:opacity-60"
                      >
                        {selectedVoice === voice.id ? "Using this voice" : "Use this voice"}
                      </button>
                    ) : null}
                  </div>
                </td>
                {PREVIEW_STYLES.map((styleId) => {
                  const key = cellKey(voice.id, styleId);
                  const cell = cells[key];
                  const isActiveStyle = selectedStyle === styleId;

                  return (
                    <td
                      key={styleId}
                      className="border border-border/70 px-2 py-2 align-top"
                    >
                      <div className="space-y-2">
                        <button
                          type="button"
                          onClick={() => void generatePreview(voice.id, styleId)}
                          disabled={disabled || cell?.status === "loading"}
                          className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-60 ${
                            isActiveStyle
                              ? "border-border bg-accent-cream/40 text-foreground"
                              : "border-border/70 text-muted hover:bg-accent-cream/50 hover:text-foreground"
                          }`}
                        >
                          {cell?.status === "loading" ? "Generating…" : "Generate"}
                        </button>
                        {cell?.status === "error" ? (
                          <p className="text-[0.6875rem] text-red-600">
                            {cell.message}
                          </p>
                        ) : null}
                        {cell?.status === "ready" && cell.objectUrl ? (
                          <>
                            <audio
                              controls
                              src={cell.objectUrl}
                              className="w-full max-w-xs"
                            />
                            <p className="text-[0.6875rem] text-muted-light">
                              {cell.voice} · {cell.styleSlug}
                            </p>
                          </>
                        ) : null}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!showMoreVoices ? (
        <button
          type="button"
          onClick={() => setShowMoreVoices(true)}
          className="text-xs font-medium text-muted underline-offset-2 hover:text-foreground hover:underline"
        >
          Show more voices
        </button>
      ) : null}

      {statusMessage ? (
        <p className="text-xs text-muted-light">{statusMessage}</p>
      ) : null}
    </div>
  );
}

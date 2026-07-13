"use client";

import { useMemo, useState } from "react";

import {
  NARRATION_PREVIEW_TEXT,
  OPENAI_NARRATION_STYLES,
  type OpenAiNarrationStyleId,
} from "@/lib/life-lab/narration-config";
import {
  createNarrationObjectUrl,
  replaceAudioObjectUrl,
} from "@/lib/life-lab/narration-playback";

const PREVIEW_VOICES = [
  { id: "marin", label: "Marin" },
  { id: "coral", label: "Coral" },
  { id: "shimmer", label: "Shimmer" },
  { id: "nova", label: "Nova" },
  { id: "fable", label: "Fable" },
] as const;

const PREVIEW_STYLES: Array<{
  id: OpenAiNarrationStyleId;
  label: string;
}> = [
  { id: "BRITISH_FEMALE_CALM", label: "British educational" },
  { id: "NEUTRAL_EDUCATIONAL", label: "Neutral educational" },
  { id: "WARM_CONVERSATIONAL", label: "Warm conversational" },
];

type CellState = {
  status: "idle" | "loading" | "ready" | "error";
  message?: string;
  objectUrl?: string;
  voice?: string;
  styleSlug?: string;
  instructionsFingerprint?: string;
};

function cellKey(voice: string, style: OpenAiNarrationStyleId): string {
  return `${voice}:${style}`;
}

export function AdminNarrationVoicePreview() {
  const [cells, setCells] = useState<Record<string, CellState>>({});

  const sampleText = useMemo(() => NARRATION_PREVIEW_TEXT, []);

  async function generatePreview(voice: string, style: OpenAiNarrationStyleId) {
    const key = cellKey(voice, style);

    setCells((current) => ({
      ...current,
      [key]: { status: "loading" },
    }));

    try {
      const response = await fetch("/api/admin/narration-voice-preview", {
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
            instructionsFingerprint:
              response.headers.get("X-Narration-Instructions-Fingerprint") ??
              undefined,
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

  return (
    <div className="space-y-4">
      <p className="text-sm leading-relaxed text-muted">
        Admin-only matrix for comparing OpenAI TTS voices and narration styles.
        Each preview bypasses Life Lab narration cache and uses the sample text
        below.
      </p>

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
              {PREVIEW_STYLES.map((style) => (
                <th
                  key={style.id}
                  className="border border-border/70 px-2 py-2 text-left font-medium text-foreground"
                >
                  {style.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PREVIEW_VOICES.map((voice) => (
              <tr key={voice.id}>
                <td className="border border-border/70 px-2 py-2 font-medium text-foreground">
                  {voice.label}
                </td>
                {PREVIEW_STYLES.map((style) => {
                  const key = cellKey(voice.id, style.id);
                  const cell = cells[key];

                  return (
                    <td
                      key={style.id}
                      className="border border-border/70 px-2 py-2 align-top"
                    >
                      <div className="space-y-2">
                        <button
                          type="button"
                          onClick={() => void generatePreview(voice.id, style.id)}
                          disabled={cell?.status === "loading"}
                          className="rounded-full border border-border/70 px-2.5 py-1 text-xs font-medium text-muted transition-colors hover:bg-accent-cream/50 hover:text-foreground disabled:opacity-60"
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
                            <audio controls src={cell.objectUrl} className="w-full max-w-xs" />
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
    </div>
  );
}

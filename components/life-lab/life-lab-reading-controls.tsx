"use client";

import { BookOpenText, RotateCcw } from "lucide-react";

import { useLifeLabReadingMode } from "@/components/life-lab/life-lab-reading-mode";
import {
  LIFE_LAB_READING_FONT_SIZES,
  LIFE_LAB_READING_LINE_HEIGHTS,
  LIFE_LAB_READING_MODES,
  LIFE_LAB_READING_WIDTHS,
  type LifeLabReadingFontSize,
  type LifeLabReadingLineHeight,
  type LifeLabReadingMode,
  type LifeLabReadingWidth,
} from "@/lib/life-lab/reading-preferences";

const MODE_LABELS: Record<LifeLabReadingMode, string> = {
  normal: "Normal",
  bionic: "Bionic",
  focus: "Focus",
  comfortable: "Comfortable",
  dense: "Dense",
  study: "Study",
};

const FONT_LABELS: Record<LifeLabReadingFontSize, string> = {
  small: "Small",
  default: "Default",
  large: "Large",
  "extra-large": "Extra large",
};

const LINE_HEIGHT_LABELS: Record<LifeLabReadingLineHeight, string> = {
  compact: "Compact",
  default: "Default",
  relaxed: "Relaxed",
};

const WIDTH_LABELS: Record<LifeLabReadingWidth, string> = {
  narrow: "Narrow",
  standard: "Standard",
  wide: "Wide",
};

function ReadingSelect<Value extends string>({
  label,
  value,
  values,
  labels,
  onChange,
}: {
  label: string;
  value: Value;
  values: readonly Value[];
  labels: Record<Value, string>;
  onChange: (value: Value) => void;
}) {
  return (
    <label className="grid gap-1 text-xs font-medium text-muted">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as Value)}
        className="min-h-10 rounded-lg border border-border bg-surface px-2.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border"
      >
        {values.map((option) => (
          <option key={option} value={option}>
            {labels[option]}
          </option>
        ))}
      </select>
    </label>
  );
}

export function LifeLabReadingControls({
  variant = "button",
}: {
  variant?: "button" | "panel";
} = {}) {
  const { preferences, setPreference, resetPreferences } =
    useLifeLabReadingMode();

  const panel = (
    <div className={variant === "panel" ? "space-y-3" : "ui-reading-controls-panel"}>
      {variant === "button" ? (
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            Reading settings
          </h2>
          <p className="mt-0.5 text-xs leading-relaxed text-muted">
            Adjust this view without changing the note.
          </p>
        </div>
      ) : null}

      <div className="grid gap-3">
        <ReadingSelect
          label="Reading mode"
          value={preferences.readingMode}
          values={LIFE_LAB_READING_MODES}
          labels={MODE_LABELS}
          onChange={(value) => setPreference("readingMode", value)}
        />
        <div className="grid grid-cols-2 gap-2">
          <ReadingSelect
            label="Font size"
            value={preferences.readingFontSize}
            values={LIFE_LAB_READING_FONT_SIZES}
            labels={FONT_LABELS}
            onChange={(value) => setPreference("readingFontSize", value)}
          />
          <ReadingSelect
            label="Line height"
            value={preferences.readingLineHeight}
            values={LIFE_LAB_READING_LINE_HEIGHTS}
            labels={LINE_HEIGHT_LABELS}
            onChange={(value) => setPreference("readingLineHeight", value)}
          />
        </div>
        <ReadingSelect
          label="Measure"
          value={preferences.readingWidth}
          values={LIFE_LAB_READING_WIDTHS}
          labels={WIDTH_LABELS}
          onChange={(value) => setPreference("readingWidth", value)}
        />
        <label className="flex min-h-10 items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            checked={preferences.readingHighContrast}
            onChange={(event) =>
              setPreference("readingHighContrast", event.target.checked)
            }
            className="size-4 rounded border-border"
          />
          High contrast
        </label>
        <button
          type="button"
          onClick={resetPreferences}
          className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-border/70 px-3 text-xs font-medium text-muted transition-colors hover:bg-accent-cream/40 hover:text-foreground"
        >
          <RotateCcw className="size-3.5" aria-hidden="true" />
          Reset reading settings
        </button>
      </div>
    </div>
  );

  if (variant === "panel") {
    return <div className="print:hidden">{panel}</div>;
  }

  return (
    <details className="ui-reading-controls group print:hidden">
      <summary
        className="inline-flex min-h-10 cursor-pointer list-none items-center gap-1.5 rounded-full border border-border/70 px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-accent-cream/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border [&::-webkit-details-marker]:hidden"
        aria-label="Reading settings"
      >
        <BookOpenText className="size-4" aria-hidden="true" />
        <span>Reading</span>
        <span className="hidden text-muted-light md:inline">
          · {MODE_LABELS[preferences.readingMode]}
        </span>
      </summary>
      {panel}
    </details>
  );
}

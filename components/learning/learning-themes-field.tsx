"use client";

import { useId, useMemo, useState } from "react";

import {
  LEARNING_DEFAULT_THEMES,
  addLearningTheme,
  getCustomLearningThemes,
  normalizeLearningThemeKey,
  toggleLearningTheme,
} from "@/lib/learning-journey/constants";
import { passwordManagerSafeControlProps } from "@/lib/password-manager-ignore";

type LearningThemesFieldProps = {
  themes: string[];
  onThemesChange: (themes: string[]) => void;
  disabled?: boolean;
};

type ThemeChipProps = {
  theme: string;
  selected: boolean;
  disabled?: boolean;
  onToggle: (theme: string) => void;
};

function ThemeChip({ theme, selected, disabled = false, onToggle }: ThemeChipProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onToggle(theme)}
      {...passwordManagerSafeControlProps}
      aria-pressed={selected}
      className={`min-h-9 rounded-full border px-3 py-1.5 text-xs transition-colors disabled:opacity-50 ${
        selected
          ? "border-border bg-accent-cream/60 text-foreground"
          : "border-border-soft text-muted hover:border-border hover:text-foreground"
      }`}
    >
      {theme}
    </button>
  );
}

export function LearningThemesField({
  themes,
  onThemesChange,
  disabled = false,
}: LearningThemesFieldProps) {
  const inputId = useId();
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customDraft, setCustomDraft] = useState("");

  const customThemes = useMemo(() => getCustomLearningThemes(themes), [themes]);

  const displayThemes = useMemo(
    () => [...LEARNING_DEFAULT_THEMES, ...customThemes],
    [customThemes],
  );

  function handleToggle(theme: string) {
    onThemesChange(toggleLearningTheme(themes, theme));
  }

  function handleAddCustomTheme() {
    const nextThemes = addLearningTheme(themes, customDraft);
    if (nextThemes === themes) {
      return;
    }

    onThemesChange(nextThemes);
    setCustomDraft("");
    setShowCustomInput(false);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-medium text-muted">Themes</span>
        <button
          type="button"
          disabled={disabled}
          onClick={() => setShowCustomInput((current) => !current)}
          {...passwordManagerSafeControlProps}
          className="text-xs text-muted transition-colors hover:text-foreground disabled:opacity-50"
        >
          + Add custom theme
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {displayThemes.map((theme) => (
          <ThemeChip
            key={theme}
            theme={theme}
            selected={themes.some(
              (item) => normalizeLearningThemeKey(item) === normalizeLearningThemeKey(theme),
            )}
            disabled={disabled}
            onToggle={handleToggle}
          />
        ))}
      </div>

      {showCustomInput ? (
        <div className="flex flex-wrap items-center gap-2">
          <input
            id={inputId}
            type="text"
            value={customDraft}
            disabled={disabled}
            placeholder="Custom theme"
            onChange={(event) => setCustomDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                handleAddCustomTheme();
              }

              if (event.key === "Escape") {
                setShowCustomInput(false);
                setCustomDraft("");
              }
            }}
            className="ui-input min-h-10 min-w-[10rem] flex-1 text-sm"
            dir="auto"
            {...passwordManagerSafeControlProps}
          />
          <button
            type="button"
            disabled={disabled || !customDraft.trim()}
            onClick={handleAddCustomTheme}
            className="ui-btn-secondary ui-btn-compact min-h-10 px-3 text-xs disabled:opacity-50"
          >
            Add
          </button>
        </div>
      ) : null}
    </div>
  );
}

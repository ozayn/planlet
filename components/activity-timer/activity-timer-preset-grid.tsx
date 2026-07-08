"use client";

import { ActivityPresetIcon } from "@/components/activity-timer/activity-preset-icon";
import type { SerializedActivityTimerPreset } from "@/lib/activity-timer/constants";

type ActivityTimerPresetGridProps = {
  presets: SerializedActivityTimerPreset[];
  disabled?: boolean;
  onSelectPreset: (preset: SerializedActivityTimerPreset) => void;
  onNewActivity: () => void;
};

function PresetCard({
  title,
  iconName,
  subtitle,
  meta,
  disabled,
  onClick,
  dashed = false,
}: {
  title: string;
  iconName?: string | null;
  subtitle?: string | null;
  meta?: string | null;
  disabled?: boolean;
  onClick: () => void;
  dashed?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`min-h-[4.5rem] rounded-2xl border bg-surface p-4 text-left shadow-sm transition-colors disabled:opacity-50 ${
        dashed
          ? "border-dashed border-border/80 text-muted hover:border-border hover:bg-accent-cream/15 hover:text-foreground"
          : "border-border-soft hover:bg-accent-cream/20"
      }`}
    >
      <span className="flex items-start gap-2.5">
        <ActivityPresetIcon iconName={iconName} />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-foreground">{title}</span>
          {meta ? (
            <span className="mt-1 block text-xs text-muted">{meta}</span>
          ) : null}
          {subtitle ? (
            <span className="mt-1 block text-xs text-muted-light">{subtitle}</span>
          ) : null}
        </span>
      </span>
    </button>
  );
}

export function ActivityTimerPresetGrid({
  presets,
  disabled = false,
  onSelectPreset,
  onNewActivity,
}: ActivityTimerPresetGridProps) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-foreground">Presets</h2>
      <div className="grid gap-2 sm:grid-cols-2">
        {presets.map((preset) => (
          <PresetCard
            key={preset.id}
            title={preset.title}
            iconName={preset.iconName}
            meta={preset.targetDurationLabel}
            subtitle={preset.category}
            disabled={disabled}
            onClick={() => onSelectPreset(preset)}
          />
        ))}
        <PresetCard
          title="New activity"
          iconName="sparkles"
          disabled={disabled}
          onClick={onNewActivity}
          dashed
        />
      </div>
    </section>
  );
}

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
  detail,
  disabled,
  onClick,
  dashed = false,
}: {
  title: string;
  iconName?: string | null;
  detail?: string | null;
  disabled?: boolean;
  onClick: () => void;
  dashed?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-xl border bg-surface p-3 text-left shadow-sm transition-colors disabled:opacity-50 sm:min-h-[4.5rem] sm:rounded-2xl sm:p-4 ${
        dashed
          ? "border-dashed border-border/80 text-muted hover:border-border hover:bg-accent-cream/15 hover:text-foreground"
          : "border-border-soft hover:bg-accent-cream/20"
      }`}
    >
      <span className="flex items-start gap-2">
        <ActivityPresetIcon
          iconName={iconName}
          className="size-4 shrink-0 text-muted sm:size-[18px]"
        />
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-medium leading-snug text-foreground line-clamp-2 sm:text-sm">
            {title}
          </span>
          {detail ? (
            <span className="mt-0.5 block truncate text-[0.6875rem] text-muted-light sm:text-xs">
              {detail}
            </span>
          ) : null}
        </span>
      </span>
    </button>
  );
}

function buildPresetDetail(
  category: string | null,
  targetDurationLabel: string | null,
): string | null {
  const parts = [category, targetDurationLabel].filter(Boolean);

  return parts.length > 0 ? parts.join(" · ") : null;
}

export function ActivityTimerPresetGrid({
  presets,
  disabled = false,
  onSelectPreset,
  onNewActivity,
}: ActivityTimerPresetGridProps) {
  return (
    <section className="space-y-2.5 sm:space-y-3">
      <h2 className="text-sm font-semibold text-foreground">Presets</h2>
      <div className="grid grid-cols-2 gap-2 max-[340px]:grid-cols-1 sm:grid-cols-2">
        {presets.map((preset) => (
          <PresetCard
            key={preset.id}
            title={preset.title}
            iconName={preset.iconName}
            detail={buildPresetDetail(
              preset.category,
              preset.targetDurationLabel,
            )}
            disabled={disabled}
            onClick={() => onSelectPreset(preset)}
          />
        ))}
        <PresetCard
          title="+ New activity"
          iconName="sparkles"
          disabled={disabled}
          onClick={onNewActivity}
          dashed
        />
      </div>
    </section>
  );
}

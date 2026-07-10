"use client";

import { useEffect, useMemo, useState } from "react";

import { SimpleSheet } from "@/components/ui/simple-sheet";
import type { LifeLabFilterKey, LifeLabFilterOption, LifeLabNoteFilters } from "@/lib/life-lab/filters";
import {
  LIFE_LAB_MULTI_VALUE_FILTER_KEYS,
  lifeLabFilterOptionLabel,
  parseLifeLabFilterValues,
  serializeLifeLabFilterValues,
} from "@/lib/life-lab/filters";
import {
  LIFE_LAB_FILTER_LABELS,
  LIFE_LAB_PRIMARY_FILTER_KEYS,
  LIFE_LAB_SEARCHABLE_FILTER_KEYS,
  LIFE_LAB_SECONDARY_FILTER_KEYS,
} from "@/lib/life-lab/filter-ui";

type LifeLabFilterPanelProps = {
  open: boolean;
  onClose: () => void;
  filters: LifeLabNoteFilters;
  filterOptions: Record<LifeLabFilterKey, LifeLabFilterOption[]>;
  onApply: (filters: LifeLabNoteFilters) => void;
  onClear: () => void;
  showFolderFilter?: boolean;
};

type DraftFilters = Partial<Record<LifeLabFilterKey, string[]>>;

function readDraftFilters(filters: LifeLabNoteFilters): DraftFilters {
  const draft: DraftFilters = {};

  for (const [key, value] of Object.entries(filters)) {
    if (!value?.trim()) {
      continue;
    }

    const filterKey = key as LifeLabFilterKey;

    if (
      (LIFE_LAB_MULTI_VALUE_FILTER_KEYS as readonly string[]).includes(filterKey)
    ) {
      draft[filterKey] = parseLifeLabFilterValues(value);
    } else {
      draft[filterKey] = [value];
    }
  }

  return draft;
}

function draftToAppliedFilters(draft: DraftFilters): LifeLabNoteFilters {
  const applied: LifeLabNoteFilters = {};

  for (const [key, values] of Object.entries(draft)) {
    const filterKey = key as LifeLabFilterKey;
    const serialized = serializeLifeLabFilterValues(values ?? []);

    if (serialized) {
      applied[filterKey] = serialized;
    }
  }

  return applied;
}

function draftValue(draft: DraftFilters, key: LifeLabFilterKey): string {
  return draft[key]?.[0] ?? "";
}

function setDraftSingle(
  draft: DraftFilters,
  key: LifeLabFilterKey,
  value: string,
): DraftFilters {
  const next = { ...draft };

  if (!value) {
    delete next[key];
    return next;
  }

  next[key] = [value];
  return next;
}

function SearchableFilterField({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: LifeLabFilterOption[];
  selected: string[];
  onChange: (values: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const listId = useMemo(
    () => `filter-${label.toLowerCase().replace(/\s+/g, "-")}`,
    [label],
  );

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    if (!normalized) {
      return [];
    }

    return options
      .filter((option) => option.label.toLowerCase().includes(normalized))
      .slice(0, 12);
  }, [options, query]);

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted">{label}</p>
      {selected.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          <span className="sr-only">Selected</span>
          {selected.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => onChange(selected.filter((item) => item !== value))}
              className="rounded-full bg-accent-cream px-2.5 py-1 text-xs text-foreground transition-colors hover:bg-accent-cream/70"
            >
              {lifeLabFilterOptionLabel(options, value)} ×
            </button>
          ))}
        </div>
      ) : null}
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={`Search ${label.toLowerCase()}...`}
        className="ui-input w-full text-sm"
        aria-controls={listId}
      />
      {query.trim() && filtered.length > 0 ? (
        <ul
          id={listId}
          className="max-h-40 overflow-y-auto rounded-lg border border-border/60"
        >
          {filtered.map((option) => {
            const isSelected = selected.includes(option.value);

            return (
              <li key={option.value}>
                <button
                  type="button"
                  disabled={isSelected}
                  onClick={() => {
                    onChange([...selected, option.value]);
                    setQuery("");
                  }}
                  className="w-full px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-accent-cream/30 disabled:cursor-default disabled:opacity-40"
                >
                  {option.label}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

function SelectFilterField({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: LifeLabFilterOption[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-muted">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="ui-input w-full text-sm"
      >
        <option value="">All</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function LifeLabFilterPanel({
  open,
  onClose,
  filters,
  filterOptions,
  onApply,
  onClear,
  showFolderFilter = false,
}: LifeLabFilterPanelProps) {
  const [draft, setDraft] = useState<DraftFilters>(() => readDraftFilters(filters));
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    if (open) {
      setDraft(readDraftFilters(filters));
      setMoreOpen(false);
    }
  }, [open, filters]);

  const secondaryKeys = [
    ...LIFE_LAB_SECONDARY_FILTER_KEYS,
    ...(showFolderFilter ? (["subfolder"] as const) : []),
  ];

  function renderFilterField(key: LifeLabFilterKey) {
    const options = filterOptions[key];

    if (options.length === 0) {
      return null;
    }

    if ((LIFE_LAB_SEARCHABLE_FILTER_KEYS as readonly string[]).includes(key)) {
      return (
        <SearchableFilterField
          key={key}
          label={LIFE_LAB_FILTER_LABELS[key]}
          options={options}
          selected={draft[key] ?? []}
          onChange={(values) =>
            setDraft((current) => {
              const next = { ...current };

              if (values.length === 0) {
                delete next[key];
              } else {
                next[key] = values;
              }

              return next;
            })
          }
        />
      );
    }

    return (
      <SelectFilterField
        key={key}
        label={LIFE_LAB_FILTER_LABELS[key]}
        options={options}
        value={draftValue(draft, key)}
        onChange={(value) => setDraft((current) => setDraftSingle(current, key, value))}
      />
    );
  }

  const footer = (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => {
          setDraft({});
          onClear();
          onClose();
        }}
        className="flex-1 rounded-full border border-border/70 px-4 py-2.5 text-sm font-medium text-muted transition-colors hover:border-border hover:text-foreground"
      >
        Clear
      </button>
      <button
        type="button"
        onClick={() => {
          onApply(draftToAppliedFilters(draft));
          onClose();
        }}
        className="flex-1 rounded-full bg-accent-cream px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent-cream/70"
      >
        Apply
      </button>
    </div>
  );

  return (
    <SimpleSheet
      open={open}
      onClose={onClose}
      title="Filters"
      footer={footer}
      overlayClassName="ui-life-lab-filter-sheet-overlay"
      panelClassName="ui-life-lab-filter-sheet-panel"
      bodyClassName="space-y-5"
    >
      <div className="space-y-4">
        <p className="text-xs font-medium text-muted-light">Primary filters</p>
        {LIFE_LAB_PRIMARY_FILTER_KEYS.map((key) => renderFilterField(key))}
      </div>

      <details
        className="ui-settings-details group"
        open={moreOpen ? true : undefined}
        onToggle={(event) => setMoreOpen(event.currentTarget.open)}
      >
        <summary className="ui-settings-details-summary !text-xs !normal-case !tracking-normal">
          <span className="font-medium text-muted">More filters</span>
        </summary>
        <div className="ui-settings-details-body space-y-4">
          {secondaryKeys.map((key) => renderFilterField(key))}
        </div>
      </details>
    </SimpleSheet>
  );
}

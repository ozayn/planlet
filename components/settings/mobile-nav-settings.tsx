"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  resetMobileNavItemsAction,
  updateMobileNavItemsAction,
} from "@/app/(app)/settings/actions";
import { SettingsSection } from "@/components/settings/settings-section";
import type { AppNavAccess, AppNavItemKey } from "@/lib/app-nav";
import {
  DEFAULT_MOBILE_NAV_ITEMS,
  MAX_MOBILE_NAV_ITEMS,
  getMobileNavLabel,
  getSelectableMobileNavSections,
} from "@/lib/mobile-nav";
import { passwordManagerSafeControlProps } from "@/lib/password-manager-ignore";

type MobileNavSettingsProps = {
  value: AppNavItemKey[];
  access: AppNavAccess;
};

export function MobileNavSettings({ value, access }: MobileNavSettingsProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<AppNavItemKey[]>(value);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const sections = getSelectableMobileNavSections(access);
  const selectedSet = new Set(selected);

  function persist(next: AppNavItemKey[], rollback: AppNavItemKey[]) {
    setError(null);
    setSelected(next);

    startTransition(async () => {
      const result = await updateMobileNavItemsAction(next);

      if (!result.success) {
        setSelected(rollback);
        setError(result.error);
        return;
      }

      router.refresh();
    });
  }

  function addItem(key: AppNavItemKey) {
    if (selected.includes(key) || selected.length >= MAX_MOBILE_NAV_ITEMS) {
      return;
    }

    persist([...selected, key], selected);
  }

  function removeItem(key: AppNavItemKey) {
    persist(
      selected.filter((item) => item !== key),
      selected,
    );
  }

  function moveItem(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;

    if (nextIndex < 0 || nextIndex >= selected.length) {
      return;
    }

    const next = [...selected];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    persist(next, selected);
  }

  function handleReset() {
    setError(null);

    startTransition(async () => {
      const result = await resetMobileNavItemsAction();

      if (!result.success) {
        setError(result.error);
        return;
      }

      setSelected(DEFAULT_MOBILE_NAV_ITEMS);
      router.refresh();
    });
  }

  return (
    <SettingsSection title="Navigation">
      <div className="space-y-4">
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">Quick access tabs</p>
          <p className="text-sm text-muted">
            Choose up to 4 sections to show in the mobile navigation bar.
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-light">
            Selected ({selected.length}/{MAX_MOBILE_NAV_ITEMS})
          </p>

          {selected.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border-soft px-3 py-4 text-sm text-muted">
              No tabs selected. Defaults will be used until you choose tabs.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {selected.map((key, index) => (
                <li
                  key={key}
                  className="flex items-center gap-2 rounded-xl border border-border-soft bg-background px-2 py-1.5"
                >
                  <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                    {getMobileNavLabel(key)}
                  </span>
                  <div className="flex shrink-0 items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => moveItem(index, -1)}
                      disabled={isPending || index === 0}
                      {...passwordManagerSafeControlProps}
                      className="flex min-h-9 min-w-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-accent-cream hover:text-foreground disabled:opacity-40"
                      aria-label={`Move ${getMobileNavLabel(key)} up`}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => moveItem(index, 1)}
                      disabled={isPending || index === selected.length - 1}
                      {...passwordManagerSafeControlProps}
                      className="flex min-h-9 min-w-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-accent-cream hover:text-foreground disabled:opacity-40"
                      aria-label={`Move ${getMobileNavLabel(key)} down`}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => removeItem(key)}
                      disabled={isPending}
                      {...passwordManagerSafeControlProps}
                      className="flex min-h-9 min-w-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-accent-cream hover:text-foreground disabled:opacity-40"
                      aria-label={`Remove ${getMobileNavLabel(key)}`}
                    >
                      ✕
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {selected.length < MAX_MOBILE_NAV_ITEMS ? (
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-light">
              Add tab
            </p>
            {sections.map((section) => {
              const availableItems = section.items.filter(
                (item) => !selectedSet.has(item.key),
              );

              if (availableItems.length === 0) {
                return null;
              }

              return (
                <div key={section.title} className="space-y-1.5">
                  <p className="text-xs font-medium text-muted">
                    {section.title}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {availableItems.map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => addItem(item.key)}
                        disabled={isPending}
                        {...passwordManagerSafeControlProps}
                        className="rounded-lg border border-border-soft px-3 py-2 text-sm text-foreground transition-colors hover:bg-accent-cream disabled:opacity-50"
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}

        <button
          type="button"
          onClick={handleReset}
          disabled={isPending}
          {...passwordManagerSafeControlProps}
          className="text-sm text-muted transition-colors hover:text-foreground disabled:opacity-50"
        >
          Reset to defaults
        </button>

        {error ? (
          <p className="text-sm text-accent-red" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </SettingsSection>
  );
}

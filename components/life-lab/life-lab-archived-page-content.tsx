"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { LifeLabArchiveMenuItem } from "@/components/life-lab/life-lab-archive-menu-item";
import { LifeLabItemMoreMenu } from "@/components/life-lab/life-lab-item-more-menu";
import type { ArchivedLifeLabListItem } from "@/lib/life-lab/archived-view";
import { filterArchivedListItems } from "@/lib/life-lab/archived-view";
import { ACTION_LABELS } from "@/lib/action-labels";
import type { LifeLabItemType } from "@/lib/life-lab/item-key";

type LifeLabArchivedPageContentProps = {
  items: ArchivedLifeLabListItem[];
  sections: Array<{ id: string; label: string }>;
};

export function LifeLabArchivedPageContent({
  items,
  sections,
}: LifeLabArchivedPageContentProps) {
  const [query, setQuery] = useState("");
  const [section, setSection] = useState<string | "all">("all");
  const [sort, setSort] = useState<"recent" | "title" | "original">("recent");
  const [hiddenKeys, setHiddenKeys] = useState<Set<string>>(() => new Set());

  const visible = useMemo(() => {
    const filtered = filterArchivedListItems(
      items.filter((item) => !hiddenKeys.has(item.itemKey)),
      { section, q: query, sort },
    );
    return filtered;
  }, [items, hiddenKeys, section, query, sort]);

  if (items.length === 0) {
    return (
      <p className="text-sm text-muted">
        No archived Life Lab items yet. Archive something from a More menu to
        see it here.
      </p>
    );
  }

  return (
    <div className="space-y-4" data-life-lab-archived="">
      <label className="block">
        <span className="sr-only">Search archived items</span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search archived…"
          className="w-full rounded-xl border border-border/70 bg-background px-3 py-2 text-sm"
        />
      </label>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={`rounded-full px-3 py-1.5 text-xs font-medium ${
            section === "all"
              ? "bg-accent-cream text-foreground"
              : "border border-border/70 text-muted"
          }`}
          onClick={() => setSection("all")}
        >
          All
        </button>
        {sections.map((entry) => (
          <button
            key={entry.id}
            type="button"
            className={`rounded-full px-3 py-1.5 text-xs font-medium ${
              section === entry.id
                ? "bg-accent-cream text-foreground"
                : "border border-border/70 text-muted"
            }`}
            onClick={() => setSection(entry.id)}
          >
            {entry.label}
          </button>
        ))}
      </div>

      <label className="flex items-center gap-2 text-sm text-muted">
        <span>Sort</span>
        <select
          value={sort}
          onChange={(event) =>
            setSort(event.target.value as "recent" | "title" | "original")
          }
          className="rounded-lg border border-border/70 bg-background px-2 py-1 text-sm text-foreground"
        >
          <option value="recent">Recently archived</option>
          <option value="title">Title</option>
          <option value="original">Original date</option>
        </select>
      </label>

      {visible.length === 0 ? (
        <p className="text-sm text-muted">No archived items match these filters.</p>
      ) : (
        <ul className="grid gap-2">
          {visible.map((item) => (
            <li
              key={item.itemKey}
              className="ui-card-padded relative rounded-xl"
            >
              <div className="flex items-start justify-between gap-3 pr-10">
                <div className="min-w-0 space-y-1">
                  <Link
                    href={item.href}
                    className="block text-base font-semibold text-foreground hover:text-foreground/80"
                    dir="auto"
                  >
                    {item.title}
                  </Link>
                  <p className="text-xs text-muted">
                    {[
                      item.sectionLabel,
                      item.archivedAtLabel,
                      item.meta,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  <span className="inline-flex rounded-full border border-border/70 px-2 py-0.5 text-[0.6875rem] font-medium text-muted">
                    Archived
                  </span>
                </div>
              </div>
              <div className="absolute end-2.5 top-2.5">
                <LifeLabItemMoreMenu>
                  <LifeLabArchiveMenuItem
                    itemKey={item.itemKey}
                    section={item.section}
                    itemType={item.itemType as LifeLabItemType}
                    archived
                    labels={{
                      archive: ACTION_LABELS.archiveLifeLabItem,
                      unarchive: ACTION_LABELS.unarchiveLifeLabItem,
                    }}
                    onArchivedChange={(next) => {
                      if (!next) {
                        setHiddenKeys((current) => {
                          const copy = new Set(current);
                          copy.add(item.itemKey);
                          return copy;
                        });
                      }
                    }}
                  />
                </LifeLabItemMoreMenu>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

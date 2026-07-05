"use client";

import { useMemo, useState } from "react";

import { IdeaCard } from "@/components/ideas/idea-card";
import type { SerializedIdea } from "@/lib/ideas/constants";
import { filterIdeas, IDEA_FILTERS, type IdeaFilter } from "@/lib/ideas/search";
import { passwordManagerSafeControlProps } from "@/lib/password-manager-ignore";

type IdeaListProps = {
  ideas: SerializedIdea[];
  disabled?: boolean;
  onEdit: (idea: SerializedIdea) => void;
  onDelete: (ideaId: string) => void;
};

export function IdeaList({
  ideas,
  disabled = false,
  onEdit,
  onDelete,
}: IdeaListProps) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<IdeaFilter>("all");

  const filteredIdeas = useMemo(
    () => filterIdeas(ideas, { query, filter }),
    [ideas, query, filter],
  );

  const hasActiveFilters = query.trim().length > 0 || filter !== "all";

  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold text-foreground">Recent ideas</h2>
        <p className="text-xs text-muted-light">
          {ideas.length === 0
            ? "Nothing captured yet"
            : hasActiveFilters
              ? `${filteredIdeas.length} of ${ideas.length}`
              : `${ideas.length} idea${ideas.length === 1 ? "" : "s"}`}
        </p>
      </div>

      {ideas.length > 0 ? (
        <div className="space-y-3">
          <label className="block">
            <span className="sr-only">Search ideas</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search ideas..."
              className="ui-input min-h-10 w-full text-sm"
              dir="auto"
              {...passwordManagerSafeControlProps}
            />
          </label>

          <div
            className="flex flex-wrap gap-1.5"
            role="tablist"
            aria-label="Filter ideas"
          >
            {IDEA_FILTERS.map((item) => (
              <button
                key={item.value}
                type="button"
                role="tab"
                aria-selected={filter === item.value}
                onClick={() => setFilter(item.value)}
                className={`min-h-9 rounded-lg px-3 text-sm transition-colors ${
                  filter === item.value ? "ui-segment-active" : "ui-segment"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {ideas.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border-soft px-4 py-8 text-center">
          <p className="text-sm text-muted">Your ideas will appear here.</p>
        </div>
      ) : filteredIdeas.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border-soft px-4 py-8 text-center">
          <p className="text-sm text-muted">No ideas match your search.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {filteredIdeas.map((idea) => (
            <li key={idea.id}>
              <IdeaCard
                idea={idea}
                disabled={disabled}
                onEdit={() => onEdit(idea)}
                onDelete={() => onDelete(idea.id)}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

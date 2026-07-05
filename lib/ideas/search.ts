import {
  IDEA_STATUS_LABELS,
  IDEA_STATUSES,
  type IdeaStatusValue,
  type SerializedIdea,
} from "@/lib/ideas/constants";

export type IdeaFilter = "all" | IdeaStatusValue;

export const IDEA_FILTERS: { value: IdeaFilter; label: string }[] = [
  { value: "all", label: "All" },
  ...IDEA_STATUSES.map((status) => ({
    value: status as IdeaFilter,
    label: IDEA_STATUS_LABELS[status],
  })),
];

function ideaSearchText(idea: SerializedIdea): string {
  return [idea.title, idea.content, ...idea.tags]
    .filter(Boolean)
    .join("\n")
    .toLowerCase();
}

export function matchesIdeaSearch(idea: SerializedIdea, query: string): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return true;
  }

  return ideaSearchText(idea).includes(normalized);
}

export function filterIdeas(
  ideas: SerializedIdea[],
  options: { query?: string; filter?: IdeaFilter },
): SerializedIdea[] {
  const query = options.query ?? "";
  const filter = options.filter ?? "all";

  return ideas.filter((idea) => {
    if (!matchesIdeaSearch(idea, query)) {
      return false;
    }

    return filter === "all" ? true : idea.status === filter;
  });
}

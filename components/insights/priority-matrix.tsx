import type { MonthlyInsights } from "@/lib/insights";

type PriorityMatrixProps = {
  quadrants: MonthlyInsights["priorityQuadrants"];
};

const QUADRANTS = [
  {
    key: "doSoon" as const,
    title: "Do soon",
    description: "High importance and high urgency together.",
    accent: "border-s-accent-red",
  },
  {
    key: "protectTime" as const,
    title: "Protect time",
    description: "Important, but not asking for urgency.",
    accent: "border-s-accent-blue",
  },
  {
    key: "contain" as const,
    title: "Contain",
    description: "Urgent without strong importance signals.",
    accent: "border-s-accent-yellow",
  },
  {
    key: "maybeRelease" as const,
    title: "Maybe release",
    description: "Lower priority signals — worth a gentle look.",
    accent: "border-s-border",
  },
] as const;

export function PriorityMatrix({ quadrants }: PriorityMatrixProps) {
  return (
    <section className="ui-card-padded">
      <h2 className="ui-section-title">Importance and urgency</h2>
      <p className="mt-1.5 text-sm text-muted">
        A quiet map of how items were labeled — not instructions.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {QUADRANTS.map((quadrant) => (
          <article
            key={quadrant.key}
            className={`rounded-xl border-s-[3px] bg-accent-cream/50 p-4 ${quadrant.accent}`}
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-sm font-medium text-foreground">
                {quadrant.title}
              </h3>
              <span className="text-lg font-semibold text-foreground">
                {quadrants[quadrant.key]}
              </span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted">
              {quadrant.description}
            </p>
          </article>
        ))}
      </div>

      {quadrants.unclassified > 0 ? (
        <p className="mt-4 text-sm text-muted">
          Unclassified (no importance/urgency set): {quadrants.unclassified}
        </p>
      ) : null}
    </section>
  );
}

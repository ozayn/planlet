import type { MonthlyInsights } from "@/lib/insights";

type PriorityMatrixProps = {
  quadrants: MonthlyInsights["priorityQuadrants"];
};

const QUADRANTS = [
  {
    key: "doSoon" as const,
    title: "Do soon",
    description: "High importance and high urgency together.",
  },
  {
    key: "protectTime" as const,
    title: "Protect time",
    description: "Important, but not asking for urgency.",
  },
  {
    key: "contain" as const,
    title: "Contain",
    description: "Urgent without strong importance signals.",
  },
  {
    key: "maybeRelease" as const,
    title: "Maybe release",
    description: "Lower priority signals — worth a gentle look.",
  },
] as const;

export function PriorityMatrix({ quadrants }: PriorityMatrixProps) {
  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-medium text-stone-800">Priority matrix</h2>
      <p className="mt-1 text-sm text-stone-500">
        A simple map of importance and urgency — observations, not instructions.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {QUADRANTS.map((quadrant) => (
          <article
            key={quadrant.key}
            className="rounded-xl border border-stone-100 bg-stone-50/60 p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-sm font-medium text-stone-800">
                {quadrant.title}
              </h3>
              <span className="text-lg font-medium text-stone-900">
                {quadrants[quadrant.key]}
              </span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-stone-500">
              {quadrant.description}
            </p>
          </article>
        ))}
      </div>

      {quadrants.unclassified > 0 ? (
        <p className="mt-4 text-sm text-stone-500">
          Unclassified (no importance/urgency set): {quadrants.unclassified}
        </p>
      ) : null}
    </section>
  );
}

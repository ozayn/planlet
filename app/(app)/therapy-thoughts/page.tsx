import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { PageHeader } from "@/components/page-header";
import { TherapyThoughtsFilters } from "@/components/therapy-thoughts/therapy-thoughts-filters";
import {
  getTherapyThoughtCollection,
  type TherapyThoughtCollectionFilter,
} from "@/lib/therapy-thoughts";
import { canUseTherapyThoughts } from "@/lib/roles";

type TherapyThoughtsPageProps = {
  searchParams: Promise<{ filter?: string }>;
};

function parseFilter(value: string | undefined): TherapyThoughtCollectionFilter {
  if (value === "30d" || value === "all") {
    return value;
  }

  return "7d";
}

export default async function TherapyThoughtsPage({
  searchParams,
}: TherapyThoughtsPageProps) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    redirect("/");
  }

  if (!canUseTherapyThoughts(session.user)) {
    redirect("/today");
  }

  const { filter: filterParam } = await searchParams;
  const filter = parseFilter(filterParam);
  const groups = await getTherapyThoughtCollection(userId, filter);

  return (
    <section className="space-y-6">
      <PageHeader
        title="Therapy thoughts"
        subtitle="Thoughts to review before sessions."
      />

      <TherapyThoughtsFilters activeFilter={filter} />

      {groups.length === 0 ? (
        <div className="ui-empty-state">
          <p className="text-sm text-muted">No therapy thoughts in this range.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <section key={group.dateString} className="space-y-2">
              <h2 className="text-sm font-medium text-foreground">
                {group.dateLabel}
              </h2>
              <ul className="divide-y divide-border-soft/70 rounded-xl border border-border-soft">
                {group.thoughts.map((thought) => (
                  <li key={thought.id} className="px-3 py-3">
                    <p
                      className="whitespace-pre-wrap text-sm text-foreground"
                      dir="auto"
                    >
                      {thought.body}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </section>
  );
}

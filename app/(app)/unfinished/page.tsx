import { auth } from "@/auth";
import { PageHeader } from "@/components/page-header";
import { UnfinishedTasksPage } from "@/components/unfinished/unfinished-tasks-page";
import {
  getUnfinishedTasksPageData,
  normalizeUnfinishedTaskRange,
} from "@/lib/unfinished-tasks";
import { getPlanningPreferencesForUser } from "@/lib/user-preferences";

type UnfinishedPageProps = {
  searchParams: Promise<{ range?: string }>;
};

export default async function UnfinishedPage({
  searchParams,
}: UnfinishedPageProps) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return null;
  }

  const params = await searchParams;
  const range = normalizeUnfinishedTaskRange(params.range);
  const [data, planningPreferences] = await Promise.all([
    getUnfinishedTasksPageData(userId, range),
    getPlanningPreferencesForUser(userId),
  ]);

  return (
    <section className="ui-page-stack space-y-6">
      <PageHeader
        title="Unfinished tasks"
        subtitle="Review what is still open, move it forward, or learn from it."
      />
      <UnfinishedTasksPage
        data={data}
        itemView={planningPreferences.planItemView}
      />
    </section>
  );
}

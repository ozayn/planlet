import { notFound } from "next/navigation";

import { auth } from "@/auth";
import { ActivityTimerPage } from "@/components/activity-timer/activity-timer-page";
import { PageHeader } from "@/components/page-header";
import { getActivityTimerPageData } from "@/lib/activity-timer";
import { canUseActivityTimerFeatures } from "@/lib/roles";

type TimerRoutePageProps = {
  searchParams: Promise<{
    active?: string | string[];
  }>;
};

export default async function TimerRoutePage({
  searchParams,
}: TimerRoutePageProps) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId || !session?.user || !canUseActivityTimerFeatures(session.user)) {
    notFound();
  }

  const params = await searchParams;
  const activeParam = Array.isArray(params.active)
    ? params.active[0]
    : params.active;
  const focusActive = activeParam === "1" || activeParam === "true";
  const data = await getActivityTimerPageData(userId);

  return (
    <section className="ui-page-stack space-y-3 sm:space-y-5 [&_.ui-page-header]:mb-2 sm:[&_.ui-page-header]:mb-5">
      <PageHeader title="Timer" />
      <ActivityTimerPage data={data} focusActive={focusActive} />
    </section>
  );
}

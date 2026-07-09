import { notFound } from "next/navigation";

import { auth } from "@/auth";
import { ActivityTimerPage } from "@/components/activity-timer/activity-timer-page";
import { PageHeader } from "@/components/page-header";
import { getActivityTimerPageData } from "@/lib/activity-timer";
import { canUseActivityTimerFeatures } from "@/lib/roles";

export default async function TimerRoutePage() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId || !session?.user || !canUseActivityTimerFeatures(session.user)) {
    notFound();
  }

  const data = await getActivityTimerPageData(userId);

  return (
    <section className="ui-page-stack space-y-3 sm:space-y-5 [&_.ui-page-header]:mb-2 sm:[&_.ui-page-header]:mb-5">
      <PageHeader title="Timer" />
      <ActivityTimerPage data={data} />
    </section>
  );
}

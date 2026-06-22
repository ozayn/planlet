import { notFound } from "next/navigation";

import { auth } from "@/auth";
import { JobTracker } from "@/components/jobs/job-tracker";
import { PageHeader } from "@/components/page-header";
import { listJobApplications } from "@/lib/job-applications";
import { canUseJobTrackerFeatures } from "@/lib/roles";

export default async function JobsPage() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId || !session?.user || !canUseJobTrackerFeatures(session.user)) {
    notFound();
  }

  const jobs = await listJobApplications(userId, "ALL");

  return (
    <section className="ui-page-stack space-y-6">
      <PageHeader
        title="Job tracker"
        subtitle="A private record of your applications."
      />
      <JobTracker initialJobs={jobs} />
    </section>
  );
}

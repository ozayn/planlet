import { notFound } from "next/navigation";
import { Suspense } from "react";

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
      <Suspense
        fallback={
          <div className="space-y-6">
            <div className="ui-card-padded border border-border-soft">
              <p className="text-sm text-muted">Loading job tracker…</p>
            </div>
          </div>
        }
      >
        <JobTracker initialJobs={jobs} />
      </Suspense>
    </section>
  );
}

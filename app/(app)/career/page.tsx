import { notFound } from "next/navigation";

import { auth } from "@/auth";
import { CareerJourneyPage } from "@/components/career/career-journey-page";
import { PageHeader } from "@/components/page-header";
import { getCareerJourneyPageData } from "@/lib/career-journey/career-journey";
import { getCareerJobSummary } from "@/lib/career-journey/job-summary";
import {
  canUseCareerJourneyFeatures,
  canUseCoachingFeatures,
  canUseJobTrackerFeatures,
} from "@/lib/roles";

export default async function CareerPage() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId || !session?.user || !canUseCareerJourneyFeatures(session.user)) {
    notFound();
  }

  const [data, jobSummary] = await Promise.all([
    getCareerJourneyPageData(userId),
    getCareerJobSummary(userId, session.user),
  ]);

  return (
    <section className="ui-page-stack space-y-6">
      <PageHeader
        title="Career journey"
        subtitle="Gentle structure for keeping momentum without overwhelm."
      />
      <CareerJourneyPage
        initialData={data}
        jobSummary={jobSummary}
        canUseCoaching={canUseCoachingFeatures(session.user)}
        canUseJobTracker={canUseJobTrackerFeatures(session.user)}
      />
    </section>
  );
}

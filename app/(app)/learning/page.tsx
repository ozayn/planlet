import { notFound } from "next/navigation";

import { auth } from "@/auth";
import { LearningJourneyPage } from "@/components/learning/learning-journey-page";
import { PageHeader } from "@/components/page-header";
import { getLearningJourneyPageData } from "@/lib/learning-journey";
import { canUseLearningJourneyFeatures } from "@/lib/roles";

export default async function LearningPage() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId || !session?.user || !canUseLearningJourneyFeatures(session.user)) {
    notFound();
  }

  const data = await getLearningJourneyPageData(userId);

  return (
    <section className="ui-page-stack space-y-6">
      <PageHeader
        title="Learning Journey"
        subtitle="Capture what you learn in daily life — books, conversations, travel, and more."
      />
      <LearningJourneyPage data={data} />
    </section>
  );
}

import { notFound } from "next/navigation";

import { auth } from "@/auth";
import { BodyJourneyPage } from "@/components/body/body-journey-page";
import { PageHeader } from "@/components/page-header";
import { getBodyJourneyPageData } from "@/lib/body-journey";
import { parseBodyJourneyPeriod } from "@/lib/body-journey-period";
import { parseBodySide } from "@/lib/body-journey-types";
import { canUseBodyJourneyFeatures } from "@/lib/roles";

type BodyPageProps = {
  searchParams: Promise<{
    period?: string;
    side?: string;
  }>;
};

export default async function BodyPage({ searchParams }: BodyPageProps) {
  const session = await auth();
  const userId = session?.user?.id;
  const params = await searchParams;

  if (!userId || !session?.user || !canUseBodyJourneyFeatures(session.user)) {
    notFound();
  }

  const period = parseBodyJourneyPeriod(params.period);
  const side = parseBodySide(params.side);
  const data = await getBodyJourneyPageData(userId, period, side);

  return (
    <section className="ui-page-stack space-y-6">
      <PageHeader
        title="Body Journey"
        subtitle="Track sensations, symptoms, and patterns over time."
      />
      <BodyJourneyPage data={data} />
    </section>
  );
}

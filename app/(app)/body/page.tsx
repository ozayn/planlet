import type { BodySide } from "@/app/generated/prisma/client";
import { notFound } from "next/navigation";

import { auth } from "@/auth";
import { BodyJourneyPage } from "@/components/body/body-journey-page";
import { PageHeader } from "@/components/page-header";
import {
  getBodyJourneyPageData,
  type BodyJourneyPeriod,
} from "@/lib/body-journey";
import { canUseBodyJourneyFeatures } from "@/lib/roles";

type BodyPageProps = {
  searchParams: Promise<{
    period?: string;
    side?: string;
  }>;
};

function parsePeriod(value: string | undefined): BodyJourneyPeriod {
  if (value === "week" || value === "month") {
    return value;
  }

  return "today";
}

function parseSide(value: string | undefined): BodySide {
  if (value === "BACK") {
    return "BACK";
  }

  return "FRONT";
}

export default async function BodyPage({ searchParams }: BodyPageProps) {
  const session = await auth();
  const userId = session?.user?.id;
  const params = await searchParams;

  if (!userId || !session?.user || !canUseBodyJourneyFeatures(session.user)) {
    notFound();
  }

  const period = parsePeriod(params.period);
  const side = parseSide(params.side);
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

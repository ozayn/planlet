import { auth } from "@/auth";
import { PeriodSummaryPage } from "@/components/summaries/period-summary-page";

type YearSummaryPageProps = {
  params: Promise<{ date: string }>;
};

export default async function YearSummaryRoute({
  params,
}: YearSummaryPageProps) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return null;
  }

  const { date } = await params;

  return (
    <PeriodSummaryPage type="YEAR" dateString={date} userId={userId} />
  );
}

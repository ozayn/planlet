import { auth } from "@/auth";
import { PeriodSummaryPage } from "@/components/summaries/period-summary-page";

type MonthSummaryPageProps = {
  params: Promise<{ date: string }>;
};

export default async function MonthSummaryRoute({
  params,
}: MonthSummaryPageProps) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return null;
  }

  const { date } = await params;

  return (
    <PeriodSummaryPage type="MONTH" dateString={date} userId={userId} />
  );
}

import { auth } from "@/auth";
import { PeriodSummaryPage } from "@/components/summaries/period-summary-page";

type WeekSummaryPageProps = {
  params: Promise<{ date: string }>;
};

export default async function WeekSummaryRoute({ params }: WeekSummaryPageProps) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return null;
  }

  const { date } = await params;

  return (
    <PeriodSummaryPage type="WEEK" dateString={date} userId={userId} />
  );
}

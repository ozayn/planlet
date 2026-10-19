import { notFound } from "next/navigation";

import { auth } from "@/auth";
import { PomodoroPage } from "@/components/pomodoro/pomodoro-page";
import { getPomodoroPageData } from "@/lib/pomodoro";
import { canUsePomodoroFeatures } from "@/lib/roles";

export default async function PomodoroRoutePage() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId || !session?.user || !canUsePomodoroFeatures(session.user)) {
    notFound();
  }

  const data = await getPomodoroPageData(userId);

  return <PomodoroPage data={data} />;
}

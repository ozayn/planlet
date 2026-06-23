import { notFound } from "next/navigation";

import { auth } from "@/auth";
import { CoachingPageContent } from "@/components/coaching/coaching-page-content";
import { PageHeader } from "@/components/page-header";
import { getReflectionInfluencePreferencesForUser } from "@/lib/reflection-influence-preferences";
import { canUseCoachingFeatures } from "@/lib/roles";

export default async function CoachingPage() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId || !session?.user || !canUseCoachingFeatures(session.user)) {
    notFound();
  }

  const preferences = await getReflectionInfluencePreferencesForUser(
    userId,
    session.user,
  );

  return (
    <section className="ui-page-stack mx-auto max-w-xl space-y-8">
      <PageHeader
        title="Coaching"
        subtitle="Thoughtful feedback on your recent plans and reflections."
      />
      <CoachingPageContent initialPreferences={preferences} />
    </section>
  );
}

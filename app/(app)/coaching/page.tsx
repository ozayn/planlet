import { notFound } from "next/navigation";

import { auth } from "@/auth";
import { CoachingPageContent } from "@/components/coaching/coaching-page-content";
import { PageHeader } from "@/components/page-header";
import { getCoachingReflectionLimitStatus } from "@/lib/ai/reflection-limits";
import { isAdminRole } from "@/lib/auth-roles";
import { getReflectionInfluencePreferencesForUser } from "@/lib/reflection-influence-preferences";
import { canUseCoachingFeatures } from "@/lib/roles";

export default async function CoachingPage() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId || !session?.user || !canUseCoachingFeatures(session.user)) {
    notFound();
  }

  const [preferences, limitStatus] = await Promise.all([
    getReflectionInfluencePreferencesForUser(userId, session.user),
    getCoachingReflectionLimitStatus(userId, {
      isAdmin: isAdminRole(session.user.role),
      timezone: session.user.timezone,
    }),
  ]);

  return (
    <section className="ui-page-stack space-y-6">
      <PageHeader
        title="Coaching"
        subtitle="Thoughtful feedback on your recent plans and reflections."
      />
      <div className="mx-auto w-full max-w-xl">
        <CoachingPageContent
          initialPreferences={preferences}
          initialLimitStatus={{
            limit: limitStatus.limit,
            used: limitStatus.used,
            remaining: limitStatus.remaining,
            resetsAt: limitStatus.resetsAt.toISOString(),
            isUnlimited: limitStatus.isUnlimited,
            isAdminUser: limitStatus.isAdminUser,
          }}
        />
      </div>
    </section>
  );
}

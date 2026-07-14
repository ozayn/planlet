import Link from "next/link";
import { notFound } from "next/navigation";

import { auth } from "@/auth";
import { LearningDictionaryEntryView } from "@/components/learning-dictionary/learning-dictionary-entry";
import { LifeLabRefreshButton } from "@/components/life-lab/life-lab-refresh-button";
import { LifeLabStatusPanel } from "@/components/life-lab/life-lab-status-panel";
import { PageHeader } from "@/components/page-header";
import { isAdminRole } from "@/lib/auth-roles";
import { canUseLifeLabRefreshBypass } from "@/lib/life-lab/cache";
import { getLearningDictionaryEntryData } from "@/lib/learning-dictionary/data";
import { LEARNING_DICTIONARY_SECTION_ID } from "@/lib/learning-dictionary/model";
import { canAccessLifeLabPage } from "@/lib/roles";

type LearningDictionaryEntryPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ refresh?: string }>;
};

export default async function LearningDictionaryEntryPage({
  params,
  searchParams,
}: LearningDictionaryEntryPageProps) {
  const session = await auth();

  if (!session?.user?.id || !canAccessLifeLabPage(session.user)) {
    notFound();
  }

  const { slug } = await params;
  const { refresh } = await searchParams;
  const isAdmin = isAdminRole(session.user.role);
  const shouldRefresh = canUseLifeLabRefreshBypass(
    refresh,
    canAccessLifeLabPage(session.user),
  );

  if (shouldRefresh) {
    const { getLifeLabNoteData } = await import("@/lib/life-lab");
    await getLifeLabNoteData(LEARNING_DICTIONARY_SECTION_ID, slug, {
      refresh: true,
    });
  }

  const { availability, entry } = await getLearningDictionaryEntryData(slug);

  if (!entry) {
    notFound();
  }

  return (
    <section className="ui-life-lab-surface ui-page-stack space-y-5">
      <PageHeader
        title={entry.title}
        action={
          <div className="flex items-center gap-3">
            <Link
              href="/learning-dictionary"
              className="text-sm font-medium text-muted transition-colors hover:text-foreground"
            >
              Back to dictionary
            </Link>
            <LifeLabRefreshButton
              scope="note"
              sectionId={LEARNING_DICTIONARY_SECTION_ID}
              slug={slug}
              compact
            />
          </div>
        }
      />

      {availability.status !== "ready" ? (
        <LifeLabStatusPanel availability={availability} isAdmin={isAdmin} />
      ) : (
        <LearningDictionaryEntryView entry={entry} />
      )}
    </section>
  );
}

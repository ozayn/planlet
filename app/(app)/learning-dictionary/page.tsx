import Link from "next/link";
import { notFound } from "next/navigation";

import { auth } from "@/auth";
import { LearningDictionaryBrowser } from "@/components/learning-dictionary/learning-dictionary-browser";
import { LifeLabRefreshButton } from "@/components/life-lab/life-lab-refresh-button";
import { LifeLabStatusPanel } from "@/components/life-lab/life-lab-status-panel";
import { PageHeader } from "@/components/page-header";
import { isAdminRole } from "@/lib/auth-roles";
import { canUseLifeLabRefreshBypass } from "@/lib/life-lab/cache";
import { getLifeLabSectionData } from "@/lib/life-lab";
import { getLearningDictionaryBrowseData } from "@/lib/learning-dictionary/data";
import { LEARNING_DICTIONARY_SECTION_ID } from "@/lib/learning-dictionary/model";
import { canAccessLifeLabPage } from "@/lib/roles";

type LearningDictionaryPageProps = {
  searchParams: Promise<{ refresh?: string }>;
};

export default async function LearningDictionaryPage({
  searchParams,
}: LearningDictionaryPageProps) {
  const session = await auth();

  if (!session?.user?.id || !canAccessLifeLabPage(session.user)) {
    notFound();
  }

  const { refresh } = await searchParams;
  const isAdmin = isAdminRole(session.user.role);
  const shouldRefresh = canUseLifeLabRefreshBypass(
    refresh,
    canAccessLifeLabPage(session.user),
  );

  if (shouldRefresh) {
    await getLifeLabSectionData(LEARNING_DICTIONARY_SECTION_ID, {
      refresh: true,
    });
  }

  const browseData = await getLearningDictionaryBrowseData();

  return (
    <section className="ui-life-lab-surface ui-page-stack space-y-5">
      <PageHeader
        title="Learning Dictionary"
        subtitle="Reusable phrases, concepts, and names from Life Lab."
        action={
          <div className="flex items-center gap-3">
            <Link
              href="/life-lab/learning-dictionary"
              className="text-sm font-medium text-muted transition-colors hover:text-foreground"
            >
              Life Lab folder
            </Link>
            <LifeLabRefreshButton
              scope="section"
              sectionId={LEARNING_DICTIONARY_SECTION_ID}
              compact
            />
          </div>
        }
      />

      {browseData.availability.status !== "ready" ? (
        <LifeLabStatusPanel
          availability={browseData.availability}
          isAdmin={isAdmin}
        />
      ) : (
        <LearningDictionaryBrowser notes={browseData.notes} />
      )}
    </section>
  );
}

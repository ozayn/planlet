import Link from "next/link";
import { notFound } from "next/navigation";

import { auth } from "@/auth";
import { LifeLabRefreshButton } from "@/components/life-lab/life-lab-refresh-button";
import { LifeLabSectionBrowser } from "@/components/life-lab/life-lab-section-browser";
import { LifeLabStatusPanel } from "@/components/life-lab/life-lab-status-panel";
import { PageHeader } from "@/components/page-header";
import { getLifeLabSectionData } from "@/lib/life-lab";
import { canUseLifeLabRefreshBypass } from "@/lib/life-lab/cache";
import { canViewLifeLabCacheDiagnostics } from "@/lib/life-lab/cache-telemetry";
import { isAdminRole } from "@/lib/auth-roles";
import { canAccessLifeLabPage } from "@/lib/roles";

type LifeLabSectionPageProps = {
  params: Promise<{ section: string }>;
  searchParams: Promise<{ refresh?: string }>;
};

export default async function LifeLabSectionPage({
  params,
  searchParams,
}: LifeLabSectionPageProps) {
  const session = await auth();

  if (!session?.user?.id || !canAccessLifeLabPage(session.user)) {
    notFound();
  }

  const { section } = await params;
  const { refresh } = await searchParams;
  const isAdmin = isAdminRole(session.user.role);
  const isAuthorized = canAccessLifeLabPage(session.user);
  const shouldRefresh = canUseLifeLabRefreshBypass(refresh, isAuthorized);
  const showDiagnostics = canViewLifeLabCacheDiagnostics(isAdmin);

  const { availability, sectionId, sectionLabel, notes, filterOptions, listingDiagnostic } =
    await getLifeLabSectionData(section, {
      refresh: shouldRefresh,
      includeListingDiagnostic: showDiagnostics,
    });

  if (!sectionId || !sectionLabel) {
    notFound();
  }

  const noteCount = notes.length;

  return (
    <section className="ui-page-stack space-y-6">
      <PageHeader
        title={sectionLabel}
        subtitle="Notes from this Life Lab folder."
        action={
          <div className="flex items-center gap-3">
            <Link
              href="/life-lab"
              className="text-sm font-medium text-muted transition-colors hover:text-foreground"
            >
              Back to Life Lab
            </Link>
            <LifeLabRefreshButton
              scope="section"
              sectionId={sectionId}
              compact
            />
          </div>
        }
      />

      {availability.status !== "ready" ? (
        <LifeLabStatusPanel availability={availability} isAdmin={isAdmin} />
      ) : noteCount === 0 ? (
        <LifeLabStatusPanel
          availability={availability}
          isAdmin={isAdmin}
          emptyMessage="No notes in this section yet."
        />
      ) : (
        <LifeLabSectionBrowser
          sectionId={sectionId}
          notes={notes}
          filterOptions={filterOptions}
          listingDiagnostic={listingDiagnostic}
          showDiagnostics={showDiagnostics}
        />
      )}
    </section>
  );
}

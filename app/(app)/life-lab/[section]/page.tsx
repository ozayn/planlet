import Link from "next/link";
import { notFound } from "next/navigation";

import { auth } from "@/auth";
import { LifeLabSectionNotes } from "@/components/life-lab/life-lab-section-notes";
import { LifeLabStatusPanel } from "@/components/life-lab/life-lab-status-panel";
import { PageHeader } from "@/components/page-header";
import { getLifeLabSectionData } from "@/lib/life-lab";
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
  const shouldRefresh = refresh === "1" && isAdmin;
  const showDiagnostics =
    isAdmin && process.env.NODE_ENV === "development";

  const { availability, sectionId, sectionLabel, groups, listingDiagnostic } =
    await getLifeLabSectionData(section, {
      refresh: shouldRefresh,
      includeListingDiagnostic: showDiagnostics,
    });

  if (!sectionId || !sectionLabel) {
    notFound();
  }

  const noteCount = groups.reduce(
    (total, group) => total + group.notes.length,
    0,
  );

  return (
    <section className="ui-page-stack space-y-6">
      <PageHeader
        title={sectionLabel}
        subtitle="Notes from this Life Lab folder."
        action={
          <Link
            href="/life-lab"
            className="text-sm font-medium text-muted transition-colors hover:text-foreground"
          >
            All sections
          </Link>
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
        <LifeLabSectionNotes
          sectionId={sectionId}
          groups={groups}
          listingDiagnostic={listingDiagnostic}
          showDiagnostics={showDiagnostics}
          refreshHref={
            shouldRefresh
              ? `/life-lab/${sectionId}`
              : `/life-lab/${sectionId}?refresh=1`
          }
        />
      )}
    </section>
  );
}

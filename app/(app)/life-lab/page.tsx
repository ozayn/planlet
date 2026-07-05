import Link from "next/link";
import { notFound } from "next/navigation";

import { auth } from "@/auth";
import { LifeLabHomeBrowser } from "@/components/life-lab/life-lab-home-browser";
import { LifeLabStatusPanel } from "@/components/life-lab/life-lab-status-panel";
import { PageHeader } from "@/components/page-header";
import { getLifeLabBrowseData, getLifeLabHomeData } from "@/lib/life-lab";
import { isAdminRole } from "@/lib/auth-roles";
import { canAccessLifeLabPage } from "@/lib/roles";

export default async function LifeLabPage() {
  const session = await auth();

  if (!session?.user?.id || !canAccessLifeLabPage(session.user)) {
    notFound();
  }

  const [{ availability, sections }, browseData] = await Promise.all([
    getLifeLabHomeData(),
    getLifeLabBrowseData(),
  ]);
  const isAdmin = isAdminRole(session.user.role);

  return (
    <section className="ui-page-stack space-y-6">
      <PageHeader
        title="Life Lab"
        subtitle="Learning notes from selected Life Lab folders."
      />

      {availability.status !== "ready" ? (
        <LifeLabStatusPanel availability={availability} isAdmin={isAdmin} />
      ) : (
        <>
          <LifeLabHomeBrowser
            notes={browseData.notes}
            flashcardNoteCount={browseData.flashcardNoteCount}
          />

          <div className="grid gap-3 sm:grid-cols-2">
            {sections.map((section) => (
              <Link
                key={section.id}
                href={`/life-lab/${section.id}`}
                className="ui-card-padded block transition-colors hover:bg-accent-cream/25"
              >
                <h2 className="text-base font-semibold text-foreground">
                  {section.label}
                </h2>
                <p className="mt-1 text-sm text-muted">
                  {section.noteCount === 1
                    ? "1 note"
                    : `${section.noteCount} notes`}
                </p>
              </Link>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";

import { auth } from "@/auth";
import { LifeLabStatusPanel } from "@/components/life-lab/life-lab-status-panel";
import { PageHeader } from "@/components/page-header";
import { getLifeLabSectionData } from "@/lib/life-lab";
import { isAdminRole } from "@/lib/auth-roles";
import { canAccessLifeLabPage } from "@/lib/roles";

type LifeLabSectionPageProps = {
  params: Promise<{ section: string }>;
};

export default async function LifeLabSectionPage({
  params,
}: LifeLabSectionPageProps) {
  const session = await auth();

  if (!session?.user?.id || !canAccessLifeLabPage(session.user)) {
    notFound();
  }

  const { section } = await params;
  const { availability, sectionId, sectionLabel, notes } =
    await getLifeLabSectionData(section);

  if (!sectionId || !sectionLabel) {
    notFound();
  }

  const isAdmin = isAdminRole(session.user.role);

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
      ) : notes.length === 0 ? (
        <LifeLabStatusPanel
          availability={availability}
          isAdmin={isAdmin}
          emptyMessage="No notes in this section yet."
        />
      ) : (
        <ul className="space-y-2">
          {notes.map((note) => (
            <li key={note.slug}>
              <Link
                href={`/life-lab/${sectionId}/${note.slug}`}
                className="ui-card-padded block transition-colors hover:bg-accent-cream/25"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-base font-semibold text-foreground">
                      {note.title}
                    </h2>
                    {note.excerpt ? (
                      <p className="mt-1 text-sm leading-relaxed text-muted">
                        {note.excerpt}
                      </p>
                    ) : null}
                  </div>
                  {note.modifiedAtLabel ? (
                    <span className="shrink-0 text-xs text-muted-light">
                      {note.modifiedAtLabel}
                    </span>
                  ) : null}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";

import { auth } from "@/auth";
import { MarkdownContent } from "@/components/life-lab/markdown-content";
import { LifeLabStatusPanel } from "@/components/life-lab/life-lab-status-panel";
import { PageHeader } from "@/components/page-header";
import { getLifeLabNoteData } from "@/lib/life-lab";
import { isAdminRole } from "@/lib/auth-roles";
import { canAccessLifeLabPage } from "@/lib/roles";

type LifeLabNotePageProps = {
  params: Promise<{ section: string; slug: string }>;
};

export default async function LifeLabNotePage({ params }: LifeLabNotePageProps) {
  const session = await auth();

  if (!session?.user?.id || !canAccessLifeLabPage(session.user)) {
    notFound();
  }

  const { section, slug } = await params;
  const { availability, note } = await getLifeLabNoteData(section, slug);

  if (!note) {
    notFound();
  }

  const isAdmin = isAdminRole(session.user.role);

  return (
    <section className="ui-page-stack space-y-6">
      <PageHeader
        title={note.title}
        subtitle={note.sectionLabel}
        action={
          <Link
            href={`/life-lab/${note.sectionId}`}
            className="text-sm font-medium text-muted transition-colors hover:text-foreground"
          >
            Back to section
          </Link>
        }
      />

      {availability.status !== "ready" ? (
        <LifeLabStatusPanel availability={availability} isAdmin={isAdmin} />
      ) : (
        <article className="ui-card-padded">
          {note.modifiedAtLabel ? (
            <p className="mb-4 text-xs text-muted-light">{note.modifiedAtLabel}</p>
          ) : null}
          <MarkdownContent content={note.content} />
        </article>
      )}
    </section>
  );
}

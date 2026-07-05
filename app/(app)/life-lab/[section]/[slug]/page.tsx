import Link from "next/link";
import { notFound } from "next/navigation";

import { auth } from "@/auth";
import { LifeLabNoteDevInfoPanel } from "@/components/life-lab/life-lab-note-dev-info-panel";
import { LifeLabNoteDevToolbar } from "@/components/life-lab/life-lab-note-dev-toolbar";
import { MarkdownContent } from "@/components/life-lab/markdown-content";
import { LifeLabStatusPanel } from "@/components/life-lab/life-lab-status-panel";
import { PageHeader } from "@/components/page-header";
import { getLifeLabNoteData } from "@/lib/life-lab";
import { isLifeLabDevToolsEnabled } from "@/lib/life-lab/dev";
import { isAdminRole } from "@/lib/auth-roles";
import { canAccessLifeLabPage } from "@/lib/roles";

type LifeLabNotePageProps = {
  params: Promise<{ section: string; slug: string }>;
  searchParams: Promise<{ refresh?: string }>;
};

export default async function LifeLabNotePage({
  params,
  searchParams,
}: LifeLabNotePageProps) {
  const session = await auth();

  if (!session?.user?.id || !canAccessLifeLabPage(session.user)) {
    notFound();
  }

  const { section, slug } = await params;
  const { refresh } = await searchParams;
  const shouldRefresh =
    refresh === "1" && isLifeLabDevToolsEnabled();
  const { availability, note } = await getLifeLabNoteData(section, slug, {
    refresh: shouldRefresh,
  });

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
          <div className="flex items-center gap-3">
            <LifeLabNoteDevToolbar note={note} />
            <Link
              href={`/life-lab/${note.sectionId}`}
              className="text-sm font-medium text-muted transition-colors hover:text-foreground"
            >
              Back to section
            </Link>
          </div>
        }
      />

      {availability.status !== "ready" ? (
        <LifeLabStatusPanel availability={availability} isAdmin={isAdmin} />
      ) : (
        <>
          <article className="ui-card-padded">
            {note.dateLabel ?? note.modifiedAtLabel ? (
              <p className="mb-4 text-xs text-muted-light">
                {note.dateLabel ?? note.modifiedAtLabel}
              </p>
            ) : null}
            <MarkdownContent content={note.content} />
          </article>
          {note.dev ? (
            <LifeLabNoteDevInfoPanel
              dev={note.dev}
              loadMeta={{
                fromCache: note.dev.fromCache,
                loadedAt: note.dev.loadedAt,
              }}
            />
          ) : null}
        </>
      )}
    </section>
  );
}

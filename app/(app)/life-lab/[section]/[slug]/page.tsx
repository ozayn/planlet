import Link from "next/link";
import { notFound } from "next/navigation";

import { auth } from "@/auth";
import { LifeLabMetadataChips } from "@/components/life-lab/life-lab-metadata-chips";
import { LifeLabNoteCardMeta } from "@/components/life-lab/life-lab-note-card-meta";
import { LifeLabNoteReadAloud } from "@/components/life-lab/life-lab-note-read-aloud";
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
          <div className="flex flex-wrap items-center gap-3">
            {note.flashcards && note.flashcards.length > 0 ? (
              <Link
                href={`/life-lab/${note.sectionId}/${note.slug}/study`}
                className="rounded-full bg-accent-cream px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent-cream/80"
              >
                Study ({note.flashcards.length})
              </Link>
            ) : null}
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
              <p className="mb-2 text-xs text-muted-light">
                {note.dateLabel ?? note.modifiedAtLabel}
              </p>
            ) : null}
            <LifeLabMetadataChips
              metadata={note.metadata}
              sectionId={note.sectionId}
              sectionLabel={note.sectionLabel}
              subfolderLabel={note.subfolderLabel}
              variant="detail"
              className="mb-2"
            />
            <LifeLabNoteCardMeta
              sectionId={note.sectionId}
              note={note}
              className="mb-3"
            />
            <LifeLabNoteReadAloud
              title={note.title}
              content={note.content}
              className="mb-4"
            />
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

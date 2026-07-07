import Link from "next/link";
import { notFound } from "next/navigation";

import { auth } from "@/auth";
import { LifeLabNoteDictionarySections } from "@/components/life-lab/life-lab-note-dictionary-sections";
import { LifeLabReadingBriefHeader } from "@/components/life-lab/life-lab-reading-brief-header";
import { LifeLabReadingBriefNote } from "@/components/life-lab/life-lab-reading-brief-note";
import { LifeLabPlaylistIndexNote } from "@/components/life-lab/life-lab-playlist-index-note";
import { LifeLabPlaylistVideoNav } from "@/components/life-lab/life-lab-playlist-video-nav";
import { LifeLabNoteDetailHeader } from "@/components/life-lab/life-lab-note-detail-header";
import { LifeLabNoteDevInfoPanel } from "@/components/life-lab/life-lab-note-dev-info-panel";
import { MarkdownContent } from "@/components/life-lab/markdown-content";
import { LifeLabStatusPanel } from "@/components/life-lab/life-lab-status-panel";
import { getLifeLabNoteData, getYoutubeVideoPlaylistNavigation } from "@/lib/life-lab";
import { isLifeLabDevToolsEnabled } from "@/lib/life-lab/dev";
import { hasDictionaryStudySections } from "@/lib/life-lab/dictionary-candidates";
import { stripLeadingMarkdownH1 } from "@/lib/life-lab/note-content";
import { isReadingBriefNote } from "@/lib/life-lab/reading-briefs";
import { shouldRenderPlaylistIndexUi } from "@/lib/life-lab/playlist-index";
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
  const isReadingBrief = isReadingBriefNote({
    relativePath: note.relativePath,
    subfolderLabel: note.subfolderLabel,
    metadata: note.metadata,
  });
  const isPlaylistIndex = shouldRenderPlaylistIndexUi(note);
  const hasDictionarySections = hasDictionaryStudySections(note.content);
  const playlistNav =
    note.sectionId === "youtube-learning" && !isPlaylistIndex
      ? await getYoutubeVideoPlaylistNavigation(note.sectionId, note.slug)
      : null;
  const noteBodyContent = stripLeadingMarkdownH1(note.content);

  return (
    <section
      className={`ui-page-stack ${
        isReadingBrief || isPlaylistIndex
          ? "space-y-3 md:space-y-4"
          : "space-y-4 md:space-y-6"
      }`}
    >
      {isReadingBrief ? (
        <LifeLabReadingBriefHeader
          sectionId={note.sectionId}
          sectionLabel={note.sectionLabel}
          note={note}
        />
      ) : isPlaylistIndex ? null : (
        <LifeLabNoteDetailHeader
          note={note}
          sectionId={note.sectionId}
          sectionLabel={note.sectionLabel}
        />
      )}

      {playlistNav ? (
        <LifeLabPlaylistVideoNav navigation={playlistNav} variant="compact" />
      ) : null}

      {availability.status !== "ready" ? (
        <LifeLabStatusPanel availability={availability} isAdmin={isAdmin} />
      ) : (
        <>
          <article
            className={
              isReadingBrief || isPlaylistIndex
                ? "md:ui-card-padded rounded-xl border-0 bg-transparent p-0 md:border md:border-border/60 md:bg-surface md:p-5"
                : "ui-card-padded"
            }
          >
            {isReadingBrief ? (
              <LifeLabReadingBriefNote
                content={note.content}
                sectionId={note.sectionId}
                slug={note.slug}
                title={note.title}
                flashcards={note.flashcards}
              />
            ) : isPlaylistIndex ? (
              <LifeLabPlaylistIndexNote note={note} />
            ) : (
              <>
                {hasDictionarySections ? (
                  <LifeLabNoteDictionarySections
                    content={noteBodyContent}
                    noteTitle={note.title}
                  />
                ) : (
                  <MarkdownContent content={noteBodyContent} />
                )}
                {playlistNav ? (
                  <div className="mt-6 border-t border-border/50 pt-5">
                    <LifeLabPlaylistVideoNav
                      navigation={playlistNav}
                      variant="footer"
                    />
                  </div>
                ) : null}
              </>
            )}
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

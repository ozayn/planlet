import Link from "next/link";
import { notFound } from "next/navigation";

import { auth } from "@/auth";
import { LifeLabNoteDictionarySections } from "@/components/life-lab/life-lab-note-dictionary-sections";
import { LifeLabNoteContent } from "@/components/life-lab/life-lab-note-content";
import { LifeLabReadingBriefHeader } from "@/components/life-lab/life-lab-reading-brief-header";
import { LifeLabReadingBriefNote } from "@/components/life-lab/life-lab-reading-brief-note";
import { LifeLabPlaylistIndexNote } from "@/components/life-lab/life-lab-playlist-index-note";
import { LifeLabPlaylistVideoNav } from "@/components/life-lab/life-lab-playlist-video-nav";
import { LifeLabPodcastShow } from "@/components/life-lab/life-lab-podcast-show";
import { LifeLabPodcastEpisode } from "@/components/life-lab/life-lab-podcast-episode";
import { LifeLabNoteDetailHeader } from "@/components/life-lab/life-lab-note-detail-header";
import { LifeLabNoteImageFigure } from "@/components/life-lab/life-lab-note-image";
import { LifeLabNoteDevInfoPanel } from "@/components/life-lab/life-lab-note-dev-info-panel";
import { LifeLabNoteTechnicalDebugPanel } from "@/components/life-lab/life-lab-note-technical-debug-panel";
import { LifeLabRefreshButton } from "@/components/life-lab/life-lab-refresh-button";
import { LifeLabStatusPanel } from "@/components/life-lab/life-lab-status-panel";
import { getLifeLabNoteData, getLifeLabSectionData, getPlaylistAssetsForIndexNote, getYoutubeVideoPlaylistNavigation } from "@/lib/life-lab";
import { isLifeLabOpenAiTtsEnabled } from "@/lib/env";
import { getLifeLabReadAloudPreferencesForUser } from "@/lib/life-lab/read-aloud-preferences";
import { canUseLifeLabRefreshBypass } from "@/lib/life-lab/cache";
import { isLifeLabDevToolsEnabled } from "@/lib/life-lab/dev";
import { hasDictionaryStudySections } from "@/lib/life-lab/dictionary-candidates";
import { stripLeadingMarkdownH1 } from "@/lib/life-lab/note-content";
import { isReadingBriefNote } from "@/lib/life-lab/reading-briefs";
import { shouldRenderPlaylistIndexUi } from "@/lib/life-lab/playlist-index";
import { resolveLifeLabNoteImage } from "@/lib/life-lab/note-image";
import {
  findPodcastShowIndex,
  isPodcastEpisodeNote,
  isPodcastShowIndex,
} from "@/lib/life-lab/podcasts";
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
  const isAuthorized = canAccessLifeLabPage(session.user);
  const shouldRefresh = canUseLifeLabRefreshBypass(refresh, isAuthorized);
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
  const isPodcastIndex =
    note.sectionId === "podcasts" && isPodcastShowIndex(note);
  const isPodcastEpisode =
    note.sectionId === "podcasts" && isPodcastEpisodeNote(note);
  const hasDictionarySections = hasDictionaryStudySections(note.content);
  const playlistNav =
    note.sectionId === "youtube-learning" && !isPlaylistIndex
      ? await getYoutubeVideoPlaylistNavigation(note.sectionId, note.slug)
      : null;
  const noteBodyContent = stripLeadingMarkdownH1(note.content);
  const podcastNotes =
    note.sectionId === "podcasts"
      ? (await getLifeLabSectionData(note.sectionId)).notes
      : [];
  const podcastShowIndex = isPodcastEpisode
    ? findPodcastShowIndex(note, podcastNotes)
    : null;
  const noteImage =
    resolveLifeLabNoteImage(note.metadata) ??
    resolveLifeLabNoteImage(podcastShowIndex?.metadata);
  const showNoteImage =
    !isReadingBrief && !isPlaylistIndex && !isPodcastIndex && noteImage !== null;
  const relatedNotes =
    isPlaylistIndex && note.sectionId === "youtube-learning"
      ? (await getLifeLabSectionData(note.sectionId)).notes
      : [];
  const playlistAssets =
    isPlaylistIndex && note.sectionId === "youtube-learning"
      ? await getPlaylistAssetsForIndexNote(note.sectionId, note, {
          refresh: shouldRefresh,
        })
      : null;
  const readAloudPreferences = await getLifeLabReadAloudPreferencesForUser(
    session.user.id,
  );
  const openAiNarrationAvailable = isLifeLabOpenAiTtsEnabled();

  return (
    <section
      className={`ui-life-lab-surface ui-page-stack ${
        isReadingBrief || isPlaylistIndex || isPodcastIndex || isPodcastEpisode
          ? "space-y-3 md:space-y-4"
          : "space-y-4 md:space-y-6"
      }`}
    >
      <div className="flex justify-end">
        <LifeLabRefreshButton
          scope="note"
          sectionId={note.sectionId}
          slug={note.slug}
          fileId={note.fileId}
          metadata={note.metadata}
          relativePath={note.relativePath}
          subfolderLabel={note.subfolderLabel}
        />
      </div>

      {isReadingBrief ? (
        <LifeLabReadingBriefHeader
          sectionId={note.sectionId}
          sectionLabel={note.sectionLabel}
          note={note}
          readAloudPreferences={readAloudPreferences}
          openAiNarrationAvailable={openAiNarrationAvailable}
        />
      ) : isPlaylistIndex || isPodcastIndex || isPodcastEpisode ? null : (
        <LifeLabNoteDetailHeader
          note={note}
          sectionId={note.sectionId}
          sectionLabel={note.sectionLabel}
          playlistNav={playlistNav}
          readAloudPreferences={readAloudPreferences}
          openAiNarrationAvailable={openAiNarrationAvailable}
        />
      )}

      {showNoteImage ? (
        <LifeLabNoteImageFigure
          image={noteImage}
          variant="detail"
          fallbackTitle={note.title}
        />
      ) : null}

      {availability.status !== "ready" ? (
        <LifeLabStatusPanel availability={availability} isAdmin={isAdmin} />
      ) : (
        <>
          <article
            className={
              isReadingBrief || isPlaylistIndex || isPodcastIndex || isPodcastEpisode
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
              <LifeLabPlaylistIndexNote
                note={note}
                relatedNotes={relatedNotes}
                playlistAssets={playlistAssets}
                isAdmin={isAdmin}
                dev={note.dev}
                loadMeta={{
                  fromCache: note.dev?.fromCache ?? false,
                  loadedAt: note.dev?.loadedAt ?? "",
                  cache: note.dev?.cache,
                }}
                technicalProvenance={note.technicalProvenance}
              />
            ) : isPodcastIndex ? (
              <LifeLabPodcastShow
                note={note}
                relatedNotes={podcastNotes}
              />
            ) : isPodcastEpisode ? (
              <LifeLabPodcastEpisode note={note} />
            ) : (
              <>
                {hasDictionarySections ? (
                  <LifeLabNoteDictionarySections
                    content={noteBodyContent}
                    noteTitle={note.title}
                  />
                ) : (
                  <LifeLabNoteContent
                    content={noteBodyContent}
                    sectionId={note.sectionId}
                  />
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
          {note.technicalProvenance && !isPlaylistIndex && !isPodcastIndex ? (
            <LifeLabNoteTechnicalDebugPanel
              technicalProvenance={note.technicalProvenance}
              isAdmin={isAdmin}
            />
          ) : null}
          {note.dev && !isPlaylistIndex && !isPodcastIndex ? (
            <LifeLabNoteDevInfoPanel
              dev={note.dev}
              loadMeta={{
                fromCache: note.dev.fromCache,
                loadedAt: note.dev.loadedAt,
                cache: note.dev.cache,
              }}
            />
          ) : null}
        </>
      )}
    </section>
  );
}

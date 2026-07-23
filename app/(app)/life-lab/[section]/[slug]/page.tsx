import { notFound } from "next/navigation";

import { auth } from "@/auth";
import { FlashcardExplore } from "@/components/life-lab/flashcard-explore";
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
import { LifeLabNoteQualityPanel } from "@/components/life-lab/life-lab-note-quality-panel";
import { LifeLabNoteDevInfoPanel } from "@/components/life-lab/life-lab-note-dev-info-panel";
import { LifeLabNoteTechnicalDebugPanel } from "@/components/life-lab/life-lab-note-technical-debug-panel";
import { LifeLabRefreshButton } from "@/components/life-lab/life-lab-refresh-button";
import { LifeLabStatusPanel } from "@/components/life-lab/life-lab-status-panel";
import { LifeLabSpeechVisibilityProvider } from "@/components/life-lab/life-lab-speech-visibility";
import { LifeLabDiagramAssetProvider } from "@/components/life-lab/life-lab-diagram-assets";
import { LifeLabReadingModeProvider } from "@/components/life-lab/life-lab-reading-mode";
import { LifeLabReadingControls } from "@/components/life-lab/life-lab-reading-controls";
import { getLifeLabNoteData, getLifeLabSectionData, getPlaylistAssetsForIndexNote, getYoutubeVideoPlaylistNavigation } from "@/lib/life-lab";
import { enrichFlashcardsWithLearningDictionary } from "@/lib/learning-dictionary/data";
import { isLifeLabOpenAiTtsEnabled } from "@/lib/env";
import { getLifeLabReadAloudPreferencesForUser } from "@/lib/life-lab/read-aloud-preferences";
import { canUseLifeLabRefreshBypass } from "@/lib/life-lab/cache";
import { isLifeLabDevToolsEnabled } from "@/lib/life-lab/dev";
import { buildMermaidDiagramAssetBindings } from "@/lib/life-lab/diagram-assets";
import { hasDictionaryStudySections } from "@/lib/life-lab/dictionary-candidates";
import { stripLeadingMarkdownH1 } from "@/lib/life-lab/note-content";
import { isReadingBriefNote } from "@/lib/life-lab/reading-briefs";
import { buildNoteItemKey } from "@/lib/life-lab/item-key";
import { isLifeLabItemArchived } from "@/lib/life-lab/item-state";
import { shouldRenderPlaylistIndexUi } from "@/lib/life-lab/playlist-index";
import { resolveLifeLabNoteImage } from "@/lib/life-lab/note-image";
import { resolveLifeLabImagePlacement } from "@/lib/life-lab/image-placement";
import {
  findPodcastShowIndex,
  isPodcastEpisodeNote,
  isPodcastShowIndex,
} from "@/lib/life-lab/podcasts";
import { isAdminRole } from "@/lib/auth-roles";
import { canAccessLifeLabPage } from "@/lib/roles";

type LifeLabNotePageProps = {
  params: Promise<{ section: string; slug: string }>;
  searchParams: Promise<{ refresh?: string; view?: string }>;
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
  const { refresh, view } = await searchParams;

  if (section === "flashcards") {
    const { LifeLabFlashcardDeckExplorePage } = await import(
      "@/components/life-lab/life-lab-flashcard-deck-page"
    );
    return LifeLabFlashcardDeckExplorePage({
      params: Promise.resolve({ section, slug }),
    });
  }
  const isAuthorized = canAccessLifeLabPage(session.user);
  const shouldRefresh = canUseLifeLabRefreshBypass(refresh, isAuthorized);
  const { availability, note } = await getLifeLabNoteData(section, slug, {
    refresh: shouldRefresh,
  });

  if (!note) {
    notFound();
  }

  const noteArchived = await isLifeLabItemArchived(
    session.user.id,
    buildNoteItemKey({
      sectionId: note.sectionId,
      relativePath: note.relativePath,
      slug: note.slug,
    }),
  );

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
  const showDevTools = isAdminRole(session.user.role) && isLifeLabDevToolsEnabled();
  const hasDictionarySections = hasDictionaryStudySections(note.content);
  const playlistNav =
    note.sectionId === "youtube-learning" && !isPlaylistIndex
      ? await getYoutubeVideoPlaylistNavigation(note.sectionId, note.slug)
      : null;
  const noteBodyContent = stripLeadingMarkdownH1(note.content);
  const diagramAssetBindings = buildMermaidDiagramAssetBindings(note.content);
  const podcastNotes =
    note.sectionId === "podcasts"
      ? (await getLifeLabSectionData(note.sectionId)).notes
      : [];
  const podcastShowIndex = isPodcastEpisode
    ? findPodcastShowIndex(note, podcastNotes)
    : null;
  const noteImage = resolveLifeLabNoteImage(note.metadata);
  const podcastShowArtwork = resolveLifeLabNoteImage(
    podcastShowIndex?.metadata,
  );
  const imagePlacement = resolveLifeLabImagePlacement({
    sectionId: note.sectionId,
    note,
    leadImage: noteImage ?? podcastShowArtwork,
    headerImage: isPodcastEpisode
      ? noteImage ?? podcastShowArtwork
      : null,
  });
  const showNoteImage =
    !isReadingBrief &&
    !isPlaylistIndex &&
    !isPodcastIndex &&
    imagePlacement.leadImage !== null;
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
  const showFlashcardsView =
    view === "flashcards" && (note.flashcards?.length ?? 0) > 0;
  const flashcardsWithDictionary = showFlashcardsView
    ? await enrichFlashcardsWithLearningDictionary(note.flashcards ?? [])
    : [];

  return (
    <LifeLabReadingModeProvider metadata={note.metadata}>
      <LifeLabDiagramAssetProvider
        sectionId={note.sectionId}
        slug={note.slug}
        bindings={diagramAssetBindings}
      >
        <LifeLabSpeechVisibilityProvider>
      <section
        className={`ui-life-lab-surface ui-page-stack ${
          isReadingBrief || isPlaylistIndex || isPodcastIndex || isPodcastEpisode
            ? "space-y-3 md:space-y-4"
            : "space-y-4 md:space-y-6"
        }`}
      >
      {!showFlashcardsView ? (
        <div className="flex justify-end gap-2">
          <LifeLabReadingControls />
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
      ) : null}

      {showFlashcardsView ? (
        <>
          {availability.status !== "ready" ? (
            <LifeLabStatusPanel availability={availability} isAdmin={isAdmin} />
          ) : (
            <FlashcardExplore
              deck={{
                id: `${note.sectionId}__${note.slug}`,
                title: note.title,
                cards: flashcardsWithDictionary,
                sourceNoteHref: `/life-lab/${note.sectionId}/${note.slug}`,
                sourceNoteTitle: note.title,
                sourceSectionId: note.sectionId,
                category: note.metadata?.category ?? null,
              }}
              backHref={`/life-lab/${note.sectionId}/${note.slug}`}
              developerMode={showDevTools}
            />
          )}
        </>
      ) : (
        <>
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
          archived={noteArchived}
        />
      )}

      {showNoteImage ? (
        <LifeLabNoteImageFigure
          image={imagePlacement.leadImage!}
          variant="detail"
          fallbackTitle={note.title}
        />
      ) : null}

      {availability.status !== "ready" ? (
        <LifeLabStatusPanel availability={availability} isAdmin={isAdmin} />
      ) : (
        <>
          <article
            className={`ui-reading-content ${
              isReadingBrief || isPlaylistIndex || isPodcastIndex || isPodcastEpisode
                ? "md:ui-card-padded rounded-xl border-0 bg-transparent p-0 md:border md:border-border/60 md:bg-surface md:p-5"
                : "ui-card-padded"
            }`}
          >
            {isReadingBrief ? (
              <LifeLabReadingBriefNote
                content={note.content}
                sectionId={note.sectionId}
                slug={note.slug}
                title={note.title}
                metadata={note.metadata}
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
              <LifeLabPodcastEpisode
                note={note}
                artwork={imagePlacement.headerImage}
                readAloudPreferences={readAloudPreferences}
                openAiNarrationAvailable={openAiNarrationAvailable}
              />
            ) : (
              <>
                {hasDictionarySections ? (
                  <LifeLabNoteDictionarySections
                    content={noteBodyContent}
                    noteTitle={note.title}
                    metadata={note.metadata}
                  />
                ) : (
                  <LifeLabNoteContent
                    content={noteBodyContent}
                    sectionId={note.sectionId}
                    metadata={note.metadata}
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
          {showDevTools ? (
            <LifeLabNoteQualityPanel
              content={note.content}
              title={note.title}
              metadata={note.metadata}
            />
          ) : null}
          {note.technicalProvenance ? (
            <LifeLabNoteTechnicalDebugPanel
              technicalProvenance={note.technicalProvenance}
              developerMode={showDevTools}
            />
          ) : null}
          {showDevTools && note.dev && !isPlaylistIndex && !isPodcastIndex ? (
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
        </>
      )}
      </section>
        </LifeLabSpeechVisibilityProvider>
      </LifeLabDiagramAssetProvider>
    </LifeLabReadingModeProvider>
  );
}

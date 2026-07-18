"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { useState } from "react";

import { LifeLabNoteContent } from "@/components/life-lab/life-lab-note-content";
import { LifeLabNoteListen } from "@/components/life-lab/life-lab-note-listen";
import { LifeLabMetadataChips } from "@/components/life-lab/life-lab-metadata-chips";
import { LifeLabPodcastArtwork } from "@/components/life-lab/life-lab-podcast-artwork";
import type { LifeLabNote } from "@/lib/life-lab/constants";
import type { ResolvedLifeLabNoteImage } from "@/lib/life-lab/note-image";
import { stripLeadingMarkdownH1 } from "@/lib/life-lab/note-content";
import type { LifeLabReadAloudPreferences } from "@/lib/life-lab/read-aloud-preferences";
import { suppressExactHeaderMetadataLines } from "@/lib/life-lab/note-quality";
import { LIFE_LAB_UI_LABELS } from "@/lib/life-lab/ui-labels";
import {
  buildPodcastTimelinePreview,
  podcastEpisodeDisplayTitle,
  podcastEpisodeSourceUrl,
} from "@/lib/life-lab/podcasts";

type LifeLabPodcastEpisodeProps = {
  note: LifeLabNote;
  artwork: ResolvedLifeLabNoteImage | null;
  readAloudPreferences: LifeLabReadAloudPreferences;
  openAiNarrationAvailable: boolean;
};

function splitSourceNotes(content: string): {
  main: string;
  sourceNotes: string | null;
} {
  const match = content.match(
    /^##\s+(?:Source notes?|Sources?|Transcript notes?)\s*$/im,
  );

  if (!match || match.index === undefined) {
    return { main: content, sourceNotes: null };
  }

  const rest = content.slice(match.index + match[0].length);
  const next = rest.search(/^##\s+/m);
  const sourceBody = (next === -1 ? rest : rest.slice(0, next)).trim();
  const after = next === -1 ? "" : rest.slice(next).trim();
  const before = content.slice(0, match.index).trim();

  return {
    main: [before, after].filter(Boolean).join("\n\n"),
    sourceNotes: sourceBody || null,
  };
}

function splitTimeline(content: string): {
  before: string;
  timeline: string | null;
  after: string;
} {
  const match = content.match(/^##\s+Timeline\s*$/im);

  if (!match || match.index === undefined) {
    return { before: content, timeline: null, after: "" };
  }

  const rest = content.slice(match.index + match[0].length);
  const next = rest.search(/^##\s+/m);

  return {
    before: content.slice(0, match.index).trim(),
    timeline: (next === -1 ? rest : rest.slice(0, next)).trim() || null,
    after: next === -1 ? "" : rest.slice(next).trim(),
  };
}

function PodcastTimeline({ content }: { content: string }) {
  const [expanded, setExpanded] = useState(false);
  const { preview, itemCount } = buildPodcastTimelinePreview(content);
  const hasDisclosure = itemCount > 3;

  return (
    <section className="space-y-3" aria-labelledby="podcast-timeline-heading">
      <h2
        id="podcast-timeline-heading"
        className="text-lg font-semibold tracking-tight text-foreground"
      >
        Timeline
      </h2>
      {hasDisclosure ? (
        <>
          <div className={expanded ? "hidden" : "print:hidden"}>
            <LifeLabNoteContent content={preview} sectionId="podcasts" />
          </div>
          <div
            id="podcast-timeline-content"
            className={
              expanded
                ? "block motion-safe:animate-in motion-safe:fade-in"
                : "hidden print:block"
            }
          >
            <LifeLabNoteContent content={content} sectionId="podcasts" />
          </div>
          <button
            type="button"
            aria-expanded={expanded}
            aria-controls="podcast-timeline-content"
            onClick={() => setExpanded((current) => !current)}
            className="min-h-10 rounded-full border border-border/70 px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-accent-cream/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border print:hidden"
          >
            {expanded
              ? LIFE_LAB_UI_LABELS.collapseTimeline
              : LIFE_LAB_UI_LABELS.showFullTimeline}
          </button>
        </>
      ) : (
        <LifeLabNoteContent content={content} sectionId="podcasts" />
      )}
    </section>
  );
}

export function LifeLabPodcastEpisode({
  note,
  artwork,
  readAloudPreferences,
  openAiNarrationAvailable,
}: LifeLabPodcastEpisodeProps) {
  const title = podcastEpisodeDisplayTitle(note);
  const sourceUrl = podcastEpisodeSourceUrl(note.metadata);
  const noteMetadata = note.metadata ?? {};
  const publicationDate =
    noteMetadata.publication_date ?? noteMetadata.date ?? note.dateLabel;
  const metadata = [
    noteMetadata.show,
    publicationDate,
    noteMetadata.duration,
    noteMetadata.platform,
  ].filter(Boolean);
  const { main, sourceNotes } = splitSourceNotes(
    stripLeadingMarkdownH1(note.content),
  );
  const visibleMain = suppressExactHeaderMetadataLines(main, noteMetadata);
  const { before, timeline, after } = splitTimeline(visibleMain);
  const technicalDetails = [
    noteMetadata.language
      ? { label: "Language", value: noteMetadata.language }
      : null,
    noteMetadata.transcript_available !== undefined
      ? {
          label: "Transcript",
          value: noteMetadata.transcript_available ? "Available" : "Unavailable",
        }
      : null,
    noteMetadata.transcription_method
      ? {
          label: "Transcription",
          value: noteMetadata.transcription_method,
        }
      : null,
    noteMetadata.note_profile
      ? { label: "Note profile", value: noteMetadata.note_profile }
      : null,
    noteMetadata.study_status
      ? { label: "Study status", value: noteMetadata.study_status }
      : null,
  ].filter((item): item is { label: string; value: string } => Boolean(item));

  return (
    <div className="space-y-5">
      <header className="flex items-start gap-3 border-b border-border/50 pb-4 sm:gap-5">
        <LifeLabPodcastArtwork
          image={artwork}
          title={title}
          className="size-20 sm:size-28"
          eager
        />
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-light">
            Podcast episode
          </p>
          <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            {title}
          </h1>
          {metadata.length > 0 ? (
            <p className="text-sm text-muted">{metadata.join(" · ")}</p>
          ) : null}
          <LifeLabMetadataChips
            metadata={noteMetadata}
            sectionId="podcasts"
            sectionLabel="Podcasts"
            subfolderLabel={note.subfolderLabel}
            variant="detail-mobile"
          />
          <div className="flex flex-wrap items-center gap-3">
            {sourceUrl ? (
              <a
                href={sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-10 items-center gap-1 text-xs font-medium text-muted transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border"
              >
                {LIFE_LAB_UI_LABELS.openOriginalEpisode}
                <ExternalLink className="size-3.5" aria-hidden="true" />
              </a>
            ) : null}
            <Link
              href="/life-lab/podcasts"
              className="inline-flex min-h-10 items-center text-xs font-medium text-muted transition-colors hover:text-foreground"
            >
              {LIFE_LAB_UI_LABELS.backToPodcasts}
            </Link>
            {(note.flashcards?.length ?? note.flashcardCount ?? 0) > 0 ? (
              <Link
                href={`/life-lab/podcasts/${note.slug}/study`}
                className="rounded-full bg-accent-cream px-3 py-1.5 text-xs font-medium text-foreground"
              >
                Study · {note.flashcards?.length ?? note.flashcardCount} cards
              </Link>
            ) : null}
          </div>
          <LifeLabNoteListen
            title={title}
            content={visibleMain}
            sectionId={note.sectionId}
            slug={note.slug}
            fileId={note.fileId}
            preferences={readAloudPreferences}
            openAiNarrationAvailable={openAiNarrationAvailable}
            className="pt-1"
          />
        </div>
      </header>

      {before ? (
        <LifeLabNoteContent content={before} sectionId="podcasts" />
      ) : null}
      {timeline ? <PodcastTimeline content={timeline} /> : null}
      {after ? (
        <LifeLabNoteContent content={after} sectionId="podcasts" />
      ) : null}

      {technicalDetails.length > 0 ? (
        <details className="ui-settings-details group">
          <summary className="ui-settings-details-summary !text-sm !normal-case !tracking-normal">
            <span className="font-medium text-muted">
              {LIFE_LAB_UI_LABELS.episodeDetails}
            </span>
          </summary>
          <dl className="ui-settings-details-body space-y-1.5 text-sm">
            {technicalDetails.map((item) => (
              <div key={item.label} className="flex justify-between gap-4">
                <dt className="text-muted">{item.label}</dt>
                <dd className="text-right text-foreground">{item.value}</dd>
              </div>
            ))}
          </dl>
        </details>
      ) : null}

      {sourceNotes ? (
        <details className="ui-settings-details group">
          <summary className="ui-settings-details-summary !text-sm !normal-case !tracking-normal">
            <span className="font-medium text-muted">
              {LIFE_LAB_UI_LABELS.sourceNotes}
            </span>
          </summary>
          <div className="ui-settings-details-body">
            <LifeLabNoteContent content={sourceNotes} sectionId="podcasts" />
          </div>
        </details>
      ) : null}
    </div>
  );
}

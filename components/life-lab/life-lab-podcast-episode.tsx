"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";

import { LifeLabNoteContent } from "@/components/life-lab/life-lab-note-content";
import { LifeLabMetadataChips } from "@/components/life-lab/life-lab-metadata-chips";
import type { LifeLabNote } from "@/lib/life-lab/constants";
import { stripLeadingMarkdownH1 } from "@/lib/life-lab/note-content";
import {
  podcastEpisodeDisplayTitle,
  podcastEpisodeSourceUrl,
} from "@/lib/life-lab/podcasts";

type LifeLabPodcastEpisodeProps = {
  note: LifeLabNote;
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

export function LifeLabPodcastEpisode({
  note,
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
      <header className="space-y-2 border-b border-border/50 pb-4">
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
          variant="detail-compact"
        />
        <div className="flex flex-wrap items-center gap-3">
          {sourceUrl ? (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-10 items-center gap-1 text-xs font-medium text-muted transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border"
            >
              Open original episode
              <ExternalLink className="size-3.5" aria-hidden="true" />
            </a>
          ) : null}
          <Link
            href="/life-lab/podcasts"
            className="inline-flex min-h-10 items-center text-xs font-medium text-muted transition-colors hover:text-foreground"
          >
            Back to Podcasts
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
      </header>

      <LifeLabNoteContent content={main} sectionId="podcasts" />

      {technicalDetails.length > 0 ? (
        <details className="ui-settings-details group">
          <summary className="ui-settings-details-summary !text-sm !normal-case !tracking-normal">
            <span className="font-medium text-muted">Episode details</span>
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
            <span className="font-medium text-muted">Source notes</span>
          </summary>
          <div className="ui-settings-details-body">
            <LifeLabNoteContent content={sourceNotes} sectionId="podcasts" />
          </div>
        </details>
      ) : null}
    </div>
  );
}

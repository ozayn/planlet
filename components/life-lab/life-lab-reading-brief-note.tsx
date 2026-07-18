import { LifeLabCollapsibleTranscript } from "@/components/life-lab/life-lab-collapsible-transcript";
import { LifeLabDictionaryCandidatesCard } from "@/components/life-lab/life-lab-dictionary-candidates-card";
import { LifeLabReadingBriefFlashcards } from "@/components/life-lab/life-lab-reading-brief-flashcards";
import { LifeLabReadingBriefGlance } from "@/components/life-lab/life-lab-reading-brief-glance";
import { LifeLabReadingBriefSaveWorthy } from "@/components/life-lab/life-lab-reading-brief-save-worthy";
import { MarkdownContent } from "@/components/life-lab/markdown-content";
import type {
  LifeLabFlashcard,
  LifeLabNoteMetadata,
  LifeLabSectionId,
} from "@/lib/life-lab/constants";
import { extractDictionaryCandidatesSection } from "@/lib/life-lab/dictionary-candidates";
import {
  prepareReadingBriefSegments,
  readingBriefHeadingAnchor,
  shouldShowReadingBriefNav,
  type ReadingBriefSegment,
} from "@/lib/life-lab/reading-briefs";
import {
  suppressExactHeaderMetadataLines,
  suppressExactLifeLabMarkdownDuplicates,
} from "@/lib/life-lab/note-quality";

type LifeLabReadingBriefNoteProps = {
  content: string;
  sectionId: LifeLabSectionId;
  slug: string;
  title: string;
  metadata?: LifeLabNoteMetadata;
  flashcards?: LifeLabFlashcard[];
};

const STUDY_NOTES_INSERT_HEADINGS = new Set([
  "study layer",
  "study notes",
  "vocabulary and phrasing",
  "names and concepts to remember",
]);

function shouldInsertDictionaryCandidatesCard(
  segment: ReadingBriefSegment,
  inserted: boolean,
  hasCandidates: boolean,
): boolean {
  if (!hasCandidates || inserted || segment.kind !== "markdown") {
    return false;
  }

  const heading = segment.heading?.trim().toLowerCase();

  return heading ? STUDY_NOTES_INSERT_HEADINGS.has(heading) : false;
}

function CollapsibleReadingBriefSection({
  segment,
  usedAnchors,
}: {
  segment: Extract<ReadingBriefSegment, { kind: "markdown" }>;
  usedAnchors: Set<string>;
}) {
  const heading = segment.heading ?? "Section";
  const anchor = readingBriefHeadingAnchor(heading);
  const anchorId =
    anchor && !usedAnchors.has(anchor)
      ? (usedAnchors.add(anchor), anchor)
      : undefined;

  return (
    <section
      id={anchorId}
      className={anchorId ? "scroll-mt-[calc(3.25rem+env(safe-area-inset-top)+2.5rem)] md:scroll-mt-20" : undefined}
    >
      <details className="ui-settings-details group">
        <summary className="ui-settings-details-summary !text-sm !normal-case !tracking-normal">
          <span className="font-semibold text-foreground">{heading}</span>
          {segment.preview ? (
            <span className="mt-0.5 block truncate text-xs font-normal text-muted">
              {segment.preview}
            </span>
          ) : null}
        </summary>
        <div className="ui-settings-details-body">
          <MarkdownContent
            content={segment.content}
            compact
            readingBriefMode
          />
        </div>
      </details>
    </section>
  );
}

function ReadingBriefSegmentBlock({
  segment,
  sectionId,
  slug,
  usedAnchors,
}: {
  segment: ReadingBriefSegment;
  sectionId: LifeLabSectionId;
  slug: string;
  usedAnchors: Set<string>;
}) {
  switch (segment.kind) {
    case "markdown":
      if (!segment.content) {
        return null;
      }

      if (segment.collapsible && segment.heading) {
        return (
          <CollapsibleReadingBriefSection
            segment={segment}
            usedAnchors={usedAnchors}
          />
        );
      }

      return (
        <MarkdownContent
          content={segment.content}
          readingBriefAnchors
          readingBriefMode
        />
      );
    case "flashcards":
      return (
        <LifeLabReadingBriefFlashcards
          sectionId={sectionId}
          slug={slug}
          cards={segment.cards}
        />
      );
    case "transcript":
      return (
        <LifeLabCollapsibleTranscript
          title={segment.title}
          content={segment.content}
        />
      );
    case "save-worthy":
      return <LifeLabReadingBriefSaveWorthy groups={segment.groups} />;
    default:
      return null;
  }
}

export function LifeLabReadingBriefNote({
  content,
  sectionId,
  slug,
  title,
  metadata,
  flashcards = [],
}: LifeLabReadingBriefNoteProps) {
  const deduplicatedContent = suppressExactLifeLabMarkdownDuplicates(
    suppressExactHeaderMetadataLines(content, metadata),
    title,
  );
  const usedNavAnchors = new Set<string>();
  const dictionaryCandidates = extractDictionaryCandidatesSection(
    deduplicatedContent,
  );

  const { glanceSegments, contentSegments, navSections } =
    prepareReadingBriefSegments(deduplicatedContent, flashcards);
  const showNav = shouldShowReadingBriefNav(deduplicatedContent);
  const dictionaryCandidatesInsertIndex = dictionaryCandidates
    ? contentSegments.findIndex((segment) =>
        shouldInsertDictionaryCandidatesCard(segment, false, true),
      )
    : -1;

  return (
    <div className="space-y-3 md:space-y-4">
      {showNav ? (
        <nav
          aria-label="Brief sections"
          className="sticky top-[calc(3.25rem+env(safe-area-inset-top))] z-10 -mx-1 flex gap-1.5 overflow-x-auto border-b border-border/40 bg-surface/95 px-1 py-1.5 backdrop-blur [scrollbar-width:none] md:top-0 md:gap-2 md:py-2 [&::-webkit-scrollbar]:hidden"
        >
          {navSections.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className="shrink-0 rounded-full border border-border/70 px-2.5 py-0.5 text-[0.6875rem] font-medium text-muted transition-colors hover:border-border hover:text-foreground active:bg-accent-cream/50 md:px-3 md:py-1 md:text-xs"
            >
              {section.label}
            </a>
          ))}
        </nav>
      ) : null}

      {glanceSegments.map((segment) =>
        segment.kind === "glance" ? (
          <LifeLabReadingBriefGlance
            key={segment.title}
            title={segment.title}
            content={segment.content}
          />
        ) : null,
      )}

      {contentSegments.map((segment, index) => {
        const insertDictionaryCandidates =
          index === dictionaryCandidatesInsertIndex;

        return (
          <div key={`${segment.kind}-${index}`} className="space-y-3 md:space-y-4">
            {insertDictionaryCandidates && dictionaryCandidates ? (
              <LifeLabDictionaryCandidatesCard
                noteTitle={title}
                section={dictionaryCandidates}
              />
            ) : null}
            <ReadingBriefSegmentBlock
              segment={segment}
              sectionId={sectionId}
              slug={slug}
              usedAnchors={usedNavAnchors}
            />
          </div>
        );
      })}
    </div>
  );
}

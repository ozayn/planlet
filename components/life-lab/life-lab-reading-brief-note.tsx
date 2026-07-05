import { LifeLabReadingBriefFlashcards } from "@/components/life-lab/life-lab-reading-brief-flashcards";
import { LifeLabReadingBriefGlance } from "@/components/life-lab/life-lab-reading-brief-glance";
import { LifeLabReadingBriefSaveWorthy } from "@/components/life-lab/life-lab-reading-brief-save-worthy";
import { MarkdownContent } from "@/components/life-lab/markdown-content";
import type { LifeLabFlashcard, LifeLabSectionId } from "@/lib/life-lab/constants";
import {
  prepareReadingBriefSegments,
  readingBriefHeadingAnchor,
  shouldShowReadingBriefNav,
  type ReadingBriefSegment,
} from "@/lib/life-lab/reading-briefs";

type LifeLabReadingBriefNoteProps = {
  content: string;
  sectionId: LifeLabSectionId;
  slug: string;
  flashcards?: LifeLabFlashcard[];
};

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
  flashcards = [],
}: LifeLabReadingBriefNoteProps) {
  const usedNavAnchors = new Set<string>();

  const { glanceSegments, contentSegments, navSections } =
    prepareReadingBriefSegments(content, flashcards);
  const showNav = shouldShowReadingBriefNav(content);

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

      {contentSegments.map((segment, index) => (
        <ReadingBriefSegmentBlock
          key={`${segment.kind}-${index}`}
          segment={segment}
          sectionId={sectionId}
          slug={slug}
          usedAnchors={usedNavAnchors}
        />
      ))}
    </div>
  );
}

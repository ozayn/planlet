import { LifeLabCollapsibleTranscript } from "@/components/life-lab/life-lab-collapsible-transcript";
import { LifeLabDictionaryCandidatesCard } from "@/components/life-lab/life-lab-dictionary-candidates-card";
import { LifeLabFlashcardList } from "@/components/life-lab/life-lab-flashcard-list";
import { LifeLabLearningMapCompact } from "@/components/life-lab/life-lab-learning-map-compact";
import { MarkdownContent } from "@/components/life-lab/markdown-content";
import {
  buildLifeLabNoteContentBlocks,
  resolveLifeLabNoteContentBlockOptions,
  type LifeLabNoteContentBlock,
} from "@/lib/life-lab/note-content-blocks";
import type {
  LifeLabNoteMetadata,
  LifeLabSectionId,
} from "@/lib/life-lab/constants";
import type { DictionaryStudySection } from "@/lib/life-lab/dictionary-candidates";
import {
  suppressExactHeaderMetadataLines,
  suppressExactLifeLabMarkdownDuplicates,
} from "@/lib/life-lab/note-quality";

type LifeLabNoteContentProps = {
  content: string;
  sectionId?: LifeLabSectionId;
  metadata?: LifeLabNoteMetadata;
  noteTitle?: string;
};

function CollapsibleDictionaryStudySection({
  section,
}: {
  section: DictionaryStudySection;
}) {
  if (section.kind === "candidates") {
    return null;
  }

  return (
    <section>
      <details className="ui-settings-details group">
        <summary className="ui-settings-details-summary !text-sm !normal-case !tracking-normal">
          <span className="font-semibold text-foreground">{section.title}</span>
        </summary>
        <div className="ui-settings-details-body">
          <MarkdownContent content={section.content} compact readingBriefMode />
        </div>
      </details>
    </section>
  );
}

function LifeLabNoteContentBlockView({
  block,
  noteTitle,
}: {
  block: LifeLabNoteContentBlock;
  noteTitle: string;
}) {
  switch (block.kind) {
    case "markdown":
      return <MarkdownContent content={block.content} />;
    case "learning-map":
      return (
        <LifeLabLearningMapCompact
          title={block.title}
          mermaidCode={block.mermaidCode}
          introMarkdown={block.introMarkdown}
        />
      );
    case "flashcards":
      return (
        <LifeLabFlashcardList cards={block.cards} title={block.title} />
      );
    case "transcript":
      return (
        <LifeLabCollapsibleTranscript
          title={block.title}
          content={block.content}
          summaryHint={block.summaryHint}
        />
      );
    case "dictionary-section":
      if (block.section.kind === "candidates") {
        return (
          <LifeLabDictionaryCandidatesCard
            noteTitle={noteTitle}
            section={block.section}
          />
        );
      }

      return <CollapsibleDictionaryStudySection section={block.section} />;
    default:
      return null;
  }
}

/**
 * Shared note body layout for YouTube, podcasts, lecture notes, references,
 * and other Life Lab note types. Learning Map (when present) renders first.
 */
export function LifeLabNoteContent({
  content,
  sectionId,
  metadata,
  noteTitle = "",
}: LifeLabNoteContentProps) {
  const deduplicatedContent = suppressExactLifeLabMarkdownDuplicates(
    suppressExactHeaderMetadataLines(content, metadata),
    noteTitle || undefined,
  );
  const blocks = buildLifeLabNoteContentBlocks(
    deduplicatedContent,
    resolveLifeLabNoteContentBlockOptions(sectionId),
  );

  return (
    <div
      className="space-y-3 md:space-y-4"
      data-life-lab-note-content=""
      data-life-lab-content-order="learning-map-first"
    >
      {blocks.map((block, index) => (
        <LifeLabNoteContentBlockView
          key={`${block.kind}-${index}`}
          block={block}
          noteTitle={noteTitle}
        />
      ))}
    </div>
  );
}

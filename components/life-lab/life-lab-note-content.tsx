import { LifeLabCollapsibleTranscript } from "@/components/life-lab/life-lab-collapsible-transcript";
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
import {
  suppressExactHeaderMetadataLines,
  suppressExactLifeLabMarkdownDuplicates,
} from "@/lib/life-lab/note-quality";

type LifeLabNoteContentProps = {
  content: string;
  sectionId?: LifeLabSectionId;
  metadata?: LifeLabNoteMetadata;
};

function LifeLabNoteContentBlockView({
  block,
}: {
  block: LifeLabNoteContentBlock;
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
}: LifeLabNoteContentProps) {
  const deduplicatedContent = suppressExactLifeLabMarkdownDuplicates(
    suppressExactHeaderMetadataLines(content, metadata),
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
        />
      ))}
    </div>
  );
}

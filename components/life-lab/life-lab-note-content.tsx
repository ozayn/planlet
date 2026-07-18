import { LifeLabCollapsibleTranscript } from "@/components/life-lab/life-lab-collapsible-transcript";
import { LifeLabFlashcardList } from "@/components/life-lab/life-lab-flashcard-list";
import { MarkdownContent } from "@/components/life-lab/markdown-content";
import {
  buildLifeLabNoteContentBlocks,
  type LifeLabNoteContentBlock,
} from "@/lib/life-lab/note-content-blocks";
import { isLectureNotesSectionId } from "@/lib/life-lab/lecture-notes";
import type { LifeLabSectionId } from "@/lib/life-lab/constants";

type LifeLabNoteContentProps = {
  content: string;
  sectionId?: LifeLabSectionId;
};

function LifeLabNoteContentBlock({
  block,
}: {
  block: LifeLabNoteContentBlock;
}) {
  switch (block.kind) {
    case "markdown":
      return <MarkdownContent content={block.content} />;
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

export function LifeLabNoteContent({
  content,
  sectionId,
}: LifeLabNoteContentProps) {
  const isLectureNotes = isLectureNotesSectionId(sectionId);
  const isPodcastEpisode = sectionId === "podcasts";
  const blocks = buildLifeLabNoteContentBlocks(content, {
    prioritizeShortVersion: isLectureNotes || isPodcastEpisode,
    collapseTranscriptNotes: isLectureNotes || isPodcastEpisode,
  });

  return (
    <div className="space-y-3 md:space-y-4">
      {blocks.map((block, index) => (
        <LifeLabNoteContentBlock key={`${block.kind}-${index}`} block={block} />
      ))}
    </div>
  );
}

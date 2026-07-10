import { LifeLabCollapsibleTranscript } from "@/components/life-lab/life-lab-collapsible-transcript";
import { LifeLabFlashcardList } from "@/components/life-lab/life-lab-flashcard-list";
import { MarkdownContent } from "@/components/life-lab/markdown-content";
import {
  buildLifeLabNoteContentBlocks,
  type LifeLabNoteContentBlock,
} from "@/lib/life-lab/note-content-blocks";

type LifeLabNoteContentProps = {
  content: string;
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
        />
      );
    default:
      return null;
  }
}

export function LifeLabNoteContent({ content }: LifeLabNoteContentProps) {
  const blocks = buildLifeLabNoteContentBlocks(content);

  return (
    <div className="space-y-3 md:space-y-4">
      {blocks.map((block, index) => (
        <LifeLabNoteContentBlock key={`${block.kind}-${index}`} block={block} />
      ))}
    </div>
  );
}

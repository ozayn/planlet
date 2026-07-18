import { LifeLabCollapsibleTranscript } from "@/components/life-lab/life-lab-collapsible-transcript";
import { LifeLabDictionaryCandidatesCard } from "@/components/life-lab/life-lab-dictionary-candidates-card";
import { LifeLabFlashcardList } from "@/components/life-lab/life-lab-flashcard-list";
import { MarkdownContent } from "@/components/life-lab/markdown-content";
import {
  buildDictionaryNoteContentBlocks,
  type DictionaryNoteContentBlock,
  type DictionaryStudySection,
} from "@/lib/life-lab/dictionary-candidates";
import type { LifeLabNoteMetadata } from "@/lib/life-lab/constants";
import {
  suppressExactHeaderMetadataLines,
  suppressExactLifeLabMarkdownDuplicates,
} from "@/lib/life-lab/note-quality";

type LifeLabNoteDictionarySectionsProps = {
  content: string;
  noteTitle: string;
  metadata?: LifeLabNoteMetadata;
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

function DictionaryContentBlock({
  block,
  noteTitle,
}: {
  block: DictionaryNoteContentBlock;
  noteTitle: string;
}) {
  if (block.kind === "markdown") {
    return <MarkdownContent content={block.content} />;
  }

  if (block.kind === "flashcards") {
    return <LifeLabFlashcardList cards={block.cards} title={block.title} />;
  }

  if (block.kind === "transcript") {
    return (
      <LifeLabCollapsibleTranscript
        title={block.title}
        content={block.content}
      />
    );
  }

  if (block.section.kind === "candidates") {
    return (
      <LifeLabDictionaryCandidatesCard
        noteTitle={noteTitle}
        section={block.section}
      />
    );
  }

  return <CollapsibleDictionaryStudySection section={block.section} />;
}

export function LifeLabNoteDictionarySections({
  content,
  noteTitle,
  metadata,
}: LifeLabNoteDictionarySectionsProps) {
  const blocks = buildDictionaryNoteContentBlocks(
    suppressExactLifeLabMarkdownDuplicates(
      suppressExactHeaderMetadataLines(content, metadata),
      noteTitle,
    ),
  );

  return (
    <div className="space-y-3 md:space-y-4">
      {blocks.map((block, index) => (
        <DictionaryContentBlock
          key={`${block.kind}-${index}`}
          block={block}
          noteTitle={noteTitle}
        />
      ))}
    </div>
  );
}

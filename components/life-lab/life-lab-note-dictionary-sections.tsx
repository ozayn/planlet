import { LifeLabDictionaryCandidatesCard } from "@/components/life-lab/life-lab-dictionary-candidates-card";
import { MarkdownContent } from "@/components/life-lab/markdown-content";
import {
  buildDictionaryNoteContentBlocks,
  type DictionaryNoteContentBlock,
  type DictionaryStudySection,
} from "@/lib/life-lab/dictionary-candidates";

type LifeLabNoteDictionarySectionsProps = {
  content: string;
  noteTitle: string;
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
}: LifeLabNoteDictionarySectionsProps) {
  const blocks = buildDictionaryNoteContentBlocks(content);

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

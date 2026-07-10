import { MarkdownContent } from "@/components/life-lab/markdown-content";

type LifeLabCollapsibleTranscriptProps = {
  title?: string;
  content: string;
};

export function LifeLabCollapsibleTranscript({
  title = "Full transcript",
  content,
}: LifeLabCollapsibleTranscriptProps) {
  if (!content.trim()) {
    return null;
  }

  return (
    <section className="scroll-mt-20">
      <details className="ui-settings-details group">
        <summary className="ui-settings-details-summary !text-sm !normal-case !tracking-normal">
          <span className="font-semibold text-foreground">{title}</span>
          <span className="mt-0.5 block text-xs font-normal text-muted">
            Show transcript
          </span>
        </summary>
        <div className="ui-settings-details-body">
          <MarkdownContent content={content} compact readingBriefMode />
        </div>
      </details>
    </section>
  );
}

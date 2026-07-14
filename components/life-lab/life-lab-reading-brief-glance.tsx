import {
  extractReadingBriefGlanceFields,
  parseGlanceListItems,
} from "@/lib/life-lab/reading-briefs";
import { MarkdownContent } from "@/components/life-lab/markdown-content";

type LifeLabReadingBriefGlanceProps = {
  title: string;
  content: string;
};

function GlanceParagraph({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="space-y-1">
      <p className="text-sm font-semibold text-foreground">{label}</p>
      <p className="text-sm leading-relaxed text-foreground">{value}</p>
    </div>
  );
}

function GlanceBulletList({
  label,
  items,
}: {
  label: string;
  items: string[];
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="space-y-1.5">
      <p className="text-sm font-semibold text-foreground">{label}</p>
      <ul className="space-y-1.5">
        {items.map((item, index) => (
          <li
            key={`${label}-${index}`}
            className="flex gap-2 text-sm leading-relaxed text-foreground"
          >
            <span className="shrink-0 text-muted" aria-hidden="true">
              •
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function LifeLabReadingBriefGlance({
  title,
  content,
}: LifeLabReadingBriefGlanceProps) {
  const fields = extractReadingBriefGlanceFields(content);
  const topStories = fields.topStories
    ? parseGlanceListItems(fields.topStories)
    : [];
  const whyItMatters = fields.whyItMatters
    ? parseGlanceListItems(fields.whyItMatters)
    : [];
  const hasStructuredFields = Boolean(
    fields.pattern ||
      topStories.length > 0 ||
      whyItMatters.length > 0 ||
      fields.question,
  );
  const anchorId = "short-version";

  return (
    <section
      id={anchorId}
      className="scroll-mt-[calc(3.25rem+env(safe-area-inset-top)+2.5rem)] rounded-lg border border-border/40 bg-accent-cream/20 p-3 md:scroll-mt-20 md:rounded-xl md:border-border/60 md:bg-accent-cream/30 md:p-4"
    >
      <h2 className="mb-2.5 text-[0.6875rem] font-semibold uppercase tracking-wide text-muted md:mb-3">
        {title}
      </h2>
      {hasStructuredFields ? (
        <div className="space-y-3">
          {fields.pattern ? (
            <GlanceParagraph label="Pattern" value={fields.pattern} />
          ) : null}
          {topStories.length > 0 ? (
            <GlanceBulletList label="Top 3 stories" items={topStories} />
          ) : null}
          {whyItMatters.length > 0 ? (
            <GlanceBulletList label="Why it matters" items={whyItMatters} />
          ) : null}
          {fields.question ? (
            <GlanceParagraph
              label="Question to carry"
              value={fields.question}
            />
          ) : null}
        </div>
      ) : (
        <MarkdownContent content={content} compact readingBriefMode />
      )}
    </section>
  );
}

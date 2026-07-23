"use client";

import { useRef, useState } from "react";

import { MermaidBlock } from "@/components/life-lab/mermaid-block";
import { MermaidDiagramDialog } from "@/components/life-lab/mermaid-diagram-dialog";
import { extractMermaidOutlineLabels } from "@/lib/life-lab/mermaid-outline";

type LifeLabLearningMapCompactProps = {
  title: string;
  mermaidCode: string;
  introMarkdown?: string | null;
};

/**
 * Learning Map section moved to the top of the note.
 * Uses the same MermaidBlock pipeline as MarkdownContent — not a second renderer.
 */
export function LifeLabLearningMapCompact({
  title,
  mermaidCode,
  introMarkdown = null,
}: LifeLabLearningMapCompactProps) {
  const [open, setOpen] = useState(false);
  const openButtonRef = useRef<HTMLButtonElement>(null);
  const labels = extractMermaidOutlineLabels(mermaidCode, { limit: 10 });

  return (
    <section
      className="space-y-3"
      data-life-lab-learning-map="section"
      aria-label={title}
    >
      <h2 className="text-base font-semibold tracking-tight text-foreground md:text-lg">
        {title}
      </h2>

      {introMarkdown ? (
        <p className="text-sm leading-relaxed text-muted" dir="auto">
          {introMarkdown}
        </p>
      ) : null}

      <MermaidBlock code={mermaidCode} />

      {labels.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5" data-life-lab-learning-map-outline="">
          {labels.map((label) => (
            <li
              key={label}
              className="max-w-full rounded-md bg-accent-cream/55 px-2 py-1 text-xs leading-snug text-foreground [overflow-wrap:anywhere]"
            >
              {label}
            </li>
          ))}
        </ul>
      ) : null}

      <button
        ref={openButtonRef}
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-11 items-center text-sm font-medium text-muted transition-colors hover:text-foreground"
        data-life-lab-learning-map-expand=""
      >
        Open full map
      </button>

      <MermaidDiagramDialog
        open={open}
        onClose={() => setOpen(false)}
        code={mermaidCode}
        returnFocusRef={openButtonRef}
        title={title}
      />
    </section>
  );
}

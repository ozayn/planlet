"use client";

import { useState } from "react";

import { useLifeLabSpeechDisclosureRegistration } from "@/components/life-lab/life-lab-speech-visibility";
import {
  buildDictionaryCandidatesCopyPrompt,
  listDictionaryCandidateTerms,
  summarizeDictionaryCandidates,
  type DictionaryStudySection,
} from "@/lib/life-lab/dictionary-candidates";

type LifeLabDictionaryCandidatesCardProps = {
  noteTitle: string;
  section: DictionaryStudySection;
  compactPreview?: boolean;
};

export function LifeLabDictionaryCandidatesCard({
  noteTitle,
  section,
  compactPreview = true,
}: LifeLabDictionaryCandidatesCardProps) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  useLifeLabSpeechDisclosureRegistration({
    markdown: `## ${section.title}\n\n${section.content}`,
    expanded: !compactPreview || expanded,
  });
  const previewItems = summarizeDictionaryCandidates(section.content);
  const candidateTerms = listDictionaryCandidateTerms(section.content);
  const copyPrompt = buildDictionaryCandidatesCopyPrompt({
    noteTitle,
    content: section.content,
  });

  async function handleCopy() {
    setCopied(false);

    try {
      await navigator.clipboard.writeText(copyPrompt);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section
      aria-labelledby="dictionary-candidates-heading"
      className="rounded-lg border border-border/60 bg-surface/80 p-3 md:p-3.5"
    >
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <h2
              id="dictionary-candidates-heading"
              className="text-sm font-semibold text-foreground"
            >
              {section.title}
            </h2>
            {compactPreview && previewItems.length > 0 ? (
              <ul className="space-y-0.5 text-xs text-muted">
                {previewItems.map((item, index) => (
                  <li key={`dictionary-preview-${index}`} className="truncate">
                    {item}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          <button
            type="button"
            onClick={handleCopy}
            className="shrink-0 rounded-full border border-border/70 px-2.5 py-1 text-[0.6875rem] font-medium text-muted transition-colors hover:border-border hover:text-foreground"
          >
            {copied ? "Copied" : "Copy prompt"}
          </button>
        </div>

        {!compactPreview ? (
          <ul className="list-disc space-y-1 ps-5 text-sm text-muted">
            {candidateTerms.map((term) => (
              <li key={term}>{term}</li>
            ))}
          </ul>
        ) : (
          <details
            className="ui-settings-details group"
            open={expanded}
            onToggle={(event) => setExpanded(event.currentTarget.open)}
          >
            <summary className="ui-settings-details-summary !py-1.5 !text-xs !normal-case !tracking-normal">
              Show candidates
            </summary>
            <ul className="ui-settings-details-body list-disc space-y-1 ps-5 text-sm text-muted">
              {candidateTerms.map((term) => (
                <li key={term}>{term}</li>
              ))}
            </ul>
          </details>
        )}

        <p className="text-xs leading-relaxed text-muted">
          To save these, ask Ava to add them to the Learning Dictionary.
        </p>

        <div
          className="life-lab-dictionary-actions hidden"
          aria-hidden="true"
          data-future-actions="add-to-dictionary,save-concept,send-to-ava"
        />
      </div>
    </section>
  );
}

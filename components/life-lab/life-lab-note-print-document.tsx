import type { ReactNode } from "react";

import {
  resolveTextDirection,
  textDirectionLang,
} from "@/lib/text-direction";

type LifeLabNotePrintDocumentProps = {
  title: string;
  subtitle?: string | null;
  dateLabel?: string | null;
  hero?: ReactNode;
  children: ReactNode;
};

/**
 * Clean article chrome for browser print / Save as PDF.
 * Reuses the same note body renderer via children — no second content parser.
 */
export function LifeLabNotePrintDocument({
  title,
  subtitle = null,
  dateLabel = null,
  hero,
  children,
}: LifeLabNotePrintDocumentProps) {
  const titleDir = resolveTextDirection(title);
  const subtitleDir = subtitle ? resolveTextDirection(subtitle) : "auto";
  const meta = [subtitle, dateLabel].filter(Boolean).join(" · ");

  return (
    <article
      className="ui-life-lab-print-document"
      data-life-lab-print-document=""
    >
      <header className="ui-life-lab-print-header">
        <p className="ui-life-lab-print-kicker">Life Lab</p>
        <h1
          className="ui-life-lab-print-title"
          dir={titleDir}
          lang={textDirectionLang(titleDir)}
        >
          {title}
        </h1>
        {meta ? (
          <p
            className="ui-life-lab-print-meta"
            dir={subtitleDir}
            lang={textDirectionLang(subtitleDir)}
          >
            {meta}
          </p>
        ) : null}
      </header>

      {hero ? <div className="ui-life-lab-print-hero">{hero}</div> : null}

      <div className="ui-life-lab-print-body ui-reading-content">{children}</div>
    </article>
  );
}

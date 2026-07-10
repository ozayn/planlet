"use client";

import { useRef, useState, type CSSProperties } from "react";
import { Maximize2 } from "lucide-react";

import { MermaidExpandDialog } from "@/components/life-lab/mermaid-expand-dialog";
import { useMermaidRender } from "@/components/life-lab/use-mermaid-render";

type MermaidBlockProps = {
  code: string;
};

export function MermaidBlock({ code }: MermaidBlockProps) {
  const { preparedSvg, failed } = useMermaidRender(code);
  const [expanded, setExpanded] = useState(false);
  const expandButtonRef = useRef<HTMLButtonElement>(null);

  if (failed) {
    return (
      <pre className="ui-mermaid-fallback">
        <code>{code}</code>
      </pre>
    );
  }

  return (
    <>
      <div
        className="ui-mermaid ui-mermaid-with-expand"
        aria-busy={!preparedSvg}
        style={
          preparedSvg?.minWidth
            ? ({ "--mermaid-min-width": `${preparedSvg.minWidth}px` } as CSSProperties)
            : undefined
        }
      >
        {preparedSvg ? (
          <>
            <button
              ref={expandButtonRef}
              type="button"
              className="ui-mermaid-expand-btn"
              aria-label="Expand diagram"
              title="Expand diagram"
              onClick={() => setExpanded(true)}
            >
              <Maximize2 className="size-4" aria-hidden="true" />
            </button>
            <div
              className="ui-mermaid-svg"
              dangerouslySetInnerHTML={{ __html: preparedSvg.html }}
            />
          </>
        ) : (
          <p className="ui-mermaid-loading">Rendering diagram…</p>
        )}
      </div>
      <MermaidExpandDialog
        open={expanded}
        onClose={() => setExpanded(false)}
        code={code}
        preparedSvg={preparedSvg}
        failed={failed}
        returnFocusRef={expandButtonRef}
      />
    </>
  );
}

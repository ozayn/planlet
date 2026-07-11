"use client";

import { useEffect, useRef, useState } from "react";
import { Maximize2 } from "lucide-react";

import { MermaidExpandDialog } from "@/components/life-lab/mermaid-expand-dialog";
import { useMermaidRender } from "@/components/life-lab/use-mermaid-render";
import { useMermaidViewport } from "@/components/life-lab/use-mermaid-viewport";

type MermaidBlockProps = {
  code: string;
};

export function MermaidBlock({ code }: MermaidBlockProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const expandButtonRef = useRef<HTMLButtonElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [svgReady, setSvgReady] = useState(false);
  const { sizeProfile, scrollable, isMobile } = useMermaidViewport(containerRef, {
    variant: "inline",
    contentReady: svgReady,
  });
  const { preparedSvg, failed } = useMermaidRender(code, {
    sizeProfile,
    renderKey: sizeProfile,
  });

  useEffect(() => {
    setSvgReady(Boolean(preparedSvg));
  }, [preparedSvg]);

  if (failed) {
    return (
      <pre className="ui-mermaid-fallback">
        <code>{code}</code>
      </pre>
    );
  }

  function openViewer(): void {
    setExpanded(true);
  }

  return (
    <>
      <div
        ref={containerRef}
        className="ui-mermaid ui-mermaid-responsive ui-mermaid-with-expand"
        data-profile={sizeProfile}
        aria-busy={!preparedSvg}
      >
        {preparedSvg ? (
          <>
            <div className="ui-mermaid-toolbar">
              {scrollable ? (
                <p className="ui-mermaid-affordance ui-mermaid-affordance-scroll">
                  Scroll sideways
                </p>
              ) : null}
              <button
                ref={expandButtonRef}
                type="button"
                className="ui-mermaid-expand-btn"
                aria-label="Expand diagram"
                title="Expand diagram"
                onClick={openViewer}
              >
                <Maximize2 className="size-4" aria-hidden="true" />
              </button>
            </div>
            <div
              className={`ui-mermaid-scroll${isMobile ? " ui-mermaid-scroll-tappable" : ""}`}
              onClick={isMobile ? openViewer : undefined}
              onKeyDown={
                isMobile
                  ? (event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        openViewer();
                      }
                    }
                  : undefined
              }
              role={isMobile ? "button" : undefined}
              tabIndex={isMobile ? 0 : undefined}
              aria-label={isMobile ? "Open diagram viewer" : undefined}
            >
              <div
                className="ui-mermaid-svg"
                dangerouslySetInnerHTML={{ __html: preparedSvg.html }}
              />
            </div>
          </>
        ) : (
          <p className="ui-mermaid-loading">Rendering diagram…</p>
        )}
      </div>
      <MermaidExpandDialog
        open={expanded}
        onClose={() => setExpanded(false)}
        code={code}
        returnFocusRef={expandButtonRef}
      />
    </>
  );
}

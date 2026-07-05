"use client";

import { useEffect, useId, useState } from "react";

type MermaidBlockProps = {
  code: string;
};

let mermaidInitialized = false;

async function loadMermaid() {
  const mermaid = (await import("mermaid")).default;

  if (!mermaidInitialized) {
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: "strict",
    });
    mermaidInitialized = true;
  }

  return mermaid;
}

function mermaidElementId(reactId: string): string {
  return `mermaid-${reactId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
}

export function MermaidBlock({ code }: MermaidBlockProps) {
  const reactId = useId();
  const elementId = mermaidElementId(reactId);
  const [svg, setSvg] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function renderDiagram() {
      setFailed(false);
      setSvg(null);

      try {
        const mermaid = await loadMermaid();
        const { svg: renderedSvg } = await mermaid.render(
          elementId,
          code.trim(),
        );

        if (!cancelled) {
          setSvg(renderedSvg);
        }
      } catch {
        if (!cancelled) {
          setFailed(true);
        }
      }
    }

    void renderDiagram();

    return () => {
      cancelled = true;
    };
  }, [code, elementId]);

  if (failed) {
    return (
      <pre className="ui-mermaid-fallback">
        <code>{code}</code>
      </pre>
    );
  }

  return (
    <div className="ui-mermaid-block" aria-busy={!svg}>
      {svg ? (
        <div
          className="ui-mermaid-svg"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      ) : (
        <p className="ui-mermaid-loading">Rendering diagram…</p>
      )}
    </div>
  );
}

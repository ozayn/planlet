"use client";

import { useEffect, useId, useState, type CSSProperties } from "react";

import { prepareMermaidSvg, type PreparedMermaidSvg } from "@/lib/life-lab/mermaid-svg";

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
      themeVariables: {
        fontSize: "16px",
        fontFamily: "var(--font-sans, system-ui, sans-serif)",
      },
      flowchart: {
        padding: 12,
        nodeSpacing: 50,
        rankSpacing: 60,
        diagramPadding: 12,
      },
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
  const [preparedSvg, setPreparedSvg] = useState<PreparedMermaidSvg | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function renderDiagram() {
      setFailed(false);
      setPreparedSvg(null);

      try {
        const mermaid = await loadMermaid();
        const { svg: renderedSvg } = await mermaid.render(
          elementId,
          code.trim(),
        );

        if (!cancelled) {
          setPreparedSvg(prepareMermaidSvg(renderedSvg));
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
    <div
      className="ui-mermaid"
      aria-busy={!preparedSvg}
      style={
        preparedSvg?.minWidth
          ? ({ "--mermaid-min-width": `${preparedSvg.minWidth}px` } as CSSProperties)
          : undefined
      }
    >
      {preparedSvg ? (
        <div
          className="ui-mermaid-svg"
          dangerouslySetInnerHTML={{ __html: preparedSvg.html }}
        />
      ) : (
        <p className="ui-mermaid-loading">Rendering diagram…</p>
      )}
    </div>
  );
}

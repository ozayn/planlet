"use client";

import { useEffect, useId, useState, type CSSProperties } from "react";

import { useTheme } from "@/components/theme-provider";
import {
  getMermaidInitializeOptions,
  getMermaidThemeMode,
  type MermaidThemeMode,
} from "@/lib/life-lab/mermaid-config";
import { isLifeLabDevToolsEnabled } from "@/lib/life-lab/dev";
import {
  mermaidSvgHasVisibleContent,
  prepareMermaidSvg,
  type PreparedMermaidSvg,
} from "@/lib/life-lab/mermaid-svg";

type MermaidBlockProps = {
  code: string;
};

let initializedTheme: MermaidThemeMode | null = null;

async function loadMermaid(theme: MermaidThemeMode) {
  const mermaid = (await import("mermaid")).default;

  if (initializedTheme !== theme) {
    mermaid.initialize(getMermaidInitializeOptions(theme));
    initializedTheme = theme;
  }

  return mermaid;
}

function mermaidElementId(reactId: string): string {
  return `mermaid-${reactId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
}

export function MermaidBlock({ code }: MermaidBlockProps) {
  const { resolvedTheme } = useTheme();
  const themeMode = getMermaidThemeMode(resolvedTheme);
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
        const mermaid = await loadMermaid(themeMode);
        const { svg: renderedSvg } = await mermaid.render(
          elementId,
          code.trim(),
        );

        if (cancelled) {
          return;
        }

        const prepared = prepareMermaidSvg(renderedSvg);

        if (
          !mermaidSvgHasVisibleContent(prepared.html) &&
          isLifeLabDevToolsEnabled()
        ) {
          setFailed(true);
          return;
        }

        setPreparedSvg(prepared);
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
  }, [code, elementId, themeMode]);

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

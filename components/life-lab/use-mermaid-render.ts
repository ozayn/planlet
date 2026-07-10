"use client";

import { useEffect, useId, useState } from "react";

import { useTheme } from "@/components/theme-provider";
import {
  getMermaidInitializeOptions,
  getMermaidLabelWrapOptions,
  getMermaidThemeMode,
  type MermaidRenderVariant,
  type MermaidThemeMode,
} from "@/lib/life-lab/mermaid-config";
import { isLifeLabDevToolsEnabled } from "@/lib/life-lab/dev";
import { prepareMermaidSourceForRender } from "@/lib/life-lab/mermaid-label-wrap";
import {
  mermaidSvgHasVisibleContent,
  prepareMermaidSvg,
  type PreparedMermaidSvg,
} from "@/lib/life-lab/mermaid-svg";

type UseMermaidRenderOptions = {
  variant?: MermaidRenderVariant;
  enabled?: boolean;
};

let initializedConfigKey: string | null = null;

async function loadMermaid(
  theme: MermaidThemeMode,
  variant: MermaidRenderVariant,
) {
  const mermaid = (await import("mermaid")).default;
  const configKey = `${theme}:${variant}`;

  if (initializedConfigKey !== configKey) {
    mermaid.initialize(getMermaidInitializeOptions(theme, variant));
    initializedConfigKey = configKey;
  }

  return mermaid;
}

function mermaidElementId(reactId: string, variant: MermaidRenderVariant): string {
  const suffix = variant === "dialog" ? "-dialog" : "";

  return `mermaid-${reactId.replace(/[^a-zA-Z0-9_-]/g, "")}${suffix}`;
}

export function useMermaidRender(
  code: string,
  options: UseMermaidRenderOptions = {},
) {
  const { variant = "inline", enabled = true } = options;
  const { resolvedTheme } = useTheme();
  const themeMode = getMermaidThemeMode(resolvedTheme);
  const reactId = useId();
  const elementId = mermaidElementId(reactId, variant);
  const [preparedSvg, setPreparedSvg] = useState<PreparedMermaidSvg | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let cancelled = false;

    async function renderDiagram() {
      setFailed(false);
      setPreparedSvg(null);

      try {
        const mermaid = await loadMermaid(themeMode, variant);
        const renderSource = prepareMermaidSourceForRender(
          code,
          getMermaidLabelWrapOptions(variant),
        );
        const { svg: renderedSvg } = await mermaid.render(
          elementId,
          renderSource,
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
  }, [code, elementId, enabled, themeMode, variant]);

  return { preparedSvg, failed };
}

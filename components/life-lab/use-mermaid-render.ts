"use client";

import { useEffect, useId, useState } from "react";

import { useTheme } from "@/components/theme-provider";
import {
  getMermaidInitializeOptions,
  getMermaidLabelWrapOptions,
  getMermaidThemeMode,
} from "@/lib/life-lab/mermaid-config";
import { isLifeLabDevToolsEnabled } from "@/lib/life-lab/dev";
import { prepareMermaidSourceForRender } from "@/lib/life-lab/mermaid-label-wrap";
import {
  mermaidSvgHasVisibleContent,
  prepareMermaidSvg,
  type PreparedMermaidSvg,
} from "@/lib/life-lab/mermaid-svg";
import type { MermaidSizeProfile } from "@/lib/life-lab/mermaid-viewport";

type UseMermaidRenderOptions = {
  sizeProfile?: MermaidSizeProfile;
  enabled?: boolean;
  renderKey?: string;
};

let initializedConfigKey: string | null = null;

async function loadMermaid(
  theme: ReturnType<typeof getMermaidThemeMode>,
  sizeProfile: MermaidSizeProfile,
) {
  const mermaid = (await import("mermaid")).default;
  const configKey = `${theme}:${sizeProfile}`;

  if (initializedConfigKey !== configKey) {
    mermaid.initialize(getMermaidInitializeOptions(theme, sizeProfile));
    initializedConfigKey = configKey;
  }

  return mermaid;
}

function mermaidElementId(reactId: string, sizeProfile: MermaidSizeProfile): string {
  return `mermaid-${reactId.replace(/[^a-zA-Z0-9_-]/g, "")}-${sizeProfile}`;
}

export function useMermaidRender(
  code: string,
  options: UseMermaidRenderOptions = {},
) {
  const { sizeProfile = "comfortable", enabled = true, renderKey = "" } = options;
  const { resolvedTheme } = useTheme();
  const themeMode = getMermaidThemeMode(resolvedTheme);
  const reactId = useId();
  const elementId = mermaidElementId(reactId, sizeProfile);
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
        const mermaid = await loadMermaid(themeMode, sizeProfile);
        const renderSource = prepareMermaidSourceForRender(
          code,
          getMermaidLabelWrapOptions(sizeProfile),
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
  }, [code, elementId, enabled, renderKey, sizeProfile, themeMode]);

  return { preparedSvg, failed };
}

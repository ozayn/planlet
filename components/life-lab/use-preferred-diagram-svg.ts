"use client";

import { useEffect, useState } from "react";

import {
  prepareMermaidSvg,
  sanitizeGeneratedMermaidSvg,
  type PreparedMermaidSvg,
} from "@/lib/life-lab/mermaid-svg";

export function usePreferredDiagramSvg(url: string | undefined) {
  const [preparedSvg, setPreparedSvg] = useState<PreparedMermaidSvg | null>(null);
  const [checked, setChecked] = useState(!url);

  useEffect(() => {
    if (!url) {
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        const response = await fetch(url!);

        if (!response.ok) {
          return;
        }

        const sanitized = sanitizeGeneratedMermaidSvg(await response.text());

        if (!cancelled && sanitized) {
          setPreparedSvg(prepareMermaidSvg(sanitized));
        }
      } finally {
        if (!cancelled) {
          setChecked(true);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [url]);

  return { preferredSvg: preparedSvg, preferredSvgChecked: checked };
}

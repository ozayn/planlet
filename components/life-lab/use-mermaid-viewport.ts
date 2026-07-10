"use client";

import { useEffect, useState, type RefObject } from "react";

import {
  isMermaidScrollHintVisible,
  resolveMermaidSizeProfile,
  type MermaidSizeProfile,
} from "@/lib/life-lab/mermaid-viewport";
import { useMediaQuery } from "@/lib/use-media-query";

type UseMermaidViewportOptions = {
  variant?: "inline" | "dialog";
  enabled?: boolean;
  contentReady?: boolean;
};

export function useMermaidViewport(
  containerRef: RefObject<HTMLElement | null>,
  options: UseMermaidViewportOptions = {},
) {
  const { variant = "inline", enabled = true, contentReady = false } = options;
  const isMobile = useMediaQuery("(max-width: 767px)");
  const isMobileLandscape = useMediaQuery(
    "(max-width: 900px) and (orientation: landscape)",
  );
  const [sizeProfile, setSizeProfile] = useState<MermaidSizeProfile>(() =>
    variant === "dialog" ? "dialog" : "comfortable",
  );
  const [scrollable, setScrollable] = useState(false);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const node = containerRef.current;

    if (!node) {
      return;
    }

    const measure = () => {
      const width = node.clientWidth || window.innerWidth;
      const landscape = window.matchMedia(
        "(max-width: 900px) and (orientation: landscape)",
      ).matches;

      setSizeProfile(
        resolveMermaidSizeProfile({
          containerWidth: width,
          variant,
          isLandscape: landscape,
        }),
      );

      const scrollSurface = node.querySelector<HTMLElement>(".ui-mermaid-scroll");
      const svg = node.querySelector("svg");

      if (scrollSurface && svg) {
        setScrollable(
          isMermaidScrollHintVisible({
            containerWidth: scrollSurface.clientWidth,
            contentWidth: svg.getBoundingClientRect().width,
          }),
        );
      } else {
        setScrollable(false);
      }
    };

    measure();

    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(node);

    const landscapeQuery = window.matchMedia(
      "(max-width: 900px) and (orientation: landscape)",
    );
    landscapeQuery.addEventListener("change", measure);
    window.addEventListener("orientationchange", measure);
    window.addEventListener("resize", measure);

    return () => {
      resizeObserver.disconnect();
      landscapeQuery.removeEventListener("change", measure);
      window.removeEventListener("orientationchange", measure);
      window.removeEventListener("resize", measure);
    };
  }, [containerRef, contentReady, enabled, variant]);

  return {
    sizeProfile,
    scrollable,
    isMobile,
    isMobileLandscape,
  };
}

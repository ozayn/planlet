"use client";

import { useLayoutEffect, useState } from "react";

export function useDensityTokenNumber(
  token: string,
  fallback: number,
): number {
  const [value, setValue] = useState(fallback);

  useLayoutEffect(() => {
    function readValue() {
      const raw = getComputedStyle(document.documentElement)
        .getPropertyValue(token)
        .trim();
      const parsed = Number.parseFloat(raw);
      setValue(Number.isFinite(parsed) ? parsed : fallback);
    }

    readValue();

    const observer = new MutationObserver(readValue);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-reading-density"],
    });

    return () => observer.disconnect();
  }, [token, fallback]);

  return value;
}

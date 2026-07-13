"use client";

import { useLayoutEffect } from "react";

import type { ReadingDensityValue } from "@/lib/reading-density";

type ReadingDensityApplierProps = {
  density: ReadingDensityValue;
};

export function ReadingDensityApplier({ density }: ReadingDensityApplierProps) {
  useLayoutEffect(() => {
    document.documentElement.dataset.readingDensity = density;
  }, [density]);

  return null;
}

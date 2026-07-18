"use client";

import { createContext, useContext, type ReactNode } from "react";

import type { DiagramAssetUrls } from "@/lib/life-lab/diagram-export";
import {
  diagramAssetNameFromSource,
  type DiagramAssetBinding,
} from "@/lib/life-lab/diagram-assets";

type LifeLabDiagramAssetContextValue = {
  sectionId: string;
  slug: string;
  bindings: DiagramAssetBinding[];
};

const LifeLabDiagramAssetContext =
  createContext<LifeLabDiagramAssetContextValue | null>(null);

export function LifeLabDiagramAssetProvider({
  sectionId,
  slug,
  bindings,
  children,
}: LifeLabDiagramAssetContextValue & { children: ReactNode }) {
  return (
    <LifeLabDiagramAssetContext.Provider value={{ sectionId, slug, bindings }}>
      {children}
    </LifeLabDiagramAssetContext.Provider>
  );
}

export function useLifeLabDiagramAssetUrls(
  source: string,
  fallbackAssetName = "diagram",
): DiagramAssetUrls {
  const context = useContext(LifeLabDiagramAssetContext);

  if (!context) {
    return {};
  }

  const normalizedSource = source.trim();
  const assetName =
    diagramAssetNameFromSource(normalizedSource) ??
    context.bindings.find((binding) => binding.source === normalizedSource)
      ?.assetName ??
    fallbackAssetName;
  const base = new URLSearchParams({
    section: context.sectionId,
    slug: context.slug,
    name: assetName,
  });
  const url = (format: "png" | "svg" | "mmd") => {
    const params = new URLSearchParams(base);
    params.set("format", format);
    return `/api/life-lab/diagram-asset?${params.toString()}`;
  };

  return {
    png: url("png"),
    svg: url("svg"),
    source: url("mmd"),
  };
}

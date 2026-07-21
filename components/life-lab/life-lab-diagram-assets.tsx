"use client";

import { createContext, useContext, type ReactNode } from "react";

import type { DiagramAssetUrls } from "@/lib/life-lab/diagram-export";
import type { DiagramAssetBinding } from "@/lib/life-lab/diagram-assets";

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

export type LifeLabDiagramAssetResolution = {
  diagramId: string | null;
  savedAssetName: string | null;
  savedAssetUrls: DiagramAssetUrls;
  exportSource: "saved" | "browser" | "none";
};

export function useLifeLabDiagramAsset(
  source: string,
): LifeLabDiagramAssetResolution {
  const context = useContext(LifeLabDiagramAssetContext);
  const normalizedSource = source.trim();

  if (!context || !normalizedSource) {
    return {
      diagramId: null,
      savedAssetName: null,
      savedAssetUrls: {},
      exportSource: normalizedSource ? "browser" : "none",
    };
  }

  const binding = context.bindings.find(
    (candidate) => candidate.source === normalizedSource,
  );
  const assetName = binding?.savedAssetName ?? null;

  if (!assetName) {
    return {
      diagramId: binding?.diagramId ?? null,
      savedAssetName: null,
      savedAssetUrls: {},
      exportSource: "browser",
    };
  }

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
    diagramId: binding?.diagramId ?? assetName,
    savedAssetName: assetName,
    savedAssetUrls: {
      png: url("png"),
      svg: url("svg"),
      source: url("mmd"),
    },
    exportSource: "saved",
  };
}

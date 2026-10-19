"use client";

import { createContext, useContext, type ReactNode } from "react";

import type { SerializedLifeArea } from "@/lib/life-areas/types";

const LifeAreaCatalogContext = createContext<SerializedLifeArea[]>([]);

export function LifeAreaCatalogProvider({
  areas,
  children,
}: {
  areas: SerializedLifeArea[];
  children: ReactNode;
}) {
  return (
    <LifeAreaCatalogContext.Provider value={areas}>
      {children}
    </LifeAreaCatalogContext.Provider>
  );
}

export function useLifeAreaCatalog(): SerializedLifeArea[] {
  return useContext(LifeAreaCatalogContext);
}

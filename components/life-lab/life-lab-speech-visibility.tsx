"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { LifeLabSpeechDisclosure } from "@/lib/life-lab/speech-renderer";

type LifeLabSpeechVisibilityContextValue = {
  disclosures: LifeLabSpeechDisclosure[];
  registerDisclosure: (disclosure: LifeLabSpeechDisclosure) => void;
  unregisterDisclosure: (id: string) => void;
};

const LifeLabSpeechVisibilityContext =
  createContext<LifeLabSpeechVisibilityContextValue | null>(null);

export function LifeLabSpeechVisibilityProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [disclosuresById, setDisclosuresById] = useState<
    Map<string, LifeLabSpeechDisclosure>
  >(() => new Map());

  const registerDisclosure = useCallback(
    (disclosure: LifeLabSpeechDisclosure) => {
      setDisclosuresById((current) => {
        const existing = current.get(disclosure.id);

        if (
          existing?.markdown === disclosure.markdown &&
          existing.expanded === disclosure.expanded
        ) {
          return current;
        }

        const next = new Map(current);
        next.set(disclosure.id, disclosure);
        return next;
      });
    },
    [],
  );

  const unregisterDisclosure = useCallback((id: string) => {
    setDisclosuresById((current) => {
      if (!current.has(id)) {
        return current;
      }

      const next = new Map(current);
      next.delete(id);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      disclosures: [...disclosuresById.values()],
      registerDisclosure,
      unregisterDisclosure,
    }),
    [disclosuresById, registerDisclosure, unregisterDisclosure],
  );

  return (
    <LifeLabSpeechVisibilityContext.Provider value={value}>
      {children}
    </LifeLabSpeechVisibilityContext.Provider>
  );
}

export function useLifeLabSpeechDisclosures(): LifeLabSpeechDisclosure[] {
  return useContext(LifeLabSpeechVisibilityContext)?.disclosures ?? [];
}

export function useLifeLabSpeechDisclosureRegistration(input: {
  markdown: string;
  expanded: boolean;
}): string {
  const id = useId();
  const context = useContext(LifeLabSpeechVisibilityContext);
  const registerDisclosure = context?.registerDisclosure;
  const unregisterDisclosure = context?.unregisterDisclosure;

  useEffect(() => {
    if (!registerDisclosure || !unregisterDisclosure || !input.markdown.trim()) {
      return;
    }

    registerDisclosure({
      id,
      markdown: input.markdown,
      expanded: input.expanded,
    });

    return () => unregisterDisclosure(id);
  }, [
    id,
    input.expanded,
    input.markdown,
    registerDisclosure,
    unregisterDisclosure,
  ]);

  return id;
}

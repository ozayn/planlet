"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import {
  contentLanguageLabel,
  LIFE_LAB_READING_LANGUAGE_COOKIE,
  LIFE_LAB_READING_LANGUAGE_STORAGE_KEY,
  type LifeLabContentLanguage,
  type TranslationSibling,
  noteHrefForLanguage,
} from "@/lib/life-lab/bilingual";
import { passwordManagerSafeControlProps } from "@/lib/password-manager-ignore";

type LifeLabLanguageSwitchProps = {
  sectionId: string;
  currentLanguage: LifeLabContentLanguage;
  siblings: TranslationSibling[];
  view?: string | null;
  className?: string;
};

function persistReadingLanguage(language: LifeLabContentLanguage): void {
  try {
    window.localStorage.setItem(LIFE_LAB_READING_LANGUAGE_STORAGE_KEY, language);
  } catch {
    // Ignore private-mode storage failures.
  }

  const maxAge = 60 * 60 * 24 * 365;
  document.cookie = `${LIFE_LAB_READING_LANGUAGE_COOKIE}=${language}; path=/; max-age=${maxAge}; samesite=lax`;
}

export function LifeLabLanguageSwitch({
  sectionId,
  currentLanguage,
  siblings,
  view = null,
  className = "",
}: LifeLabLanguageSwitchProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (siblings.length < 2) {
    return null;
  }

  const ordered = (["en", "fa"] as const)
    .map((language) => siblings.find((sibling) => sibling.language === language))
    .filter((sibling): sibling is TranslationSibling => Boolean(sibling));

  if (ordered.length < 2) {
    return null;
  }

  return (
    <div
      role="group"
      aria-label="Note language"
      data-life-lab-language-switch=""
      className={`inline-flex max-w-full items-center rounded-lg border border-border-soft bg-background p-0.5 ${className}`.trim()}
    >
      {ordered.map((sibling) => {
        const selected = sibling.language === currentLanguage;
        const label = contentLanguageLabel(sibling.language);

        return (
          <button
            key={sibling.language}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={pending || selected}
            className={`min-h-9 min-w-11 rounded-md px-2.5 text-[length:var(--density-text-xs)] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-subtle)] disabled:opacity-100 ${
              selected
                ? "bg-accent-cream text-foreground"
                : "text-muted hover:text-foreground"
            }`}
            onClick={() => {
              if (selected) {
                return;
              }
              persistReadingLanguage(sibling.language);
              const href = noteHrefForLanguage({
                sectionId,
                sibling,
                view,
              });
              startTransition(() => {
                router.replace(href, { scroll: false });
              });
            }}
            {...passwordManagerSafeControlProps}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

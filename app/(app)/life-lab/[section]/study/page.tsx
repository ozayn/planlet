import { notFound } from "next/navigation";

import { auth } from "@/auth";
import { LifeLabFlashcardStudy } from "@/components/life-lab/life-lab-flashcard-study";
import { LifeLabReadingModeProvider } from "@/components/life-lab/life-lab-reading-mode";
import { LifeLabStatusPanel } from "@/components/life-lab/life-lab-status-panel";
import { getLifeLabStudyData } from "@/lib/life-lab";
import { enrichFlashcardsWithLearningDictionary } from "@/lib/learning-dictionary/data";
import type { LifeLabFilterKey, LifeLabNoteFilters } from "@/lib/life-lab/filters";
import { isAdminRole } from "@/lib/auth-roles";
import { canAccessLifeLabPage } from "@/lib/roles";

const FILTER_KEYS: LifeLabFilterKey[] = [
  "subfolder",
  "tag",
  "topic",
  "source",
  "channel",
  "playlist",
  "person",
  "place",
];

type LifeLabSectionStudyPageProps = {
  params: Promise<{ section: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function readStudyFilters(
  searchParams: Record<string, string | string[] | undefined>,
): LifeLabNoteFilters {
  const filters: LifeLabNoteFilters = {};

  for (const key of FILTER_KEYS) {
    const value = searchParams[key];
    const normalized = Array.isArray(value) ? value[0] : value;

    if (normalized?.trim()) {
      filters[key] = normalized.trim();
    }
  }

  return filters;
}

export default async function LifeLabSectionStudyPage({
  params,
  searchParams,
}: LifeLabSectionStudyPageProps) {
  const session = await auth();

  if (!session?.user?.id || !canAccessLifeLabPage(session.user)) {
    notFound();
  }

  const { section } = await params;
  const resolvedSearchParams = await searchParams;
  const filters = readStudyFilters(resolvedSearchParams);
  const { availability, sectionId, sectionLabel, cards } =
    await getLifeLabStudyData(section, filters);

  if (!sectionId || !sectionLabel) {
    notFound();
  }

  const isAdmin = isAdminRole(session.user.role);
  const enrichedCards = await enrichFlashcardsWithLearningDictionary(cards);
  const backQuery = new URLSearchParams();

  for (const [key, value] of Object.entries(resolvedSearchParams)) {
    if (typeof value === "string" && value.trim()) {
      backQuery.set(key, value);
    }
  }

  const backHref = backQuery.toString()
    ? `/life-lab/${sectionId}?${backQuery.toString()}`
    : `/life-lab/${sectionId}`;

  return (
    <section
      className="ui-life-lab-surface ui-page-stack space-y-4"
      data-flashcard-route="deck-detail"
    >
      {availability.status !== "ready" ? (
        <LifeLabStatusPanel availability={availability} isAdmin={isAdmin} />
      ) : (
        <LifeLabReadingModeProvider>
          <LifeLabFlashcardStudy
            cards={cards}
            enrichedCards={enrichedCards}
            backHref={backHref}
            title={sectionLabel}
          />
        </LifeLabReadingModeProvider>
      )}
    </section>
  );
}

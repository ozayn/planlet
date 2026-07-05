import Link from "next/link";
import { notFound } from "next/navigation";

import { auth } from "@/auth";
import { LifeLabFlashcardStudy } from "@/components/life-lab/life-lab-flashcard-study";
import { LifeLabStatusPanel } from "@/components/life-lab/life-lab-status-panel";
import { PageHeader } from "@/components/page-header";
import { getLifeLabStudyData } from "@/lib/life-lab";
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
    <section className="ui-page-stack space-y-6">
      <PageHeader
        title="Study flashcards"
        subtitle={sectionLabel}
        action={
          <Link
            href={backHref}
            className="text-sm font-medium text-muted transition-colors hover:text-foreground"
          >
            Back to section
          </Link>
        }
      />

      {availability.status !== "ready" ? (
        <LifeLabStatusPanel availability={availability} isAdmin={isAdmin} />
      ) : (
        <LifeLabFlashcardStudy
          cards={cards}
          backHref={backHref}
          title={sectionLabel}
          subtitle={`${cards.length} card${cards.length === 1 ? "" : "s"}`}
        />
      )}
    </section>
  );
}

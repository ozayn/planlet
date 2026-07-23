import Link from "next/link";
import { notFound } from "next/navigation";

import { auth } from "@/auth";
import { FlashcardExplore } from "@/components/life-lab/flashcard-explore";
import { LifeLabReadingModeProvider } from "@/components/life-lab/life-lab-reading-mode";
import { LifeLabStatusPanel } from "@/components/life-lab/life-lab-status-panel";
import { PageHeader } from "@/components/page-header";
import { getLifeLabFlashcardDeckBySlug } from "@/lib/life-lab";
import { enrichFlashcardsWithLearningDictionary } from "@/lib/learning-dictionary/data";
import { isLifeLabDevToolsEnabled } from "@/lib/life-lab/dev";
import { isAdminRole } from "@/lib/auth-roles";
import { canAccessLifeLabPage } from "@/lib/roles";

type LifeLabFlashcardDeckPageProps = {
  params: Promise<{ section: string; slug: string }>;
};

/**
 * Dedicated deck explore for `/life-lab/flashcards/[deckSlug]`.
 * Mounted from the shared [section]/[slug] page when section is flashcards.
 */
export async function LifeLabFlashcardDeckExplorePage({
  params,
}: LifeLabFlashcardDeckPageProps) {
  const session = await auth();

  if (!session?.user?.id || !canAccessLifeLabPage(session.user)) {
    notFound();
  }

  const { section, slug } = await params;

  if (section !== "flashcards") {
    notFound();
  }

  const { availability, deck, unavailableReason } =
    await getLifeLabFlashcardDeckBySlug(slug);
  const isAdmin = isAdminRole(session.user.role);
  const showDevTools = isAdmin && isLifeLabDevToolsEnabled();
  const linkedCards =
    deck && deck.cardCount > 0
      ? await enrichFlashcardsWithLearningDictionary(deck.cards)
      : [];

  return (
    <section className="ui-life-lab-surface ui-page-stack space-y-6">
      <PageHeader
        title="Flashcards"
        subtitle={deck?.title ?? "Deck"}
        action={
          <Link
            href="/life-lab/flashcards"
            className="text-sm font-medium text-muted transition-colors hover:text-foreground"
          >
            All decks
          </Link>
        }
      />

      {availability.status !== "ready" ? (
        <LifeLabStatusPanel availability={availability} isAdmin={isAdmin} />
      ) : !deck ? (
        <p className="text-sm text-muted">
          {unavailableReason === "missing"
            ? "This flashcard deck is unavailable."
            : "This deck could not be found."}
        </p>
      ) : deck.cardCount === 0 ? (
        <div className="space-y-2">
          <p className="text-sm text-muted">
            {unavailableReason === "parse"
              ? "This deck could not be parsed."
              : "This flashcard deck is unavailable."}
          </p>
          {showDevTools && deck.parseIssues.length > 0 ? (
            <ul className="space-y-1 text-xs text-muted">
              {deck.parseIssues.map((issue) => (
                <li key={`${issue.line}-${issue.message}`}>
                  Line {issue.line}: {issue.message}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : (
        <LifeLabReadingModeProvider metadata={undefined}>
          <FlashcardExplore
            deck={{
              id: deck.id,
              title: deck.title,
              cards: linkedCards,
              sourceNoteHref: deck.sourceNoteHref,
              sourceNoteTitle: deck.sourceNoteTitle,
              sourceSectionId: deck.sourceSectionId,
              category: deck.category,
              parseIssues: deck.parseIssues,
              exportHeaders: {
                title: deck.title,
                category: deck.category ?? undefined,
                source: deck.sourceLabel ?? undefined,
                language: deck.language,
                tags: deck.tags,
              },
            }}
            backHref="/life-lab/flashcards"
            developerMode={showDevTools}
          />
        </LifeLabReadingModeProvider>
      )}
    </section>
  );
}

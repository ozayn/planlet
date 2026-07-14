import { BookMarked } from "lucide-react";

export function LearningDictionaryEmpty() {
  return (
    <div className="rounded-xl border border-dashed border-border/70 px-4 py-12 text-center">
      <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-accent-cream/50 text-muted">
        <BookMarked className="h-5 w-5" aria-hidden="true" />
      </div>
      <p className="text-sm font-medium text-foreground">
        No Learning Dictionary entries yet.
      </p>
      <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
        When Ava saves phrases, concepts, people, and other reusable terms under
        Life Lab, they will appear here for browsing and review.
      </p>
    </div>
  );
}

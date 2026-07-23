export default function LifeLabNoteLoading() {
  return (
    <section
      className="ui-life-lab-surface ui-page-stack space-y-4 md:space-y-6"
      aria-busy="true"
      aria-label="Loading note"
      data-life-lab-note-loading=""
    >
      <div className="space-y-3 md:space-y-4">
        <div className="h-4 w-40 animate-pulse rounded bg-accent-cream/70" />
        <div className="space-y-2">
          <div className="h-7 w-[min(100%,28rem)] animate-pulse rounded bg-accent-cream/80" />
          <div className="h-3.5 w-[min(100%,18rem)] animate-pulse rounded bg-accent-cream/60" />
        </div>
        <div className="mx-auto aspect-video w-full max-w-3xl animate-pulse rounded-xl bg-accent-cream/50" />
        <div className="flex gap-3">
          <div className="h-8 w-20 animate-pulse rounded bg-accent-cream/60" />
          <div className="h-8 w-24 animate-pulse rounded bg-accent-cream/50" />
          <div className="h-8 w-20 animate-pulse rounded bg-accent-cream/50" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-24 animate-pulse rounded-full bg-accent-cream/70" />
          <div className="h-9 w-9 animate-pulse rounded-full bg-accent-cream/50" />
        </div>
      </div>

      <div className="ui-card-padded space-y-3">
        <div className="h-4 w-full animate-pulse rounded bg-accent-cream/50" />
        <div className="h-4 w-[92%] animate-pulse rounded bg-accent-cream/45" />
        <div className="h-4 w-[88%] animate-pulse rounded bg-accent-cream/40" />
        <div className="h-4 w-[70%] animate-pulse rounded bg-accent-cream/35" />
      </div>
    </section>
  );
}

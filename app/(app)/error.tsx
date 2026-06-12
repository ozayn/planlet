"use client";

type AppErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function AppError({ reset }: AppErrorProps) {
  return (
    <section className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center gap-4 px-5 py-16 text-center">
      <div className="space-y-2">
        <h1 className="text-lg font-semibold text-foreground">
          This page couldn&apos;t load
        </h1>
        <p className="text-sm text-muted">
          Reload to try again, or go back.
        </p>
        <p className="text-xs text-muted-light">
          If Planlet was open for a while, reload the page before adding new
          items.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="ui-btn-secondary ui-btn-compact min-h-10 px-4"
        >
          Reload
        </button>
        <button
          type="button"
          onClick={() => reset()}
          className="ui-btn-secondary ui-btn-compact min-h-10 px-4"
        >
          Try again
        </button>
        <button
          type="button"
          onClick={() => window.history.back()}
          className="text-sm font-medium text-muted underline underline-offset-2 hover:text-foreground"
        >
          Back
        </button>
      </div>
    </section>
  );
}

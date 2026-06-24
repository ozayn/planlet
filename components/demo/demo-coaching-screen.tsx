"use client";

import { motion } from "framer-motion";

import { DEMO_COACHING_DATA } from "@/lib/demo/demo-data";

type DemoCoachingScreenProps = {
  animate?: boolean;
};

export function DemoCoachingScreen({ animate = true }: DemoCoachingScreenProps) {
  const data = DEMO_COACHING_DATA;
  const ContentWrapper = animate ? motion.div : "div";
  const contentProps = animate
    ? {
        initial: { opacity: 0, y: 6 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const },
      }
    : {};

  return (
    <div className="demo-phone-screen flex h-full flex-col overflow-y-auto overscroll-contain px-3 pb-2 pt-0.5">
      <header className="mb-3 shrink-0">
        <h1 className="text-[1.125rem] font-semibold tracking-tight text-foreground">
          {data.pageTitle}
        </h1>
        <p className="mt-0.5 text-[10px] leading-relaxed text-muted">
          {data.pageSubtitle}
        </p>
      </header>

      <ContentWrapper className="space-y-3" {...contentProps}>
        <section className="rounded-xl border border-border-soft">
          <div className="space-y-2 px-3 py-3">
            <h2 className="text-[11px] font-medium text-foreground">
              Reflection lens
            </h2>
            <p className="text-[10px] leading-relaxed text-muted">
              {data.lensSummary}
            </p>
            <ul
              className="flex flex-wrap gap-1"
              aria-label="Selected perspectives"
            >
              {data.influences.map((name) => (
                <li
                  key={name}
                  className="rounded-full bg-accent-cream/55 px-2 py-0.5 text-[9px] text-foreground/90"
                >
                  {name}
                </li>
              ))}
            </ul>
            <p className="text-[9px] text-muted-light">
              <span className="tabular-nums">{data.influenceCount}</span>{" "}
              perspectives selected
            </p>
          </div>
        </section>

        <section className="space-y-3" aria-live="polite">
          <div className="space-y-3 border-s-2 border-border-soft ps-3">
            <p className="text-[11px] font-medium text-foreground">
              Teacher feedback
            </p>

            <div className="space-y-1.5">
              <h3 className="text-[9px] font-medium uppercase tracking-wide text-muted-light">
                Reflection
              </h3>
              <p className="text-[10px] leading-[1.7] text-foreground">
                {data.reflection}
              </p>
            </div>

            <div className="space-y-1.5">
              <h3 className="text-[9px] font-medium uppercase tracking-wide text-muted-light">
                Question for you
              </h3>
              <p className="text-[10px] leading-[1.7] text-foreground">
                {data.question}
              </p>
            </div>

            <div className="space-y-1.5">
              <h3 className="text-[9px] font-medium uppercase tracking-wide text-muted-light">
                Small experiment
              </h3>
              <p className="text-[10px] leading-[1.7] text-foreground">
                {data.experiment}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="inline-flex w-fit rounded-lg border border-border-soft px-2.5 py-1.5 text-[9px] text-muted">
              Regenerate feedback
            </span>
            <p className="text-[9px] text-muted">{data.remainingLabel}</p>
            <p className="text-[8px] leading-relaxed text-muted-light">
              AI-generated reflection. Not therapy, coaching, or medical advice.
            </p>
          </div>
        </section>
      </ContentWrapper>
    </div>
  );
}

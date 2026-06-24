"use client";

import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type Variants,
} from "framer-motion";
import { useCallback, useEffect, useState } from "react";

import { DemoCoachingScreen } from "@/components/demo/demo-coaching-screen";
import { DemoMonthScreen } from "@/components/demo/demo-month-screen";
import { DemoTodayScreen } from "@/components/demo/demo-today-screen";
import { DemoWeekScreen } from "@/components/demo/demo-week-screen";
import {
  DEMO_TOUR_STEPS,
  type DemoTourStepId,
} from "@/lib/demo/demo-tour-steps";

const STEP_DURATION_MS = 4000;

const screenVariants: Variants = {
  enter: { opacity: 0, y: 10 },
  center: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

type MobileProductTourProps = {
  recordingMode?: boolean;
};

export function MobileProductTour({ recordingMode = false }: MobileProductTourProps) {
  const reducedMotion = useReducedMotion();
  const [activeStep, setActiveStep] = useState(0);
  const [playing, setPlaying] = useState(true);

  const step = DEMO_TOUR_STEPS[activeStep]!;

  useEffect(() => {
    if (reducedMotion || !playing) {
      return;
    }

    const timer = window.setInterval(() => {
      setActiveStep((current) => (current + 1) % DEMO_TOUR_STEPS.length);
    }, STEP_DURATION_MS);

    return () => window.clearInterval(timer);
  }, [playing, reducedMotion]);

  const goToStep = useCallback((index: number) => {
    setActiveStep(index);
  }, []);

  if (reducedMotion) {
    return (
      <ReducedMotionTour
        activeStep={activeStep}
        onStepChange={goToStep}
        recordingMode={recordingMode}
      />
    );
  }

  return (
    <div
      className={`mx-auto w-full ${
        recordingMode ? "max-w-4xl px-4 py-8" : "max-w-5xl px-6"
      }`}
      aria-live="polite"
      aria-label="Planlet product tour"
    >
      <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,280px)_1fr] lg:gap-14">
        <div className="mx-auto w-full max-w-[280px] lg:mx-0">
          <PhoneFrame activeStepId={step.id} />
        </div>

        <div className="flex flex-col justify-center text-center lg:text-left">
          <AnimatePresence mode="wait">
            <motion.div
              key={step.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-3"
            >
              <p className="text-xs font-semibold tracking-[0.18em] text-muted uppercase">
                Step {activeStep + 1} of {DEMO_TOUR_STEPS.length}
              </p>
              <h3 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                {step.title}
              </h3>
              <p className="mx-auto max-w-md text-sm leading-relaxed text-muted lg:mx-0">
                {step.caption}
              </p>
            </motion.div>
          </AnimatePresence>

          {!recordingMode ? (
            <div className="mt-8 flex flex-col items-center gap-4 lg:items-start">
              <button
                type="button"
                className="ui-btn-secondary ui-btn-compact"
                onClick={() => setPlaying((value) => !value)}
                aria-pressed={playing}
              >
                {playing ? "Pause tour" : "Play tour"}
              </button>

              <div
                className="flex flex-wrap justify-center gap-2 lg:justify-start"
                role="tablist"
                aria-label="Tour steps"
              >
                {DEMO_TOUR_STEPS.map((entry, index) => (
                  <button
                    key={entry.id}
                    type="button"
                    role="tab"
                    aria-selected={index === activeStep}
                    aria-label={`${entry.title}, step ${index + 1}`}
                    className={`h-2.5 rounded-full transition-all ${
                      index === activeStep
                        ? "w-7 bg-foreground/80"
                        : "w-2.5 bg-border hover:bg-muted-light"
                    }`}
                    onClick={() => {
                      setActiveStep(index);
                      setPlaying(false);
                    }}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ReducedMotionTour({
  activeStep,
  onStepChange,
  recordingMode,
}: {
  activeStep: number;
  onStepChange: (index: number) => void;
  recordingMode: boolean;
}) {
  const step = DEMO_TOUR_STEPS[activeStep]!;

  return (
    <div className="mx-auto w-full max-w-5xl px-6">
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,280px)_1fr] lg:gap-14">
        <div className="mx-auto w-full max-w-[280px] lg:mx-0">
          <PhoneFrame activeStepId={step.id} static />
        </div>

        <div className="space-y-5">
          <div>
            <p className="text-xs font-semibold tracking-[0.18em] text-muted uppercase">
              Step {activeStep + 1} of {DEMO_TOUR_STEPS.length}
            </p>
            <h3 className="mt-2 text-xl font-semibold tracking-tight text-foreground">
              {step.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              {step.caption}
            </p>
          </div>

          {!recordingMode ? (
            <ol className="space-y-2 text-sm text-muted">
              {DEMO_TOUR_STEPS.map((entry, index) => (
                <li key={entry.id}>
                  <button
                    type="button"
                    className={`rounded-lg px-3 py-2 text-left transition-colors ${
                      index === activeStep
                        ? "bg-accent-cream/70 text-foreground"
                        : "hover:bg-surface-muted/80"
                    }`}
                    onClick={() => onStepChange(index)}
                  >
                    {index + 1}. {entry.title}
                  </button>
                </li>
              ))}
            </ol>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function PhoneFrame({
  activeStepId,
  static: isStatic = false,
}: {
  activeStepId: DemoTourStepId;
  static?: boolean;
}) {
  return (
    <div className="relative">
      <div
        className="rounded-[2.4rem] border border-border bg-surface p-2 shadow-[var(--shadow-elevated)]"
        aria-hidden="true"
      >
        <div className="overflow-hidden rounded-[2rem] bg-background">
          <StatusBar />
          <div className="relative h-[420px] overflow-hidden sm:h-[460px]">
            {isStatic ? (
              <DemoTourScreen stepId={activeStepId} animate={false} />
            ) : (
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeStepId}
                  className="absolute inset-0"
                  variants={screenVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
                >
                  <DemoTourScreen stepId={activeStepId} />
                </motion.div>
              </AnimatePresence>
            )}
          </div>
          <HomeIndicator />
        </div>
      </div>
    </div>
  );
}

function DemoTourScreen({
  stepId,
  animate = true,
}: {
  stepId: DemoTourStepId;
  animate?: boolean;
}) {
  switch (stepId) {
    case "today":
      return <DemoTodayScreen animate={animate} />;
    case "week":
      return <DemoWeekScreen animate={animate} />;
    case "month":
      return <DemoMonthScreen animate={animate} />;
    case "coaching":
      return <DemoCoachingScreen animate={animate} />;
    default:
      return <DemoTodayScreen animate={animate} />;
  }
}

function StatusBar() {
  return (
    <div className="flex items-center justify-between px-5 pb-1 pt-3 text-[10px] font-medium text-muted">
      <span>9:41</span>
      <div className="flex items-center gap-1" aria-hidden="true">
        <span className="h-2 w-2 rounded-full bg-muted-light/70" />
        <span className="h-2 w-2 rounded-full bg-muted-light/70" />
        <span className="h-2.5 w-5 rounded-sm border border-muted-light/60" />
      </div>
    </div>
  );
}

function HomeIndicator() {
  return (
    <div className="flex justify-center py-2">
      <span className="h-1 w-24 rounded-full bg-border" />
    </div>
  );
}

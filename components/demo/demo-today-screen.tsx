"use client";

import { motion } from "framer-motion";

import { ChevronDownIcon, LockIcon, SparklesIcon } from "@/components/ui/action-icons";
import {
  DemoPageHeader,
  DemoSectionLabel,
  DemoTaskRow,
} from "@/components/demo/demo-plan-parts";
import { DEMO_TODAY_DATA } from "@/lib/demo/demo-data";

const listContainerVariants = {
  show: {
    transition: { staggerChildren: 0.06, delayChildren: 0.04 },
  },
};

const listItemVariants = {
  hidden: { opacity: 0, y: 4 },
  show: { opacity: 1, y: 0 },
};

type DemoTodayScreenProps = {
  animate?: boolean;
};

export function DemoTodayScreen({ animate = true }: DemoTodayScreenProps) {
  const data = DEMO_TODAY_DATA;
  const ListWrapper = animate ? motion.ul : "ul";
  const ItemWrapper = animate ? motion.li : "li";
  const listProps = animate
    ? {
        variants: listContainerVariants,
        initial: "hidden" as const,
        animate: "show" as const,
      }
    : {};
  const itemProps = animate ? { variants: listItemVariants } : {};

  return (
    <div className="demo-phone-screen flex h-full flex-col overflow-y-auto overscroll-contain px-3 pb-2 pt-0.5">
      <DemoPageHeader title={data.pageTitle} subtitle={data.pageSubtitle} />

      <section className="space-y-1.5">
        <DemoSectionLabel>{data.tasksSectionLabel}</DemoSectionLabel>

        <ListWrapper className="space-y-1.5" {...listProps}>
          {data.tasks.map((task) => (
            <ItemWrapper key={task.id} {...itemProps}>
              <DemoTaskRow task={task} />
              {task.subtasks?.map((subtask) => (
                <article
                  key={subtask.id}
                  className="ms-2.5 mt-1 border-s border-border-soft ps-2"
                >
                  <DemoTaskRow task={subtask} nested />
                </article>
              ))}
            </ItemWrapper>
          ))}
        </ListWrapper>
      </section>

      <div className="ui-plan-section-follows-tasks mt-3 space-y-1 border-t border-border-soft pt-2">
        <DemoPrivateDisclosure
          label="Gratitude"
          count={data.gratitude.count}
          preview={data.gratitude.preview}
          showSparkles
        />
        <DemoPrivateDisclosure
          label="Observations"
          count={data.observation.count}
          preview={data.observation.preview}
        />
      </div>
    </div>
  );
}

function DemoPrivateDisclosure({
  label,
  count,
  preview,
  showSparkles = false,
}: {
  label: string;
  count: number;
  preview: string;
  showSparkles?: boolean;
}) {
  return (
    <div className="ui-observations-disclosure">
      <div className="ui-observations-disclosure-summary flex min-h-9 items-center justify-between gap-2 rounded-lg px-1">
        <span className="flex min-w-0 flex-1 items-center gap-1.5">
          <LockIcon className="h-3.5 w-3.5 shrink-0 text-muted" aria-hidden="true" />
          <span className="truncate text-[11px] text-foreground">{label}</span>
          {showSparkles ? (
            <SparklesIcon
              className="h-3 w-3 shrink-0 text-muted"
              aria-hidden="true"
            />
          ) : null}
        </span>
        <span className="flex shrink-0 items-center gap-1 text-muted">
          <span className="text-[10px] tabular-nums">{count}</span>
          <ChevronDownIcon className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
      </div>
      <p className="px-1 pb-1 text-[10px] leading-relaxed text-muted-light">
        {preview}
      </p>
    </div>
  );
}

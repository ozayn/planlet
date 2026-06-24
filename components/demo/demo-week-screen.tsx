"use client";

import { motion } from "framer-motion";

import {
  DemoPageHeader,
  DemoPeriodNav,
  DemoIntentionRow,
  DemoProgressSummary,
  DemoSectionLabel,
  DemoTaskRow,
} from "@/components/demo/demo-plan-parts";
import { DEMO_WEEK_DATA } from "@/lib/demo/demo-data";

const listContainerVariants = {
  show: {
    transition: { staggerChildren: 0.05, delayChildren: 0.03 },
  },
};

const listItemVariants = {
  hidden: { opacity: 0, y: 4 },
  show: { opacity: 1, y: 0 },
};

type DemoWeekScreenProps = {
  animate?: boolean;
};

export function DemoWeekScreen({ animate = true }: DemoWeekScreenProps) {
  const data = DEMO_WEEK_DATA;
  const ContentWrapper = animate ? motion.div : "div";
  const GroupWrapper = animate ? motion.div : "div";
  const contentProps = animate
    ? {
        variants: listContainerVariants,
        initial: "hidden" as const,
        animate: "show" as const,
      }
    : {};
  const groupProps = animate ? { variants: listItemVariants } : {};

  return (
    <div className="demo-phone-screen flex h-full flex-col overflow-y-auto overscroll-contain px-3 pb-2 pt-0.5">
      <DemoPageHeader title={data.pageTitle} subtitle={data.pageSubtitle} />
      <DemoPeriodNav label={data.navLabel} />

      <ContentWrapper className="space-y-3" {...contentProps}>
        <section className="space-y-1.5">
          <DemoSectionLabel>Intentions</DemoSectionLabel>
          <ul className="space-y-1.5">
            {data.intentions.map((intention) => (
              <li key={intention.id}>
                <DemoIntentionRow title={intention.title} compact />
              </li>
            ))}
          </ul>
        </section>

        {data.groups.map((group) => (
          <GroupWrapper key={group.id} {...groupProps}>
            <section className="space-y-1.5">
              <DemoSectionLabel>{group.label}</DemoSectionLabel>
              <ul className="space-y-1">
                {group.tasks.map((task) => (
                  <li key={task.id}>
                    <DemoTaskRow task={task} compact />
                  </li>
                ))}
              </ul>
            </section>
          </GroupWrapper>
        ))}

        <DemoProgressSummary
          done={data.progress.done}
          total={data.progress.total}
          label={data.progress.label}
        />
      </ContentWrapper>
    </div>
  );
}

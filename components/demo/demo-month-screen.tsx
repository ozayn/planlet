"use client";

import { motion } from "framer-motion";

import {
  DemoPageHeader,
  DemoPeriodNav,
  DemoPriorityCard,
  DemoSectionLabel,
} from "@/components/demo/demo-plan-parts";
import { DEMO_MONTH_DATA } from "@/lib/demo/demo-data";

const listContainerVariants = {
  show: {
    transition: { staggerChildren: 0.06, delayChildren: 0.04 },
  },
};

const listItemVariants = {
  hidden: { opacity: 0, y: 4 },
  show: { opacity: 1, y: 0 },
};

type DemoMonthScreenProps = {
  animate?: boolean;
};

export function DemoMonthScreen({ animate = true }: DemoMonthScreenProps) {
  const data = DEMO_MONTH_DATA;
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
      <DemoPeriodNav label={data.navLabel} />

      <section className="space-y-2">
        <DemoSectionLabel>Priorities</DemoSectionLabel>
        <ListWrapper className="space-y-1.5" {...listProps}>
          {data.priorities.map((priority) => (
            <ItemWrapper key={priority.id} {...itemProps}>
              <DemoPriorityCard
                label={priority.label}
                note={priority.note}
                progress={priority.progress}
              />
            </ItemWrapper>
          ))}
        </ListWrapper>
      </section>
    </div>
  );
}

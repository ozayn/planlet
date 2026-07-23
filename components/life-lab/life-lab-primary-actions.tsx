"use client";

import type { ReactNode } from "react";

type LifeLabPrimaryActionsProps = {
  listen: ReactNode;
  more: ReactNode;
  className?: string;
};

export function LifeLabPrimaryActions({
  listen,
  more,
  className = "",
}: LifeLabPrimaryActionsProps) {
  return (
    <div
      data-life-lab-primary-actions=""
      className={`flex flex-wrap items-center gap-2 ${className}`.trim()}
    >
      {listen}
      {more}
    </div>
  );
}

"use client";

import type { ReactNode } from "react";

type LifeLabPrimaryActionsProps = {
  listen: ReactNode;
  more: ReactNode;
  exportPdf?: ReactNode;
  className?: string;
};

export function LifeLabPrimaryActions({
  listen,
  more,
  exportPdf = null,
  className = "",
}: LifeLabPrimaryActionsProps) {
  const actions = [
    { id: "listen", node: listen },
    { id: "export-pdf", node: exportPdf },
    { id: "more", node: more },
  ].filter((action) => action.node != null);

  return (
    <div
      data-life-lab-primary-actions=""
      className={`flex flex-wrap items-center gap-2 ${className}`.trim()}
    >
      {actions.map((action) => (
        <div key={action.id} className="contents">
          {action.node}
        </div>
      ))}
    </div>
  );
}

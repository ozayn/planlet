"use client";

import { useState } from "react";

import { CommentIcon } from "@/components/plans/item-action-icons";
import { ItemCommentsPanel } from "@/components/plans/item-comments-panel";

type ItemCommentsButtonProps = {
  itemId: string;
  itemTitle: string;
  commentCount?: number;
};

export function ItemCommentsButton({
  itemId,
  itemTitle,
  commentCount = 0,
}: ItemCommentsButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="ui-icon-action-quiet"
        aria-label="Comments"
        title="Comments"
      >
        <CommentIcon className="h-4 w-4" />
        {commentCount > 0 ? (
          <span className="absolute end-0.5 top-0.5 min-w-[0.875rem] rounded-full bg-accent-blue px-1 text-center text-[0.5625rem] font-medium leading-4 text-white">
            {commentCount > 9 ? "9+" : commentCount}
          </span>
        ) : null}
        <span className="ui-tooltip-bubble" role="tooltip">
          Comments{commentCount > 0 ? ` (${commentCount})` : ""}
        </span>
      </button>

      <ItemCommentsPanel
        itemId={itemId}
        itemTitle={itemTitle}
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

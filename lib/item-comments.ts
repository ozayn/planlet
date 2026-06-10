import { touchPlan } from "@/lib/touch-plan";
import { touchUserSeen } from "@/lib/user-activity";
import { canViewPlan } from "@/lib/plan-sharing";
import { createPlanItemCommentNotification } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";

import { MAX_ITEM_COMMENT_LENGTH } from "@/lib/item-comment-constants";

export { MAX_ITEM_COMMENT_LENGTH } from "@/lib/item-comment-constants";

export class ItemCommentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ItemCommentError";
  }
}

export type ItemCommentWithAuthor = {
  id: string;
  itemId: string;
  body: string;
  createdAt: Date;
  author: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  };
};

async function requireItemWithPlanAccess(itemId: string, userId: string) {
  const item = await prisma.planItem.findFirst({
    where: { id: itemId },
    include: {
      plan: {
        select: { id: true, userId: true, title: true },
      },
    },
  });

  if (!item) {
    throw new ItemCommentError("Item not found.");
  }

  const canView = await canViewPlan(item.planId, userId);

  if (!canView) {
    throw new ItemCommentError("Item not found.");
  }

  return item;
}

export async function getCommentsForItem(
  itemId: string,
  viewerId: string,
): Promise<ItemCommentWithAuthor[]> {
  await requireItemWithPlanAccess(itemId, viewerId);

  return prisma.planItemComment.findMany({
    where: { itemId },
    orderBy: { createdAt: "asc" },
    include: {
      author: {
        select: { id: true, name: true, email: true, image: true },
      },
    },
  });
}

export async function addItemComment(
  itemId: string,
  authorId: string,
  body: string,
) {
  const trimmed = body.trim();

  if (!trimmed) {
    throw new ItemCommentError("Comment cannot be empty.");
  }

  if (trimmed.length > MAX_ITEM_COMMENT_LENGTH) {
    throw new ItemCommentError(
      `Comment must be ${MAX_ITEM_COMMENT_LENGTH} characters or fewer.`,
    );
  }

  const item = await requireItemWithPlanAccess(itemId, authorId);

  const [comment, author] = await Promise.all([
    prisma.planItemComment.create({
      data: {
        itemId,
        authorId,
        body: trimmed,
      },
      include: {
        author: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
    }),
    prisma.user.findUnique({
      where: { id: authorId },
      select: { name: true, email: true },
    }),
  ]);

  if (item.plan.userId !== authorId) {
    try {
      await createPlanItemCommentNotification({
        recipientUserId: item.plan.userId,
        planId: item.plan.id,
        itemTitle: item.title,
        authorName: author?.name ?? null,
        authorEmail: author?.email ?? null,
      });
    } catch {
      // Comment creation should succeed even if notification fails.
    }
  }

  await touchPlan(item.plan.id);
  await touchUserSeen(authorId);

  return {
    comment,
    planId: item.plan.id,
  };
}

export async function deleteItemComment(commentId: string, userId: string) {
  const comment = await prisma.planItemComment.findFirst({
    where: { id: commentId },
    include: {
      item: {
        include: {
          plan: {
            select: { id: true, userId: true },
          },
        },
      },
    },
  });

  if (!comment) {
    throw new ItemCommentError("Comment not found.");
  }

  const isAuthor = comment.authorId === userId;
  const isPlanOwner = comment.item.plan.userId === userId;

  if (!isAuthor && !isPlanOwner) {
    throw new ItemCommentError("Comment not found.");
  }

  await prisma.planItemComment.delete({
    where: { id: commentId },
  });

  await touchPlan(comment.item.plan.id);
  await touchUserSeen(userId);

  return {
    planId: comment.item.plan.id,
    itemId: comment.itemId,
  };
}

export function viewerCanDeleteComment(
  commentAuthorId: string,
  viewerId: string,
  planOwnerId: string,
): boolean {
  return commentAuthorId === viewerId || planOwnerId === viewerId;
}

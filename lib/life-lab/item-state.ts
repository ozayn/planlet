import { prisma } from "@/lib/prisma";
import type { LifeLabItemType } from "@/lib/life-lab/item-key";

function lifeLabItemStateDelegate() {
  const delegate = prisma.lifeLabItemState;
  if (!delegate || typeof delegate.findUnique !== "function") {
    throw new Error(
      "Prisma LifeLabItemState client is unavailable. Restart the app after running prisma generate.",
    );
  }
  return delegate;
}

export type LifeLabItemStateRecord = {
  id: string;
  userId: string;
  itemKey: string;
  section: string;
  itemType: string;
  archivedAt: Date | null;
  updatedAt: Date;
};

export type ArchivedLifeLabItem = {
  itemKey: string;
  section: string;
  itemType: string;
  archivedAt: Date;
  updatedAt: Date;
};

export async function listArchivedLifeLabItems(
  userId: string,
): Promise<ArchivedLifeLabItem[]> {
  const rows = await lifeLabItemStateDelegate().findMany({
    where: {
      userId,
      archivedAt: { not: null },
    },
    orderBy: { archivedAt: "desc" },
    select: {
      itemKey: true,
      section: true,
      itemType: true,
      archivedAt: true,
      updatedAt: true,
    },
  });

  return rows
    .filter((row): row is typeof row & { archivedAt: Date } =>
      Boolean(row.archivedAt),
    )
    .map((row) => ({
      itemKey: row.itemKey,
      section: row.section,
      itemType: row.itemType,
      archivedAt: row.archivedAt,
      updatedAt: row.updatedAt,
    }));
}

export async function getArchivedLifeLabItemKeySet(
  userId: string,
): Promise<Set<string>> {
  try {
    const rows = await lifeLabItemStateDelegate().findMany({
      where: {
        userId,
        archivedAt: { not: null },
      },
      select: { itemKey: true },
    });

    return new Set(rows.map((row) => row.itemKey));
  } catch {
    return new Set();
  }
}

export async function isLifeLabItemArchived(
  userId: string,
  itemKey: string,
): Promise<boolean> {
  try {
    const row = await lifeLabItemStateDelegate().findUnique({
      where: {
        userId_itemKey: { userId, itemKey },
      },
      select: { archivedAt: true },
    });

    return Boolean(row?.archivedAt);
  } catch {
    return false;
  }
}

export async function archiveLifeLabItem(input: {
  userId: string;
  itemKey: string;
  section: string;
  itemType: LifeLabItemType;
}): Promise<LifeLabItemStateRecord> {
  const now = new Date();
  const row = await lifeLabItemStateDelegate().upsert({
    where: {
      userId_itemKey: {
        userId: input.userId,
        itemKey: input.itemKey,
      },
    },
    create: {
      userId: input.userId,
      itemKey: input.itemKey,
      section: input.section,
      itemType: input.itemType,
      archivedAt: now,
    },
    update: {
      section: input.section,
      itemType: input.itemType,
      archivedAt: now,
    },
  });

  return {
    id: row.id,
    userId: row.userId,
    itemKey: row.itemKey,
    section: row.section,
    itemType: row.itemType,
    archivedAt: row.archivedAt,
    updatedAt: row.updatedAt,
  };
}

export async function unarchiveLifeLabItem(input: {
  userId: string;
  itemKey: string;
}): Promise<LifeLabItemStateRecord | null> {
  const existing = await lifeLabItemStateDelegate().findUnique({
    where: {
      userId_itemKey: {
        userId: input.userId,
        itemKey: input.itemKey,
      },
    },
  });

  if (!existing) {
    return null;
  }

  const row = await lifeLabItemStateDelegate().update({
    where: { id: existing.id },
    data: { archivedAt: null },
  });

  return {
    id: row.id,
    userId: row.userId,
    itemKey: row.itemKey,
    section: row.section,
    itemType: row.itemType,
    archivedAt: row.archivedAt,
    updatedAt: row.updatedAt,
  };
}

export function excludeArchivedByKey<T>(
  items: T[],
  archivedKeys: Set<string>,
  getKey: (item: T) => string,
): T[] {
  if (archivedKeys.size === 0) {
    return items;
  }

  return items.filter((item) => !archivedKeys.has(getKey(item)));
}

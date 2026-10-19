import {
  DEFAULT_LIFE_AREA_NAMES,
  MAX_LIFE_AREA_NAME_LENGTH,
  MAX_LIFE_AREAS_PER_USER,
} from "@/lib/life-areas/constants";
import { normalizeLifeAreaSelection } from "@/lib/life-areas/group";
import type {
  PlanOrganizeViewValue,
  SerializedLifeArea,
} from "@/lib/life-areas/types";
import { prisma } from "@/lib/prisma";

export class LifeAreaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LifeAreaError";
  }
}

function sanitizeName(value: string): string {
  const name = value.trim().replace(/\s+/g, " ");
  if (!name) {
    throw new LifeAreaError("Life Area name is required.");
  }
  return name.slice(0, MAX_LIFE_AREA_NAME_LENGTH);
}

function serializeArea(row: {
  id: string;
  name: string;
  sortOrder: number;
  archivedAt: Date | null;
}): SerializedLifeArea {
  return {
    id: row.id,
    name: row.name,
    sortOrder: row.sortOrder,
    archivedAt: row.archivedAt?.toISOString() ?? null,
  };
}

/** Seed defaults once when the user has no Life Areas at all. */
export async function ensureDefaultLifeAreas(
  userId: string,
): Promise<SerializedLifeArea[]> {
  const existingCount = await prisma.lifeArea.count({ where: { userId } });
  if (existingCount > 0) {
    return listLifeAreas(userId, { includeArchived: true });
  }

  await prisma.lifeArea.createMany({
    data: DEFAULT_LIFE_AREA_NAMES.map((name, index) => ({
      userId,
      name,
      sortOrder: index,
    })),
  });

  return listLifeAreas(userId, { includeArchived: true });
}

export async function listLifeAreas(
  userId: string,
  options?: { includeArchived?: boolean },
): Promise<SerializedLifeArea[]> {
  const rows = await prisma.lifeArea.findMany({
    where: {
      userId,
      ...(options?.includeArchived ? {} : { archivedAt: null }),
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  return rows.map(serializeArea);
}

export async function createLifeArea(
  userId: string,
  nameInput: string,
): Promise<SerializedLifeArea> {
  await ensureDefaultLifeAreas(userId);
  const name = sanitizeName(nameInput);
  const count = await prisma.lifeArea.count({ where: { userId } });
  if (count >= MAX_LIFE_AREAS_PER_USER) {
    throw new LifeAreaError(
      `You can save up to ${MAX_LIFE_AREAS_PER_USER} Life Areas.`,
    );
  }

  const duplicate = await prisma.lifeArea.findFirst({
    where: {
      userId,
      archivedAt: null,
      name: { equals: name, mode: "insensitive" },
    },
    select: { id: true },
  });
  if (duplicate) {
    throw new LifeAreaError("A Life Area with that name already exists.");
  }

  const maxOrder = await prisma.lifeArea.aggregate({
    where: { userId },
    _max: { sortOrder: true },
  });

  const row = await prisma.lifeArea.create({
    data: {
      userId,
      name,
      sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
    },
  });

  return serializeArea(row);
}

export async function renameLifeArea(
  userId: string,
  lifeAreaId: string,
  nameInput: string,
): Promise<SerializedLifeArea> {
  const name = sanitizeName(nameInput);
  const existing = await prisma.lifeArea.findFirst({
    where: { id: lifeAreaId, userId },
  });
  if (!existing) {
    throw new LifeAreaError("Life Area not found.");
  }

  const duplicate = await prisma.lifeArea.findFirst({
    where: {
      userId,
      archivedAt: null,
      id: { not: lifeAreaId },
      name: { equals: name, mode: "insensitive" },
    },
    select: { id: true },
  });
  if (duplicate) {
    throw new LifeAreaError("A Life Area with that name already exists.");
  }

  const row = await prisma.lifeArea.update({
    where: { id: lifeAreaId },
    data: { name },
  });

  return serializeArea(row);
}

export async function archiveLifeArea(
  userId: string,
  lifeAreaId: string,
): Promise<SerializedLifeArea> {
  const existing = await prisma.lifeArea.findFirst({
    where: { id: lifeAreaId, userId },
  });
  if (!existing) {
    throw new LifeAreaError("Life Area not found.");
  }

  const row = await prisma.lifeArea.update({
    where: { id: lifeAreaId },
    data: { archivedAt: existing.archivedAt ?? new Date() },
  });

  return serializeArea(row);
}

export async function restoreLifeArea(
  userId: string,
  lifeAreaId: string,
): Promise<SerializedLifeArea> {
  const existing = await prisma.lifeArea.findFirst({
    where: { id: lifeAreaId, userId },
  });
  if (!existing) {
    throw new LifeAreaError("Life Area not found.");
  }

  const duplicate = await prisma.lifeArea.findFirst({
    where: {
      userId,
      archivedAt: null,
      id: { not: lifeAreaId },
      name: { equals: existing.name, mode: "insensitive" },
    },
    select: { id: true },
  });
  if (duplicate) {
    throw new LifeAreaError(
      "Restore failed: an active Life Area already uses that name.",
    );
  }

  const row = await prisma.lifeArea.update({
    where: { id: lifeAreaId },
    data: { archivedAt: null },
  });

  return serializeArea(row);
}

export async function reorderLifeAreas(
  userId: string,
  orderedIds: string[],
): Promise<SerializedLifeArea[]> {
  const active = await prisma.lifeArea.findMany({
    where: { userId, archivedAt: null },
    select: { id: true },
  });
  const activeIds = new Set(active.map((row) => row.id));

  if (
    orderedIds.length !== activeIds.size ||
    orderedIds.some((id) => !activeIds.has(id))
  ) {
    throw new LifeAreaError("Invalid Life Area order.");
  }

  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.lifeArea.update({
        where: { id },
        data: { sortOrder: index },
      }),
    ),
  );

  return listLifeAreas(userId, { includeArchived: true });
}

export async function getPlanOrganizeView(
  userId: string,
): Promise<PlanOrganizeViewValue> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { planOrganizeView: true },
  });
  return user?.planOrganizeView === "LIFE_AREAS" ? "LIFE_AREAS" : "LIST";
}

export async function updatePlanOrganizeView(
  userId: string,
  view: PlanOrganizeViewValue,
): Promise<PlanOrganizeViewValue> {
  const next = view === "LIFE_AREAS" ? "LIFE_AREAS" : "LIST";
  await prisma.user.update({
    where: { id: userId },
    data: { planOrganizeView: next },
  });
  return next;
}

export async function setPlanItemLifeAreas(input: {
  userId: string;
  planItemId: string;
  primaryLifeAreaId: string | null;
  secondaryLifeAreaIds: string[];
}): Promise<void> {
  const item = await prisma.planItem.findFirst({
    where: { id: input.planItemId, plan: { userId: input.userId } },
    select: { id: true },
  });
  if (!item) {
    throw new LifeAreaError("Task not found.");
  }

  const normalized = normalizeLifeAreaSelection({
    primaryLifeAreaId: input.primaryLifeAreaId,
    secondaryLifeAreaIds: input.secondaryLifeAreaIds,
  });

  const desiredIds = [
    ...(normalized.primaryLifeAreaId ? [normalized.primaryLifeAreaId] : []),
    ...normalized.secondaryLifeAreaIds,
  ];

  if (desiredIds.length > 0) {
    const owned = await prisma.lifeArea.findMany({
      where: { id: { in: desiredIds }, userId: input.userId },
      select: { id: true },
    });
    if (owned.length !== desiredIds.length) {
      throw new LifeAreaError("One or more Life Areas were not found.");
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.planItemLifeArea.deleteMany({
      where: { planItemId: input.planItemId },
    });

    if (desiredIds.length === 0) {
      return;
    }

    await tx.planItemLifeArea.createMany({
      data: desiredIds.map((lifeAreaId) => ({
        planItemId: input.planItemId,
        lifeAreaId,
        isPrimary: lifeAreaId === normalized.primaryLifeAreaId,
      })),
    });
  });
}

export type { SerializedLifeArea, PlanOrganizeViewValue } from "@/lib/life-areas/types";
export {
  groupPlanItemsByPrimaryLifeArea,
  normalizeLifeAreaSelection,
} from "@/lib/life-areas/group";
export {
  DEFAULT_LIFE_AREA_NAMES,
  UNCATEGORIZED_LIFE_AREA_ID,
  UNCATEGORIZED_LIFE_AREA_LABEL,
} from "@/lib/life-areas/constants";

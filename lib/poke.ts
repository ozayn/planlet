import type { PokeType } from "@/app/generated/prisma/client";
import { startOfDay } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";

import { isEmailAllowed } from "@/lib/auth-allowlist";
import { APP_TIMEZONE } from "@/config/time";
import { createUserPokeNotification } from "@/lib/notifications";
import {
  MAX_POKE_MESSAGE_LENGTH,
  MAX_POKES_PER_DAY,
  POKE_CONTACTS_LIMIT,
  POKE_HISTORY_LIMIT,
  RECENT_POKES_LIMIT,
} from "@/lib/poke-constants";
import { getPokeNotificationLine } from "@/lib/poke-labels";
import { prisma } from "@/lib/prisma";
import { touchUserSeen } from "@/lib/user-activity";

export class PokeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PokeError";
  }
}

export type PokeContact = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  lastConnectedAt: string;
};

export type SerializedPoke = {
  id: string;
  pokeType: PokeType;
  message: string | null;
  createdAt: string;
  seenAt: string | null;
  acknowledgedAt: string | null;
  dismissedAt: string | null;
  sender: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  };
  recipient: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  };
};

const pokeUserSelect = {
  id: true,
  name: true,
  email: true,
  image: true,
} as const;

function serializePoke(
  poke: {
    id: string;
    pokeType: PokeType;
    message: string | null;
    createdAt: Date;
    seenAt: Date | null;
    acknowledgedAt: Date | null;
    dismissedAt: Date | null;
    sender: {
      id: string;
      name: string | null;
      email: string | null;
      image: string | null;
    };
    recipient: {
      id: string;
      name: string | null;
      email: string | null;
      image: string | null;
    };
  },
): SerializedPoke {
  return {
    id: poke.id,
    pokeType: poke.pokeType,
    message: poke.message,
    createdAt: poke.createdAt.toISOString(),
    seenAt: poke.seenAt?.toISOString() ?? null,
    acknowledgedAt: poke.acknowledgedAt?.toISOString() ?? null,
    dismissedAt: poke.dismissedAt?.toISOString() ?? null,
    sender: poke.sender,
    recipient: poke.recipient,
  };
}

function getPokeDayStart(now = new Date()): Date {
  const zoned = toZonedTime(now, APP_TIMEZONE);
  return fromZonedTime(startOfDay(zoned), APP_TIMEZONE);
}

function pokeHref(pokeId: string): string {
  return `/nudges?nudge=${pokeId}`;
}

async function usersAreConnected(userA: string, userB: string): Promise<boolean> {
  if (userA === userB) {
    return false;
  }

  const share = await prisma.planShare.findFirst({
    where: {
      OR: [
        { ownerId: userA, sharedWithUserId: userB },
        { ownerId: userB, sharedWithUserId: userA },
      ],
    },
    select: { id: true },
  });

  return Boolean(share);
}

async function assertCanPokeUser(senderId: string, recipientId: string) {
  if (senderId === recipientId) {
    throw new PokeError("You cannot poke yourself.");
  }

  const recipient = await prisma.user.findUnique({
    where: { id: recipientId },
    select: { id: true, email: true },
  });

  if (!recipient) {
    throw new PokeError("Friend not found.");
  }

  const email = recipient.email?.trim().toLowerCase();
  if (!email || !isEmailAllowed(email)) {
    throw new PokeError("You can only poke people you share plans with.");
  }

  if (!(await usersAreConnected(senderId, recipientId))) {
    throw new PokeError("You can only poke people you share plans with.");
  }

  return recipient;
}

function validatePokeMessage(message?: string | null): string | null {
  if (!message?.trim()) {
    return null;
  }

  const trimmed = message.trim();

  if (trimmed.length > MAX_POKE_MESSAGE_LENGTH) {
    throw new PokeError(
      `Message must be ${MAX_POKE_MESSAGE_LENGTH} characters or fewer.`,
    );
  }

  return trimmed;
}

async function countPokesSentToday(senderId: string): Promise<number> {
  return prisma.poke.count({
    where: {
      senderId,
      createdAt: { gte: getPokeDayStart() },
    },
  });
}

async function markPokeNotificationsRead(userId: string, pokeId: string) {
  await prisma.notification.updateMany({
    where: {
      userId,
      type: "USER_POKE",
      href: pokeHref(pokeId),
    },
    data: { readAt: new Date() },
  });
}

export async function getPokeEligibleContacts(
  userId: string,
): Promise<PokeContact[]> {
  const shares = await prisma.planShare.findMany({
    where: {
      OR: [{ ownerId: userId }, { sharedWithUserId: userId }],
    },
    orderBy: { createdAt: "desc" },
    include: {
      owner: { select: pokeUserSelect },
      sharedWithUser: { select: pokeUserSelect },
    },
  });

  const contacts = new Map<string, PokeContact>();

  for (const share of shares) {
    const contact =
      share.ownerId === userId ? share.sharedWithUser : share.owner;

    if (!contact?.id || contact.id === userId || contacts.has(contact.id)) {
      continue;
    }

    const email = contact.email?.trim().toLowerCase();
    if (!email || !isEmailAllowed(email)) {
      continue;
    }

    contacts.set(contact.id, {
      id: contact.id,
      name: contact.name,
      email: contact.email,
      image: contact.image,
      lastConnectedAt: share.createdAt.toISOString(),
    });

    if (contacts.size >= POKE_CONTACTS_LIMIT) {
      break;
    }
  }

  return [...contacts.values()];
}

export async function getUnreadPokeCount(userId: string): Promise<number> {
  return prisma.poke.count({
    where: {
      recipientId: userId,
      dismissedAt: null,
      seenAt: null,
    },
  });
}

export async function getHeaderUnreadCount(userId: string): Promise<number> {
  const [pokeUnread, notificationUnread] = await Promise.all([
    getUnreadPokeCount(userId),
    prisma.notification.count({
      where: {
        userId,
        readAt: null,
        type: { not: "USER_POKE" },
      },
    }),
  ]);

  return pokeUnread + notificationUnread;
}

export type PokeHistory = {
  received: SerializedPoke[];
  sent: SerializedPoke[];
};

export async function getPokeHistory(
  userId: string,
  limit = POKE_HISTORY_LIMIT,
): Promise<PokeHistory> {
  const pokes = await prisma.poke.findMany({
    where: {
      OR: [{ recipientId: userId }, { senderId: userId }],
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      sender: { select: pokeUserSelect },
      recipient: { select: pokeUserSelect },
    },
  });

  const received: SerializedPoke[] = [];
  const sent: SerializedPoke[] = [];

  for (const poke of pokes.map(serializePoke)) {
    if (poke.recipient.id === userId) {
      received.push(poke);
    }

    if (poke.sender.id === userId) {
      sent.push(poke);
    }
  }

  return { received, sent };
}

export async function getRecentReceivedPokes(
  userId: string,
  limit = RECENT_POKES_LIMIT,
): Promise<SerializedPoke[]> {
  const pokes = await prisma.poke.findMany({
    where: {
      recipientId: userId,
      dismissedAt: null,
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      sender: { select: pokeUserSelect },
      recipient: { select: pokeUserSelect },
    },
  });

  return pokes.map(serializePoke);
}

export async function sendPoke(
  senderId: string,
  recipientId: string,
  pokeType: PokeType,
  message?: string | null,
): Promise<SerializedPoke> {
  await assertCanPokeUser(senderId, recipientId);
  const trimmedMessage = validatePokeMessage(message);

  const sender = await prisma.user.findUnique({
    where: { id: senderId },
    select: { name: true, email: true },
  });

  if (!sender) {
    throw new PokeError("Not signed in.");
  }

  const existingUnread = await prisma.poke.findFirst({
    where: {
      senderId,
      recipientId,
      dismissedAt: null,
      seenAt: null,
    },
    select: { id: true },
  });

  let poke;

  if (existingUnread) {
    poke = await prisma.poke.update({
      where: { id: existingUnread.id },
      data: {
        pokeType,
        message: trimmedMessage,
        createdAt: new Date(),
      },
      include: {
        sender: { select: pokeUserSelect },
        recipient: { select: pokeUserSelect },
      },
    });
  } else {
    const sentToday = await countPokesSentToday(senderId);

    if (sentToday >= MAX_POKES_PER_DAY) {
      throw new PokeError("You can send up to 10 pokes per day.");
    }

    poke = await prisma.poke.create({
      data: {
        senderId,
        recipientId,
        pokeType,
        message: trimmedMessage,
      },
      include: {
        sender: { select: pokeUserSelect },
        recipient: { select: pokeUserSelect },
      },
    });

    const line = getPokeNotificationLine({
      senderName: sender.name,
      senderEmail: sender.email,
      pokeType,
    });

    try {
      await createUserPokeNotification({
        recipientUserId: recipientId,
        pokeId: poke.id,
        title: "You received a nudge",
        body: trimmedMessage ? `${line}\n"${trimmedMessage}"` : line,
      });
    } catch {
      // Notification failure should not block poke creation.
    }
  }

  await touchUserSeen(senderId);

  return serializePoke(poke);
}

export async function acknowledgePoke(
  recipientId: string,
  pokeId: string,
): Promise<SerializedPoke> {
  const poke = await prisma.poke.findFirst({
    where: { id: pokeId, recipientId },
    include: {
      sender: { select: pokeUserSelect },
      recipient: { select: pokeUserSelect },
    },
  });

  if (!poke) {
    throw new PokeError("Nudge not found.");
  }

  const now = new Date();
  const updated = await prisma.poke.update({
    where: { id: pokeId },
    data: {
      acknowledgedAt: now,
      seenAt: poke.seenAt ?? now,
    },
    include: {
      sender: { select: pokeUserSelect },
      recipient: { select: pokeUserSelect },
    },
  });

  await markPokeNotificationsRead(recipientId, pokeId);
  await touchUserSeen(recipientId);

  return serializePoke(updated);
}

export async function dismissPoke(
  recipientId: string,
  pokeId: string,
): Promise<void> {
  const poke = await prisma.poke.findFirst({
    where: { id: pokeId, recipientId },
    select: { id: true, seenAt: true },
  });

  if (!poke) {
    throw new PokeError("Nudge not found.");
  }

  const now = new Date();

  await prisma.poke.update({
    where: { id: pokeId },
    data: {
      dismissedAt: now,
      seenAt: poke.seenAt ?? now,
    },
  });

  await markPokeNotificationsRead(recipientId, pokeId);
  await touchUserSeen(recipientId);
}

export async function markPokeSeen(
  recipientId: string,
  pokeId: string,
): Promise<void> {
  const poke = await prisma.poke.findFirst({
    where: { id: pokeId, recipientId, seenAt: null },
    select: { id: true },
  });

  if (!poke) {
    return;
  }

  await prisma.poke.update({
    where: { id: pokeId },
    data: { seenAt: new Date() },
  });
}

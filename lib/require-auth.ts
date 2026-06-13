import { auth } from "@/auth";
import { SESSION_EXPIRED_MESSAGE } from "@/lib/action-errors";
import { prisma } from "@/lib/prisma";

export class SessionExpiredError extends Error {
  constructor(message = SESSION_EXPIRED_MESSAGE) {
    super(message);
    this.name = "SessionExpiredError";
  }
}

export async function requireUserId(): Promise<string> {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    throw new SessionExpiredError();
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });

  if (!user) {
    throw new SessionExpiredError();
  }

  return userId;
}

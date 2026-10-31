import type { Prisma } from "@prisma/client";
import { prisma } from "../../shared/db.js";

export type PointEventInput = {
  userId: string;
  amount: number;
  reason: string;
  refType?: string | null;
  refId?: string | null;
  createdAt?: Date;
};

export type HistoricalPointEvent = PointEventInput & { createdAt: Date };

function eventData(input: PointEventInput) {
  return {
    userId: input.userId,
    amount: input.amount,
    reason: input.reason,
    refType: input.refType ?? null,
    refId: input.refId ?? null,
    ...(input.createdAt ? { createdAt: input.createdAt } : {}),
  };
}

async function writePointEvent(db: Prisma.TransactionClient, input: PointEventInput) {
  const event = await db.userPointEvent.create({
    data: eventData(input),
  });
  await db.user.update({
    where: { id: input.userId },
    data: { points: { increment: input.amount } },
  });
  return event;
}

/**
 * Increment (or decrement) user points and append a ledger row.
 * Pass `tx` to join a transaction that is already open.
 */
export async function awardUserPoints(input: PointEventInput, tx?: Prisma.TransactionClient) {
  if (input.amount === 0) return null;
  if (tx) return writePointEvent(tx, input);
  return prisma.$transaction((inner) => writePointEvent(inner, input));
}

/** Insert ledger rows without changing `users.points`. Used for historical backfill. */
export async function recordHistoricalPointEvents(events: HistoricalPointEvent[]) {
  if (events.length === 0) return 0;
  const result = await prisma.userPointEvent.createMany({
    data: events.map((event) => ({
      userId: event.userId,
      amount: event.amount,
      reason: event.reason,
      refType: event.refType ?? null,
      refId: event.refId ?? null,
      createdAt: event.createdAt,
    })),
  });
  return result.count;
}

export async function listPointEventKeys(reasons: string[]) {
  if (reasons.length === 0) return [];
  return prisma.userPointEvent.findMany({
    where: { reason: { in: reasons } },
    select: { reason: true, refType: true, refId: true },
  });
}

export function listUserPointEventsSince(userId: string, since: Date) {
  return prisma.userPointEvent.findMany({
    where: { userId, createdAt: { gte: since } },
    select: { amount: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
}

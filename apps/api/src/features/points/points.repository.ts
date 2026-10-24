import type { Prisma } from "@prisma/client";
import { prisma } from "../../shared/db.js";

export type PointEventInput = {
  userId: string;
  amount: number;
  reason: string;
  refType?: string | null;
  refId?: string | null;
};

async function writePointEvent(db: Prisma.TransactionClient, input: PointEventInput) {
  const event = await db.userPointEvent.create({
    data: {
      userId: input.userId,
      amount: input.amount,
      reason: input.reason,
      refType: input.refType ?? null,
      refId: input.refId ?? null,
    },
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

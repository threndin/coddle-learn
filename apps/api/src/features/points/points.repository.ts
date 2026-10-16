import { prisma } from "../../shared/db.js";

export type PointEventInput = {
  userId: string;
  amount: number;
  reason: string;
  refType?: string | null;
  refId?: string | null;
};

/** Increment (or decrement) user points and append a ledger row in one transaction. */
export async function awardUserPoints(input: PointEventInput) {
  if (input.amount === 0) return null;

  return prisma.$transaction(async (tx) => {
    const event = await tx.userPointEvent.create({
      data: {
        userId: input.userId,
        amount: input.amount,
        reason: input.reason,
        refType: input.refType ?? null,
        refId: input.refId ?? null,
      },
    });
    await tx.user.update({
      where: { id: input.userId },
      data: { points: { increment: input.amount } },
    });
    return event;
  });
}

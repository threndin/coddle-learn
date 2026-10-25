import { prisma } from "../../shared/db.js";

const userCard = {
  id: true,
  username: true,
  name: true,
  avatarUrl: true,
  experienceLevel: true,
  points: true,
} as const;

export function countUsersWithPoints() {
  return prisma.user.count({ where: { points: { gt: 0 } } });
}

export function listUsersByPoints(skip: number, take: number) {
  return prisma.user.findMany({
    where: { points: { gt: 0 } },
    orderBy: [{ points: "desc" }, { id: "asc" }],
    skip,
    take,
    select: userCard,
  });
}

export function findUserPoints(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, points: true },
  });
}

export function countUsersAhead(userId: string, points: number) {
  return prisma.user.count({
    where: {
      OR: [{ points: { gt: points } }, { AND: [{ points }, { id: { lt: userId } }] }],
    },
  });
}

export function listPeriodPointSums(start: Date, end: Date) {
  return prisma.userPointEvent.groupBy({
    by: ["userId"],
    where: { createdAt: { gte: start, lte: end } },
    _sum: { amount: true },
  });
}

export function findUsersByIds(ids: string[]) {
  if (ids.length === 0) return Promise.resolve([]);
  return prisma.user.findMany({
    where: { id: { in: ids } },
    select: userCard,
  });
}

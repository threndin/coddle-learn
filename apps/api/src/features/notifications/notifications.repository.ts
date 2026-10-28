import type { NotificationGroup } from "@coddle/shared";
import type { Prisma } from "@prisma/client";
import { prisma } from "../../shared/db.js";

const actorSelect = {
  id: true,
  username: true,
  name: true,
  avatarUrl: true,
} satisfies Prisma.UserSelect;

const notificationInclude = {
  actor: { select: actorSelect },
} satisfies Prisma.NotificationInclude;

export type NotificationRow = Prisma.NotificationGetPayload<{
  include: typeof notificationInclude;
}>;

export type NotificationActor = {
  id: string;
  username: string;
  name: string;
  avatarUrl: string | null;
};

export type CreateNotificationInput = {
  userId: string;
  type: string;
  title: string;
  body: string;
  href?: string | null;
  actorId?: string | null;
  refType?: string | null;
  refId?: string | null;
  dedupeKey?: string | null;
};

export async function createNotification(
  input: CreateNotificationInput,
): Promise<NotificationRow> {
  const data = {
    userId: input.userId,
    type: input.type,
    title: input.title,
    body: input.body,
    href: input.href ?? null,
    actorId: input.actorId ?? null,
    refType: input.refType ?? null,
    refId: input.refId ?? null,
    dedupeKey: input.dedupeKey ?? null,
    readAt: null,
  };

  if (input.dedupeKey) {
    return prisma.notification.upsert({
      where: {
        userId_dedupeKey: { userId: input.userId, dedupeKey: input.dedupeKey },
      },
      create: data,
      update: {
        type: data.type,
        title: data.title,
        body: data.body,
        href: data.href,
        actorId: data.actorId,
        refType: data.refType,
        refId: data.refId,
        readAt: null,
        createdAt: new Date(),
      },
      include: notificationInclude,
    });
  }

  return prisma.notification.create({
    data,
    include: notificationInclude,
  });
}

export async function listNotifications(input: {
  userId: string;
  types?: string[];
  unreadOnly?: boolean;
  skip: number;
  take: number;
}): Promise<{ rows: NotificationRow[]; total: number }> {
  const where: Prisma.NotificationWhereInput = { userId: input.userId };
  if (input.types && input.types.length > 0) {
    where.type = { in: input.types };
  }
  if (input.unreadOnly) {
    where.readAt = null;
  }

  const [rows, total] = await prisma.$transaction([
    prisma.notification.findMany({
      where,
      include: notificationInclude,
      orderBy: { createdAt: "desc" },
      skip: input.skip,
      take: input.take,
    }),
    prisma.notification.count({ where }),
  ]);

  return { rows, total };
}

export async function userAllowsNotificationGroup(
  userId: string,
  group: NotificationGroup,
): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      notifyAccount: true,
      notifyCommunity: true,
      notifyLearning: true,
      notifyMentorship: true,
      notifyModeration: true,
    },
  });
  if (!user) return true;
  switch (group) {
    case "account":
      return user.notifyAccount;
    case "community":
      return user.notifyCommunity;
    case "learning":
      return user.notifyLearning;
    case "mentorship":
      return user.notifyMentorship;
    case "moderation":
      return user.notifyModeration;
    default:
      return true;
  }
}

export async function countUnread(userId: string) {
  return prisma.notification.count({
    where: { userId, readAt: null },
  });
}

export async function markNotificationRead(userId: string, id: string) {
  const existing = await prisma.notification.findFirst({
    where: { id, userId },
    select: { id: true, readAt: true },
  });
  if (!existing) return null;
  if (existing.readAt) {
    return prisma.notification.findFirst({
      where: { id, userId },
      include: notificationInclude,
    });
  }
  return prisma.notification.update({
    where: { id },
    data: { readAt: new Date() },
    include: notificationInclude,
  });
}

export async function markAllNotificationsRead(userId: string) {
  const result = await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
  return result.count;
}

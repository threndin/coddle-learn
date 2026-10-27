import {
  NOTIFICATION_LIMITS,
  isNotificationFilter,
  notificationGroup,
  typesForNotificationFilter,
  type NotificationFilter,
  type NotificationType,
} from "@coddle/shared";
import { AppError } from "../../shared/errors.js";
import {
  countUnread,
  createNotification,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type CreateNotificationInput,
  type NotificationActor,
  type NotificationRow,
} from "./notifications.repository.js";

export type NotifyInput = {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  href?: string | null;
  actorId?: string | null;
  refType?: string | null;
  refId?: string | null;
  dedupeKey?: string | null;
};

function clamp(value: string, max: number) {
  const trimmed = value.trim();
  return trimmed.length <= max ? trimmed : `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

function payload(row: NotificationRow) {
  return {
    id: row.id,
    type: row.type,
    group: notificationGroup(row.type),
    title: row.title,
    body: row.body,
    href: row.href,
    refType: row.refType,
    refId: row.refId,
    readAt: row.readAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    actor: row.actor
      ? {
          id: row.actor.id,
          username: row.actor.username,
          name: row.actor.name,
          avatarUrl: row.actor.avatarUrl,
        }
      : null,
  };
}

/**
 * Write a notification. Never notifies the actor, and never throws to callers —
 * inbox failures should not roll back the original action.
 */
export async function notify(input: NotifyInput): Promise<void> {
  if (!input.userId || input.userId === input.actorId) return;

  const data: CreateNotificationInput = {
    userId: input.userId,
    type: input.type,
    title: clamp(input.title, NOTIFICATION_LIMITS.titleMax),
    body: clamp(input.body, NOTIFICATION_LIMITS.bodyMax),
    href: input.href ? clamp(input.href, NOTIFICATION_LIMITS.hrefMax) : null,
    actorId: input.actorId ?? null,
    refType: input.refType ?? null,
    refId: input.refId ?? null,
    dedupeKey: input.dedupeKey ?? null,
  };

  if (!data.title || !data.body) return;

  try {
    await createNotification(data);
  } catch (error) {
    console.error("[notifications] notify failed", {
      type: input.type,
      userId: input.userId,
      error,
    });
  }
}

export function actorName(actor: { name?: string | null; username?: string | null } | null | undefined) {
  const name = actor?.name?.trim();
  if (name) return name;
  const username = actor?.username?.trim();
  if (username) return `@${username}`;
  return "Someone";
}

export function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || name.trim() || "there";
}

export async function listMyNotifications(
  userId: string,
  query: Record<string, unknown>,
) {
  const rawFilter = Array.isArray(query.filter) ? query.filter[0] : query.filter;
  const filter: NotificationFilter = isNotificationFilter(rawFilter) ? rawFilter : "all";
  const pageRaw = Array.isArray(query.page) ? query.page[0] : query.page;
  const pageNum = Number.parseInt(String(pageRaw ?? "1"), 10);
  const page = Number.isFinite(pageNum) && pageNum > 0 ? Math.min(pageNum, 1000) : 1;

  const types = typesForNotificationFilter(filter);
  const { rows, total } = await listNotifications({
    userId,
    types: types ?? undefined,
    unreadOnly: filter === "unread",
    skip: (page - 1) * NOTIFICATION_LIMITS.pageSize,
    take: NOTIFICATION_LIMITS.pageSize,
  });

  const unreadCount = await countUnread(userId);

  return {
    filter,
    page,
    pageSize: NOTIFICATION_LIMITS.pageSize,
    total,
    hasMore: page * NOTIFICATION_LIMITS.pageSize < total,
    unreadCount,
    notifications: rows.map(payload),
  };
}

export async function getUnreadCount(userId: string) {
  return { unreadCount: await countUnread(userId) };
}

export async function readNotification(userId: string, id: string) {
  const row = await markNotificationRead(userId, id);
  if (!row) {
    throw new AppError(404, "notification_missing", "That notification could not be found.");
  }
  return {
    notification: payload(row),
    unreadCount: await countUnread(userId),
  };
}

export async function readAllNotifications(userId: string) {
  const marked = await markAllNotificationsRead(userId);
  return { marked, unreadCount: 0 };
}

export type { NotificationActor };

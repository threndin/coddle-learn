import type { Request, Response } from "express";
import { AppError } from "../../shared/errors.js";
import type { AuthedRequest } from "../auth/auth.middleware.js";
import {
  getUnreadCount,
  listMyNotifications,
  readAllNotifications,
  readNotification,
} from "./notifications.service.js";

function requireUserId(req: Request) {
  const session = (req as AuthedRequest).session;
  if (!session) {
    throw new AppError(401, "unauthenticated", "Sign in with your Coddle account to continue");
  }
  return session.sub;
}

function param(req: Request, name: string) {
  return String(req.params[name] ?? "");
}

export async function listHandler(req: Request, res: Response) {
  res.json({
    data: await listMyNotifications(requireUserId(req), req.query as Record<string, unknown>),
  });
}

export async function unreadCountHandler(req: Request, res: Response) {
  res.json({ data: await getUnreadCount(requireUserId(req)) });
}

export async function readHandler(req: Request, res: Response) {
  res.json({ data: await readNotification(requireUserId(req), param(req, "id")) });
}

export async function readAllHandler(req: Request, res: Response) {
  res.json({ data: await readAllNotifications(requireUserId(req)) });
}

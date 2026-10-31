import type { Request, Response } from "express";
import { AppError } from "../../shared/errors.js";
import type { AuthedRequest } from "../auth/auth.middleware.js";
import {
  getAdminOverview,
  getAdminUsage,
  getAdminUsers,
  setUserSuspended,
} from "./admin.service.js";

function requireUserId(req: Request) {
  const session = (req as AuthedRequest).session;
  if (!session) {
    throw new AppError(401, "unauthenticated", "Sign in with your Coddle account to continue");
  }
  return session.sub;
}

export async function overviewHandler(_req: Request, res: Response) {
  res.json({ data: await getAdminOverview() });
}

export async function usersHandler(req: Request, res: Response) {
  res.json({ data: await getAdminUsers(req.query as Record<string, unknown>) });
}

export async function usageHandler(req: Request, res: Response) {
  res.json({ data: await getAdminUsage(req.query as Record<string, unknown>) });
}

export async function suspendUserHandler(req: Request, res: Response) {
  res.json({
    data: await setUserSuspended(requireUserId(req), String(req.params.id ?? ""), true),
  });
}

export async function restoreUserHandler(req: Request, res: Response) {
  res.json({
    data: await setUserSuspended(requireUserId(req), String(req.params.id ?? ""), false),
  });
}

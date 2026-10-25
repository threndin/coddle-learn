import type { Request, Response } from "express";
import { AppError } from "../../shared/errors.js";
import type { AuthedRequest } from "../auth/auth.middleware.js";
import { getLeaderboard } from "./leaderboard.service.js";

function requireUserId(req: Request) {
  const session = (req as AuthedRequest).session;
  if (!session) {
    throw new AppError(401, "unauthenticated", "Sign in with your Coddle account to continue");
  }
  return session.sub;
}

export async function listHandler(req: Request, res: Response) {
  const data = await getLeaderboard(requireUserId(req), {
    period: req.query.period,
    page: req.query.page,
    pageSize: req.query.pageSize,
  });
  res.json({ data });
}

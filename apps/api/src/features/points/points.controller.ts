import type { Request, Response } from "express";
import { AppError } from "../../shared/errors.js";
import type { AuthedRequest } from "../auth/auth.middleware.js";
import { getPointActivity } from "./points.service.js";

function requireUserId(req: Request) {
  const session = (req as AuthedRequest).session;
  if (!session) {
    throw new AppError(401, "unauthenticated", "Sign in with your Coddle account to continue");
  }
  return session.sub;
}

export async function activityHandler(req: Request, res: Response) {
  res.json({ data: await getPointActivity(requireUserId(req)) });
}

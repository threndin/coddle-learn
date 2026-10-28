import type { Request, Response } from "express";
import { AppError } from "../../shared/errors.js";
import type { AuthedRequest } from "../auth/auth.middleware.js";
import { updateOwnSettings } from "./settings.service.js";

export async function updateMeHandler(req: Request, res: Response) {
  const session = (req as AuthedRequest).session;
  if (!session) {
    throw new AppError(401, "unauthenticated", "Sign in with your Coddle account to continue");
  }
  res.json({
    data: { user: await updateOwnSettings(session.sub, req.body) },
  });
}

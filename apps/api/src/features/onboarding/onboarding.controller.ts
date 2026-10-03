import type { Request, Response } from "express";
import { AppError } from "../../shared/errors.js";
import type { AuthedRequest } from "../auth/auth.middleware.js";
import { completeOnboarding } from "./onboarding.service.js";

export async function submitOnboarding(req: Request, res: Response) {
  const session = (req as AuthedRequest).session;
  if (!session) {
    throw new AppError(401, "unauthenticated", "Sign in with your Coddle account to continue");
  }
  const user = await completeOnboarding(session.sub, req.body);
  res.json({ data: { user } });
}

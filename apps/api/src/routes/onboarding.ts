import { Router, type NextFunction, type Request, type Response } from "express";
import { AppError } from "../lib/errors.js";
import {
  requireAuth,
  requireCsrf,
  type AuthedRequest,
} from "../middleware/auth.js";
import { completeOnboarding } from "../services/onboarding.js";

export const onboardingRouter: Router = Router();

onboardingRouter.post("/", requireAuth, requireCsrf, (req: Request, res: Response, next: NextFunction) => {
  void (async () => {
    const session = (req as AuthedRequest).session;
    if (!session) {
      throw new AppError(401, "unauthenticated", "Sign in with your Coddle account to continue");
    }
    const user = await completeOnboarding(session.sub, req.body);
    res.json({ data: { user } });
  })().catch(next);
});

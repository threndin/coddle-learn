import type { Request, Response } from "express";
import { AppError } from "../../shared/errors.js";
import { assertUserRateLimit } from "../../shared/rate-limit.js";
import type { AuthedRequest } from "../auth/auth.middleware.js";
import { searchCatalog } from "./search.service.js";

function requireSession(req: Request) {
  const session = (req as AuthedRequest).session;
  if (!session) {
    throw new AppError(401, "unauthenticated", "Sign in with your Coddle account to continue");
  }
  return session;
}

export async function searchHandler(req: Request, res: Response) {
  const session = requireSession(req);
  assertUserRateLimit(session.sub, "search", {
    max: 40,
    windowMs: 60_000,
    message: "Too many searches. Try again in a minute.",
  });
  const data = await searchCatalog(req.query as Record<string, unknown>);
  res.json({ data });
}

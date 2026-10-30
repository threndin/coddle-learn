import type { Request, Response } from "express";
import { AppError } from "../../shared/errors.js";
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
  requireSession(req);
  const data = await searchCatalog(req.query as Record<string, unknown>);
  res.json({ data });
}

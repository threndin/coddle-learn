import type { Request, Response } from "express";
import { isReviewAction } from "@coddle/shared";
import { AppError } from "../../shared/errors.js";
import type { AuthedRequest } from "../auth/auth.middleware.js";
import { decideReviewItem, getReviewQueue } from "./reviewers.service.js";

function requireUserId(req: Request) {
  const session = (req as AuthedRequest).session;
  if (!session) {
    throw new AppError(401, "unauthenticated", "Sign in with your Coddle account to continue");
  }
  return session.sub;
}

export async function listQueueHandler(req: Request, res: Response) {
  const data = await getReviewQueue(requireUserId(req), req.query as Record<string, unknown>);
  res.json({ data });
}

export async function decideHandler(req: Request, res: Response) {
  const action = String(req.params.action ?? "");
  if (!isReviewAction(action)) {
    throw new AppError(400, "invalid_action", "Choose approve, decline, or flag.");
  }
  const item = await decideReviewItem(
    requireUserId(req),
    String(req.params.kind ?? ""),
    String(req.params.id ?? ""),
    action,
    req.body,
  );
  res.json({ data: { item } });
}

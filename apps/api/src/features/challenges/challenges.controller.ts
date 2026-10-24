import type { Request, Response } from "express";
import { AppError } from "../../shared/errors.js";
import type { AuthedRequest } from "../auth/auth.middleware.js";
import {
  getChallengeCatalog,
  getChallengeDetail,
  submitChallengeSolution,
} from "./challenges.service.js";

function requireSession(req: Request) {
  const session = (req as AuthedRequest).session;
  if (!session) {
    throw new AppError(401, "unauthenticated", "Sign in with your Coddle account to continue");
  }
  return session;
}

export async function listChallengesHandler(req: Request, res: Response) {
  const session = requireSession(req);
  const data = await getChallengeCatalog(session.sub);
  res.json({ data });
}

export async function getChallengeHandler(req: Request, res: Response) {
  const session = requireSession(req);
  const data = await getChallengeDetail(session.sub, String(req.params.slug ?? ""));
  res.json({ data });
}

export async function submitChallengeHandler(req: Request, res: Response) {
  const session = requireSession(req);
  const data = await submitChallengeSolution(
    session.sub,
    String(req.params.slug ?? ""),
    req.body,
  );
  res.json({ data });
}

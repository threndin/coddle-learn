import type { Request, Response } from "express";
import { AppError } from "../../shared/errors.js";
import type { AuthedRequest } from "../auth/auth.middleware.js";
import {
  getAssessmentAttempt,
  getAssessmentCatalog,
  getAssessmentDetail,
  startAssessmentAttempt,
  submitAssessmentAttempt,
} from "./assessments.service.js";

function requireSession(req: Request) {
  const session = (req as AuthedRequest).session;
  if (!session) {
    throw new AppError(401, "unauthenticated", "Sign in with your Coddle account to continue");
  }
  return session;
}

export async function listAssessmentsHandler(req: Request, res: Response) {
  const session = requireSession(req);
  const data = await getAssessmentCatalog(session.sub);
  res.json({ data });
}

export async function getAssessmentHandler(req: Request, res: Response) {
  const session = requireSession(req);
  const id = String(req.params.id ?? "");
  const data = await getAssessmentDetail(session.sub, id);
  res.json({ data });
}

export async function startAttemptHandler(req: Request, res: Response) {
  const session = requireSession(req);
  const id = String(req.params.id ?? "");
  const data = await startAssessmentAttempt(session.sub, id);
  res.json({ data });
}

export async function submitAttemptHandler(req: Request, res: Response) {
  const session = requireSession(req);
  const id = String(req.params.id ?? "");
  const attemptId = String(req.params.attemptId ?? "");
  const data = await submitAssessmentAttempt(session.sub, id, attemptId, req.body);
  res.json({ data });
}

export async function getAttemptHandler(req: Request, res: Response) {
  const session = requireSession(req);
  const id = String(req.params.id ?? "");
  const attemptId = String(req.params.attemptId ?? "");
  const data = await getAssessmentAttempt(session.sub, id, attemptId);
  res.json({ data });
}

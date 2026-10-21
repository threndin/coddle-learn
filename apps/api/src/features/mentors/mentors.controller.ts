import type { Request, Response } from "express";
import { AppError } from "../../shared/errors.js";
import type { AuthedRequest } from "../auth/auth.middleware.js";
import {
  applyToProgram,
  approveApplication,
  completeApplication,
  createMyProgram,
  declineApplication,
  getMentorByUsername,
  getMentorCatalog,
  getMyMentorship,
  updateMyProgram,
  upsertMyMentorProfile,
  withdrawApplication,
} from "./mentors.service.js";

function requireSession(req: Request) {
  const session = (req as AuthedRequest).session;
  if (!session) {
    throw new AppError(401, "unauthenticated", "Sign in with your Coddle account to continue");
  }
  return session;
}

export async function listMentorsHandler(req: Request, res: Response) {
  const session = requireSession(req);
  const data = await getMentorCatalog(session.sub, req.query as Record<string, unknown>);
  res.json({ data });
}

export async function getMyMentorshipHandler(req: Request, res: Response) {
  const session = requireSession(req);
  const data = await getMyMentorship(session.sub);
  res.json({ data });
}

export async function upsertMyMentorProfileHandler(req: Request, res: Response) {
  const session = requireSession(req);
  const data = await upsertMyMentorProfile(session.sub, req.body);
  res.json({ data });
}

export async function createMyProgramHandler(req: Request, res: Response) {
  const session = requireSession(req);
  const data = await createMyProgram(session.sub, req.body);
  res.status(201).json({ data });
}

export async function updateMyProgramHandler(req: Request, res: Response) {
  const session = requireSession(req);
  const data = await updateMyProgram(session.sub, String(req.params.id ?? ""), req.body);
  res.json({ data });
}

export async function getMentorHandler(req: Request, res: Response) {
  const session = requireSession(req);
  const data = await getMentorByUsername(session.sub, String(req.params.username ?? ""));
  res.json({ data });
}

export async function applyToProgramHandler(req: Request, res: Response) {
  const session = requireSession(req);
  const data = await applyToProgram(
    session.sub,
    String(req.params.username ?? ""),
    String(req.params.slug ?? ""),
    req.body,
  );
  res.status(201).json({ data });
}

export async function approveApplicationHandler(req: Request, res: Response) {
  const session = requireSession(req);
  const data = await approveApplication(session.sub, String(req.params.id ?? ""), req.body);
  res.json({ data });
}

export async function declineApplicationHandler(req: Request, res: Response) {
  const session = requireSession(req);
  const data = await declineApplication(session.sub, String(req.params.id ?? ""), req.body);
  res.json({ data });
}

export async function completeApplicationHandler(req: Request, res: Response) {
  const session = requireSession(req);
  const data = await completeApplication(session.sub, String(req.params.id ?? ""));
  res.json({ data });
}

export async function withdrawApplicationHandler(req: Request, res: Response) {
  const session = requireSession(req);
  const data = await withdrawApplication(session.sub, String(req.params.id ?? ""));
  res.json({ data });
}

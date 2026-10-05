import type { Request, Response } from "express";
import { AppError } from "../../shared/errors.js";
import type { AuthedRequest } from "../auth/auth.middleware.js";
import {
  getContinueLearning,
  getRoadmapCatalog,
  getRoadmapDetail,
  markRoadmapPrimary,
  startRoadmap,
  toggleResourceBookmark,
  updateRoadmapProgress,
} from "./roadmaps.service.js";

function requireSession(req: Request) {
  const session = (req as AuthedRequest).session;
  if (!session) {
    throw new AppError(401, "unauthenticated", "Sign in with your Coddle account to continue");
  }
  return session;
}

export async function listRoadmapsHandler(req: Request, res: Response) {
  const session = requireSession(req);
  const data = await getRoadmapCatalog(session.sub);
  res.json({ data });
}

export async function getContinueHandler(req: Request, res: Response) {
  const session = requireSession(req);
  const data = await getContinueLearning(session.sub);
  res.json({ data });
}

export async function getRoadmapHandler(req: Request, res: Response) {
  const session = requireSession(req);
  const slug = String(req.params.slug ?? "");
  const data = await getRoadmapDetail(session.sub, slug);
  res.json({ data });
}

export async function startRoadmapHandler(req: Request, res: Response) {
  const session = requireSession(req);
  const slug = String(req.params.slug ?? "");
  const makePrimary = Boolean((req.body as { makePrimary?: boolean } | undefined)?.makePrimary);
  const data = await startRoadmap(session.sub, slug, { makePrimary });
  res.json({ data });
}

export async function primaryRoadmapHandler(req: Request, res: Response) {
  const session = requireSession(req);
  const slug = String(req.params.slug ?? "");
  const data = await markRoadmapPrimary(session.sub, slug);
  res.json({ data });
}

export async function updateProgressHandler(req: Request, res: Response) {
  const session = requireSession(req);
  const slug = String(req.params.slug ?? "");
  const data = await updateRoadmapProgress(session.sub, slug, req.body);
  res.json({ data });
}

export async function bookmarkHandler(req: Request, res: Response) {
  const session = requireSession(req);
  const slug = String(req.params.slug ?? "");
  const data = await toggleResourceBookmark(session.sub, slug, req.body);
  res.json({ data });
}

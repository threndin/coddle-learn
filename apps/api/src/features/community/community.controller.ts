import type { Request, Response } from "express";
import { AppError } from "../../shared/errors.js";
import type { AuthedRequest } from "../auth/auth.middleware.js";
import {
  createCommunityFeedPost,
  deleteCommunityFeedPost,
  getCommunityCatalog,
  getSpotlightLearners,
  listRelatedOptions,
  recordCommunityImpression,
  setCommunityReaction,
  uploadCommunityImage,
} from "./community.service.js";

function requireSession(req: Request) {
  const session = (req as AuthedRequest).session;
  if (!session) {
    throw new AppError(401, "unauthenticated", "Sign in with your Coddle account to continue");
  }
  return session;
}

function param(req: Request, name: string) {
  return String(req.params[name] ?? "");
}

export async function listCommunityHandler(req: Request, res: Response) {
  const session = requireSession(req);
  const data = await getCommunityCatalog(session.sub, req.query as Record<string, unknown>);
  res.json({ data });
}

export async function createCommunityHandler(req: Request, res: Response) {
  const session = requireSession(req);
  const files = (req.files as Express.Multer.File[] | undefined) ?? [];
  const data = await createCommunityFeedPost(session.sub, req.body, files);
  res.status(201).json({ data });
}

export async function deleteCommunityHandler(req: Request, res: Response) {
  const session = requireSession(req);
  const data = await deleteCommunityFeedPost(session.sub, param(req, "id"));
  res.json({ data });
}

export async function relatedOptionsHandler(req: Request, res: Response) {
  requireSession(req);
  const data = await listRelatedOptions(req.query.topic, req.query.q);
  res.json({ data });
}

export async function spotlightHandler(req: Request, res: Response) {
  const session = requireSession(req);
  const data = await getSpotlightLearners(session.sub);
  res.json({ data });
}

export async function uploadImageHandler(req: Request, res: Response) {
  const session = requireSession(req);
  const data = await uploadCommunityImage(session.sub, req.headers["content-type"], req.body);
  res.status(201).json({ data });
}

export async function impressionHandler(req: Request, res: Response) {
  const session = requireSession(req);
  const data = await recordCommunityImpression(session.sub, param(req, "id"));
  res.json({ data });
}

export async function reactionHandler(req: Request, res: Response) {
  const session = requireSession(req);
  const data = await setCommunityReaction(session.sub, param(req, "id"), req.body);
  res.json({ data });
}

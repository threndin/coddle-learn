import type { Request, Response } from "express";
import { AppError } from "../../shared/errors.js";
import type { AuthedRequest } from "../auth/auth.middleware.js";
import {
  getToolBySlug,
  getToolCatalog,
  removeTool,
  setToolBookmark,
  submitTool,
  uploadToolImage,
} from "./tools.service.js";

function requireSession(req: Request) {
  const session = (req as AuthedRequest).session;
  if (!session) {
    throw new AppError(401, "unauthenticated", "Sign in with your Coddle account to continue");
  }
  return session;
}

export async function listToolsHandler(req: Request, res: Response) {
  const session = requireSession(req);
  const data = await getToolCatalog(session.sub, req.query as Record<string, unknown>);
  res.json({ data });
}

export async function getToolHandler(req: Request, res: Response) {
  const session = requireSession(req);
  const data = await getToolBySlug(session.sub, String(req.params.slug ?? ""));
  res.json({ data });
}

export async function submitToolHandler(req: Request, res: Response) {
  const session = requireSession(req);
  const data = await submitTool(session.sub, req.body);
  res.status(201).json({ data });
}

export async function deleteToolHandler(req: Request, res: Response) {
  const session = requireSession(req);
  const data = await removeTool(session.sub, String(req.params.id ?? ""));
  res.json({ data });
}

export async function saveBookmarkHandler(req: Request, res: Response) {
  const session = requireSession(req);
  const data = await setToolBookmark(session.sub, String(req.params.id ?? ""), true);
  res.json({ data });
}

export async function removeBookmarkHandler(req: Request, res: Response) {
  const session = requireSession(req);
  const data = await setToolBookmark(session.sub, String(req.params.id ?? ""), false);
  res.json({ data });
}

export async function uploadImageHandler(req: Request, res: Response) {
  const session = requireSession(req);
  const data = await uploadToolImage(session.sub, req.headers["content-type"], req.body);
  res.status(201).json({ data });
}

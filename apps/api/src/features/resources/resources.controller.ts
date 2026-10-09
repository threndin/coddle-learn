import type { Request, Response } from "express";
import { AppError } from "../../shared/errors.js";
import type { AuthedRequest } from "../auth/auth.middleware.js";
import {
  getResourceCatalog,
  removeResource,
  setResourceBookmark,
  submitResource,
} from "./resources.service.js";

function requireSession(req: Request) {
  const session = (req as AuthedRequest).session;
  if (!session) {
    throw new AppError(401, "unauthenticated", "Sign in with your Coddle account to continue");
  }
  return session;
}

export async function listResourcesHandler(req: Request, res: Response) {
  const session = requireSession(req);
  const data = await getResourceCatalog(session.sub, req.query as Record<string, unknown>);
  res.json({ data });
}

export async function submitResourceHandler(req: Request, res: Response) {
  const session = requireSession(req);
  const data = await submitResource(session.sub, req.body);
  res.status(201).json({ data });
}

export async function deleteResourceHandler(req: Request, res: Response) {
  const session = requireSession(req);
  const data = await removeResource(session.sub, String(req.params.id ?? ""));
  res.json({ data });
}

export async function saveBookmarkHandler(req: Request, res: Response) {
  const session = requireSession(req);
  const data = await setResourceBookmark(session.sub, String(req.params.id ?? ""), true);
  res.json({ data });
}

export async function removeBookmarkHandler(req: Request, res: Response) {
  const session = requireSession(req);
  const data = await setResourceBookmark(session.sub, String(req.params.id ?? ""), false);
  res.json({ data });
}

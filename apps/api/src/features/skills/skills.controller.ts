import type { Request, Response } from "express";
import { AppError } from "../../shared/errors.js";
import type { AuthedRequest } from "../auth/auth.middleware.js";
import { getMySkillGraph, getMySkillNode } from "./skills.service.js";

function requireUserId(req: Request) {
  const session = (req as AuthedRequest).session;
  if (!session) {
    throw new AppError(401, "unauthenticated", "Sign in with your Coddle account to continue");
  }
  return session.sub;
}

function param(req: Request, name: string) {
  return String(req.params[name] ?? "");
}

export async function listHandler(req: Request, res: Response) {
  res.json({ data: await getMySkillGraph(requireUserId(req)) });
}

export async function getHandler(req: Request, res: Response) {
  res.json({ data: await getMySkillNode(requireUserId(req), param(req, "slug")) });
}

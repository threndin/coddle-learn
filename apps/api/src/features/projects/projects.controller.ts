import type { Request, Response } from "express";
import { AppError } from "../../shared/errors.js";
import type { AuthedRequest } from "../auth/auth.middleware.js";
import {
  getProject,
  listMyProjectActivity,
  listProjects,
  startProject,
  submitProject,
} from "./projects.service.js";
import {
  archiveStudioProject,
  createStudioProject,
  deleteStudioProject,
  getStudioProject,
  getStudioProjectOptions,
  listStudioProjects,
  restoreStudioProject,
  submitStudioProject,
  updateStudioProject,
  withdrawStudioProject,
} from "./studio-projects.service.js";

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
  res.json({ data: await listProjects(requireUserId(req)) });
}

export async function mineHandler(req: Request, res: Response) {
  res.json({ data: await listMyProjectActivity(requireUserId(req)) });
}

export async function getHandler(req: Request, res: Response) {
  res.json({ data: await getProject(requireUserId(req), param(req, "slug")) });
}

export async function startHandler(req: Request, res: Response) {
  res.json({ data: await startProject(requireUserId(req), param(req, "slug")) });
}

export async function submitHandler(req: Request, res: Response) {
  res.json({
    data: await submitProject(requireUserId(req), param(req, "slug"), req.body),
  });
}

export async function studioListHandler(req: Request, res: Response) {
  res.json({ data: await listStudioProjects(requireUserId(req)) });
}

export async function studioOptionsHandler(_req: Request, res: Response) {
  res.json({ data: await getStudioProjectOptions() });
}

export async function studioGetHandler(req: Request, res: Response) {
  res.json({
    data: await getStudioProject(requireUserId(req), param(req, "projectId")),
  });
}

export async function studioCreateHandler(req: Request, res: Response) {
  res.status(201).json({
    data: await createStudioProject(requireUserId(req), req.body),
  });
}

export async function studioUpdateHandler(req: Request, res: Response) {
  res.json({
    data: await updateStudioProject(
      requireUserId(req),
      param(req, "projectId"),
      req.body,
    ),
  });
}

export async function studioDeleteHandler(req: Request, res: Response) {
  res.json({
    data: await deleteStudioProject(requireUserId(req), param(req, "projectId")),
  });
}

export async function studioSubmitHandler(req: Request, res: Response) {
  res.json({
    data: await submitStudioProject(requireUserId(req), param(req, "projectId")),
  });
}

export async function studioWithdrawHandler(req: Request, res: Response) {
  res.json({
    data: await withdrawStudioProject(requireUserId(req), param(req, "projectId")),
  });
}

export async function studioArchiveHandler(req: Request, res: Response) {
  res.json({
    data: await archiveStudioProject(requireUserId(req), param(req, "projectId")),
  });
}

export async function studioRestoreHandler(req: Request, res: Response) {
  res.json({
    data: await restoreStudioProject(requireUserId(req), param(req, "projectId")),
  });
}

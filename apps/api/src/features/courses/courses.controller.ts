import type { Request, Response } from "express";
import { AppError } from "../../shared/errors.js";
import type { AuthedRequest } from "../auth/auth.middleware.js";
import {
  getContinueCourse,
  getCourseCatalog,
  getCourseDetail,
  startCourse,
  updateCourseProgress,
} from "./courses.service.js";

function requireSession(req: Request) {
  const session = (req as AuthedRequest).session;
  if (!session) {
    throw new AppError(401, "unauthenticated", "Sign in with your Coddle account to continue");
  }
  return session;
}

export async function listCoursesHandler(req: Request, res: Response) {
  const session = requireSession(req);
  const data = await getCourseCatalog(session.sub);
  res.json({ data });
}

export async function getContinueHandler(req: Request, res: Response) {
  const session = requireSession(req);
  const data = await getContinueCourse(session.sub);
  res.json({ data });
}

export async function getCourseHandler(req: Request, res: Response) {
  const session = requireSession(req);
  const slug = String(req.params.slug ?? "");
  const data = await getCourseDetail(session.sub, slug);
  res.json({ data });
}

export async function startCourseHandler(req: Request, res: Response) {
  const session = requireSession(req);
  const slug = String(req.params.slug ?? "");
  const data = await startCourse(session.sub, slug);
  res.json({ data });
}

export async function updateProgressHandler(req: Request, res: Response) {
  const session = requireSession(req);
  const slug = String(req.params.slug ?? "");
  const data = await updateCourseProgress(session.sub, slug, req.body);
  res.json({ data });
}

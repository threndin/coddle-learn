import type { Request, Response } from "express";
import { AppError } from "../../shared/errors.js";
import type { AuthedRequest } from "../auth/auth.middleware.js";
import {
  archiveStudioCourse,
  createStudioCourse,
  createStudioLesson,
  createStudioModule,
  deleteStudioCourse,
  deleteStudioLesson,
  deleteStudioModule,
  getStudioCourse,
  listStudioCourses,
  resetCourseThumbnail,
  restoreStudioCourse,
  submitStudioCourse,
  updateStudioCourse,
  updateStudioLesson,
  updateStudioModule,
  updateStudioOutline,
  uploadCourseThumbnail,
  uploadLessonAsset,
  withdrawStudioCourse,
} from "./studio.service.js";

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
  res.json({ data: await listStudioCourses(requireUserId(req)) });
}

export async function createHandler(req: Request, res: Response) {
  res.status(201).json({ data: await createStudioCourse(requireUserId(req), req.body) });
}

export async function getHandler(req: Request, res: Response) {
  res.json({ data: await getStudioCourse(requireUserId(req), param(req, "courseId")) });
}

export async function updateHandler(req: Request, res: Response) {
  res.json({
    data: await updateStudioCourse(requireUserId(req), param(req, "courseId"), req.body),
  });
}

export async function deleteHandler(req: Request, res: Response) {
  res.json({ data: await deleteStudioCourse(requireUserId(req), param(req, "courseId")) });
}

export async function submitHandler(req: Request, res: Response) {
  res.json({ data: await submitStudioCourse(requireUserId(req), param(req, "courseId")) });
}

export async function withdrawHandler(req: Request, res: Response) {
  res.json({ data: await withdrawStudioCourse(requireUserId(req), param(req, "courseId")) });
}

export async function archiveHandler(req: Request, res: Response) {
  res.json({ data: await archiveStudioCourse(requireUserId(req), param(req, "courseId")) });
}

export async function restoreHandler(req: Request, res: Response) {
  res.json({ data: await restoreStudioCourse(requireUserId(req), param(req, "courseId")) });
}

export async function uploadThumbnailHandler(req: Request, res: Response) {
  res.json({
    data: await uploadCourseThumbnail(
      requireUserId(req),
      param(req, "courseId"),
      req.header("content-type"),
      req.body,
    ),
  });
}

export async function resetThumbnailHandler(req: Request, res: Response) {
  res.json({ data: await resetCourseThumbnail(requireUserId(req), param(req, "courseId")) });
}

export async function uploadAssetHandler(req: Request, res: Response) {
  res.status(201).json({
    data: await uploadLessonAsset(
      requireUserId(req),
      param(req, "courseId"),
      req.header("content-type"),
      req.body,
    ),
  });
}

export async function createModuleHandler(req: Request, res: Response) {
  res.status(201).json({
    data: await createStudioModule(requireUserId(req), param(req, "courseId"), req.body),
  });
}

export async function updateModuleHandler(req: Request, res: Response) {
  res.json({
    data: await updateStudioModule(
      requireUserId(req),
      param(req, "courseId"),
      param(req, "moduleId"),
      req.body,
    ),
  });
}

export async function deleteModuleHandler(req: Request, res: Response) {
  res.json({
    data: await deleteStudioModule(requireUserId(req), param(req, "courseId"), param(req, "moduleId")),
  });
}

export async function createLessonHandler(req: Request, res: Response) {
  res.status(201).json({
    data: await createStudioLesson(
      requireUserId(req),
      param(req, "courseId"),
      param(req, "moduleId"),
      req.body,
    ),
  });
}

export async function updateLessonHandler(req: Request, res: Response) {
  res.json({
    data: await updateStudioLesson(
      requireUserId(req),
      param(req, "courseId"),
      param(req, "lessonId"),
      req.body,
    ),
  });
}

export async function deleteLessonHandler(req: Request, res: Response) {
  res.json({
    data: await deleteStudioLesson(requireUserId(req), param(req, "courseId"), param(req, "lessonId")),
  });
}

export async function outlineHandler(req: Request, res: Response) {
  res.json({
    data: await updateStudioOutline(requireUserId(req), param(req, "courseId"), req.body),
  });
}

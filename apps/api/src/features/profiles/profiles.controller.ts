import type { Request, Response } from "express";
import { AppError } from "../../shared/errors.js";
import type { AuthedRequest } from "../auth/auth.middleware.js";
import {
  followProfile,
  getProfileFollowers,
  getProfileFollowing,
  getPublicProfile,
  unfollowProfile,
  updateOwnProfile,
} from "./profiles.service.js";

function requireUserId(req: Request) {
  const session = (req as AuthedRequest).session;
  if (!session) {
    throw new AppError(401, "unauthenticated", "Sign in with your Coddle account to continue");
  }
  return session.sub;
}

function optionalUserId(req: Request) {
  return (req as AuthedRequest).session?.sub ?? null;
}

function param(req: Request, name: string) {
  return String(req.params[name] ?? "");
}

export async function updateMeHandler(req: Request, res: Response) {
  res.json({
    data: { user: await updateOwnProfile(requireUserId(req), req.body) },
  });
}

export async function getProfileHandler(req: Request, res: Response) {
  res.json({
    data: await getPublicProfile(param(req, "username"), optionalUserId(req)),
  });
}

export async function followHandler(req: Request, res: Response) {
  res.json({
    data: await followProfile(requireUserId(req), param(req, "username")),
  });
}

export async function unfollowHandler(req: Request, res: Response) {
  res.json({
    data: await unfollowProfile(requireUserId(req), param(req, "username")),
  });
}

export async function followersHandler(req: Request, res: Response) {
  res.json({ data: await getProfileFollowers(param(req, "username")) });
}

export async function followingHandler(req: Request, res: Response) {
  res.json({ data: await getProfileFollowing(param(req, "username")) });
}

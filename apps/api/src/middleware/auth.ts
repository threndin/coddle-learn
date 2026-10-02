import { timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { COOKIE } from "../config.js";
import { readCsrfCookie } from "../lib/cookies.js";
import { AppError, isAppError } from "../lib/errors.js";
import { verifySession, type SessionClaims } from "../lib/jwt.js";
import { findUserById, toPublicUser } from "../services/users.js";

export type AuthedRequest = Request & {
  session?: SessionClaims;
};

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export async function requireAuth(req: AuthedRequest, _res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    const bearer =
      typeof header === "string" && header.startsWith("Bearer ")
        ? header.slice("Bearer ".length).trim()
        : null;
    const cookieToken =
      typeof req.cookies?.[COOKIE.session] === "string"
        ? (req.cookies[COOKIE.session] as string)
        : null;
    const token = bearer || cookieToken;

    if (!token) {
      throw new AppError(401, "unauthenticated", "Sign in with your Coddle account to continue");
    }

    req.session = await verifySession(token);
    next();
  } catch (error) {
    if (isAppError(error)) {
      next(error);
      return;
    }
    next(new AppError(401, "invalid_session", "Session expired. Sign in again."));
  }
}

export function requireCsrf(req: Request, _res: Response, next: NextFunction) {
  const cookieToken = readCsrfCookie(req);
  const headerToken = req.header("x-csrf-token");
  if (!cookieToken || !headerToken || !safeEqual(cookieToken, headerToken)) {
    next(new AppError(403, "csrf_failed", "Invalid CSRF token"));
    return;
  }
  next();
}

export async function getCurrentUser(req: AuthedRequest) {
  if (!req.session) {
    throw new AppError(401, "unauthenticated", "Sign in required");
  }
  const user = await findUserById(req.session.sub);
  if (!user) {
    throw new AppError(401, "user_missing", "Account no longer exists. Sign in again.");
  }
  return toPublicUser(user);
}

export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (isAppError(error)) {
    res.status(error.status).json({
      error: {
        code: error.code,
        message: error.message,
        details: error.details ?? undefined,
      },
    });
    return;
  }

  console.error(error);
  res.status(500).json({
    error: {
      code: "internal_error",
      message: "Something went wrong",
    },
  });
}

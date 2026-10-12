import { timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { COOKIE } from "../../config.js";
import { AppError, isAppError } from "../../shared/errors.js";
import { readCsrfCookie } from "./cookies.js";
import { verifySession, type SessionClaims } from "./session.js";

export type AuthedRequest = Request & {
  session?: SessionClaims;
};

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

function readAccessToken(req: Request): string | null {
  const header = req.headers.authorization;
  const bearer =
    typeof header === "string" && header.startsWith("Bearer ")
      ? header.slice("Bearer ".length).trim()
      : null;
  const cookieToken =
    typeof req.cookies?.[COOKIE.session] === "string"
      ? (req.cookies[COOKIE.session] as string)
      : null;
  return bearer || cookieToken;
}

export async function requireAuth(req: AuthedRequest, _res: Response, next: NextFunction) {
  try {
    const token = readAccessToken(req);
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

/** Attaches session when a valid access token is present; otherwise continues. */
export async function optionalAuth(req: AuthedRequest, _res: Response, next: NextFunction) {
  try {
    const token = readAccessToken(req);
    if (token) {
      req.session = await verifySession(token);
    }
  } catch {
    // Access may already be expired; refresh cookie can still revoke on logout.
  }
  next();
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

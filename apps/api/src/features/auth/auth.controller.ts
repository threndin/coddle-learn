import type { Request, Response } from "express";
import { config } from "../../config.js";
import { AppError } from "../../shared/errors.js";
import type { AuthedRequest } from "./auth.middleware.js";
import {
  completeCoddleSignIn,
  getCurrentUser,
  logoutSession,
  rotateRefreshToken,
  startCoddleSignIn,
} from "./auth.service.js";
import {
  clearAuthCookies,
  readRefreshCookie,
  setAuthCookies,
  setCsrfCookie,
} from "./cookies.js";

export async function startCoddle(_req: Request, res: Response) {
  const loginUrl = await startCoddleSignIn();
  res.redirect(302, loginUrl);
}

export async function finishCoddle(req: Request, res: Response) {
  try {
    const code = typeof req.body?.code === "string" ? req.body.code.trim() : "";
    const state = typeof req.body?.state === "string" ? req.body.state : undefined;

    if (!code) {
      throw new AppError(400, "missing_code", "Missing SSO code");
    }

    const { user, tokens } = await completeCoddleSignIn(code, state);
    setAuthCookies(res, tokens);
    setCsrfCookie(res);
    const nextPath = user.onboardingCompletedAt ? "/dashboard" : "/onboarding";
    res.redirect(302, `${config.webOrigin}${nextPath}`);
  } catch (error) {
    console.error("[auth/coddle/finish]", error);
    res.redirect(302, `${config.webOrigin}/login?error=signin_failed`);
  }
}

export async function me(req: Request, res: Response) {
  const user = await getCurrentUser(req as AuthedRequest);
  const csrf = setCsrfCookie(res);
  res.json({ data: { user, csrf } });
}

export async function refresh(req: Request, res: Response) {
  const refreshToken = readRefreshCookie(req);
  if (!refreshToken) {
    throw new AppError(401, "invalid_refresh", "Session expired. Sign in again.");
  }

  const tokens = await rotateRefreshToken(refreshToken);
  setAuthCookies(res, tokens);
  const csrf = setCsrfCookie(res);
  res.json({ data: { ok: true, csrf } });
}

export async function logout(req: Request, res: Response) {
  await logoutSession({
    jti: (req as AuthedRequest).session?.jti,
    refreshToken: readRefreshCookie(req),
  });
  clearAuthCookies(res);
  res.json({ data: { ok: true } });
}

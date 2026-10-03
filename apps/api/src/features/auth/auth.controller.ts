import type { Request, Response } from "express";
import { config } from "../../config.js";
import { AppError } from "../../shared/errors.js";
import type { AuthedRequest } from "./auth.middleware.js";
import {
  completeCoddleSignIn,
  getCurrentUser,
  logoutSession,
  startCoddleSignIn,
} from "./auth.service.js";
import {
  clearCsrfCookie,
  clearSessionCookie,
  setCsrfCookie,
  setSessionCookie,
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

    const { user, token } = await completeCoddleSignIn(code, state);
    setSessionCookie(res, token);
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

export async function logout(req: Request, res: Response) {
  await logoutSession((req as AuthedRequest).session?.jti);
  clearSessionCookie(res);
  clearCsrfCookie(res);
  res.json({ data: { ok: true } });
}

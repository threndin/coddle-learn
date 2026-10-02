import { Router, type Request, type Response, type NextFunction } from "express";
import type { ApiHealth } from "@coddle/shared";
import { APP_NAME } from "@coddle/shared";
import { config } from "../config.js";
import {
  clearCsrfCookie,
  clearSessionCookie,
  setCsrfCookie,
  setSessionCookie,
} from "../lib/cookies.js";
import { AppError } from "../lib/errors.js";
import {
  consumeOAuthState,
  createOAuthState,
  createSession,
  revokeSession,
} from "../lib/jwt.js";
import {
  getCurrentUser,
  requireAuth,
  requireCsrf,
  type AuthedRequest,
} from "../middleware/auth.js";
import { exchangeCoddleSsoCode } from "../services/coddle.js";
import { toPublicUser, upsertFromCoddle } from "../services/users.js";

export const healthRouter: Router = Router();

healthRouter.get("/health", (_req, res) => {
  const body: ApiHealth = {
    status: "ok",
    service: "coddle-learn-api",
    timestamp: new Date().toISOString(),
  };
  res.json(body);
});

healthRouter.get("/", (_req, res) => {
  res.json({
    name: APP_NAME,
    message: "Coddle Learn API",
    docs: "/health",
  });
});

export const authRouter: Router = Router();

function finishUrl() {
  return `${config.webOrigin}/api/auth/coddle/finish`;
}

function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    void fn(req, res, next).catch(next);
  };
}

async function completeCoddleSignIn(code: string, state: string | undefined) {
  if (!state) {
    throw new AppError(400, "invalid_state", "Missing OAuth state. Start sign-in again.");
  }
  await consumeOAuthState(state);

  const profile = await exchangeCoddleSsoCode(code, finishUrl());
  const user = await upsertFromCoddle(profile);
  const token = await createSession({
    sub: user.id,
    email: user.email,
    coddleUserId: user.coddleUserId,
  });

  return { user: toPublicUser(user), token };
}

authRouter.get(
  "/coddle/start",
  asyncHandler(async (_req, res) => {
    const state = await createOAuthState();
    const returnTo = finishUrl();
    const ssoPath = `/sso/learn?state=${encodeURIComponent(state)}&return=${encodeURIComponent(returnTo)}`;
    const loginUrl = `${config.coddleAppUrl}/login?redirect=${encodeURIComponent(ssoPath)}`;
    res.redirect(302, loginUrl);
  }),
);

authRouter.post(
  "/coddle/finish",
  asyncHandler(async (req, res) => {
    try {
      const code = typeof req.body?.code === "string" ? req.body.code.trim() : "";
      const state = typeof req.body?.state === "string" ? req.body.state : undefined;

      if (!code) {
        throw new AppError(400, "missing_code", "Missing SSO code");
      }

      const { token } = await completeCoddleSignIn(code, state);
      setSessionCookie(res, token);
      setCsrfCookie(res);
      res.redirect(302, `${config.webOrigin}/dashboard`);
    } catch (error) {
      console.error("[auth/coddle/finish]", error);
      res.redirect(302, `${config.webOrigin}/login?error=signin_failed`);
    }
  }),
);

authRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await getCurrentUser(req as AuthedRequest);
    const csrf = setCsrfCookie(res);
    res.json({ data: { user, csrf } });
  }),
);

authRouter.post(
  "/logout",
  requireAuth,
  requireCsrf,
  asyncHandler(async (req, res) => {
    const session = (req as AuthedRequest).session;
    if (session?.jti) {
      await revokeSession(session.jti);
    }
    clearSessionCookie(res);
    clearCsrfCookie(res);
    res.json({ data: { ok: true } });
  }),
);

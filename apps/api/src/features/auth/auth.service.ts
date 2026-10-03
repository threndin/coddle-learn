import { config } from "../../config.js";
import { AppError } from "../../shared/errors.js";
import { findUserById, toPublicUser, upsertFromCoddle } from "../users/users.service.js";
import type { AuthedRequest } from "./auth.middleware.js";
import { exchangeCoddleSsoCode } from "./coddle.client.js";
import {
  consumeOAuthState,
  createOAuthState,
  createSession,
  revokeSession,
} from "./session.js";

export function finishUrl() {
  return `${config.webOrigin}/api/auth/coddle/finish`;
}

export async function startCoddleSignIn(): Promise<string> {
  const state = await createOAuthState();
  const returnTo = finishUrl();
  const ssoPath = `/sso/learn?state=${encodeURIComponent(state)}&return=${encodeURIComponent(returnTo)}`;
  return `${config.coddleAppUrl}/login?redirect=${encodeURIComponent(ssoPath)}`;
}

export async function completeCoddleSignIn(code: string, state: string | undefined) {
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

export async function logoutSession(jti: string | undefined) {
  if (jti) {
    await revokeSession(jti);
  }
}

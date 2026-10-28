import { config } from "../../config.js";
import { AppError } from "../../shared/errors.js";
import {
  notifyLogin,
  notifyRoleGranted,
  notifyWelcome,
} from "../notifications/notifications.events.js";
import {
  findUserById,
  syncUserRole,
  toPublicUser,
  upsertFromCoddle,
} from "../users/users.service.js";
import type { AuthedRequest } from "./auth.middleware.js";
import { exchangeCoddleSsoCode } from "./coddle.client.js";
import {
  consumeOAuthState,
  createOAuthState,
  createSession,
  refreshSession,
  revokeAllUserSessions,
  revokeSession,
  revokeSessionByRefreshToken,
  type SessionTokens,
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
  const { user, created, previousRole } = await upsertFromCoddle(profile);
  const tokens = await createSession({
    sub: user.id,
    email: user.email,
    coddleUserId: user.coddleUserId,
  });

  if (created) {
    await notifyWelcome(user.id, user.name);
  } else {
    await notifyLogin(user.id);
  }
  if (
    (created || previousRole !== user.role) &&
    (user.role === "reviewer" || user.role === "admin")
  ) {
    await notifyRoleGranted(user.id, user.role);
  }

  return { user: toPublicUser(user), tokens };
}

export async function getCurrentUser(req: AuthedRequest) {
  if (!req.session) {
    throw new AppError(401, "unauthenticated", "Sign in required");
  }
  const user = await findUserById(req.session.sub);
  if (!user) {
    throw new AppError(401, "user_missing", "Account no longer exists. Sign in again.");
  }
  return toPublicUser(await syncUserRole(user));
}

export async function rotateRefreshToken(refreshToken: string): Promise<SessionTokens> {
  const { tokens } = await refreshSession(refreshToken);
  return tokens;
}

export async function logoutSession(options: {
  jti?: string;
  refreshToken?: string | null;
}) {
  if (options.jti) {
    await revokeSession(options.jti);
    return;
  }
  if (options.refreshToken) {
    await revokeSessionByRefreshToken(options.refreshToken);
  }
}

export async function logoutAllSessions(userId: string) {
  await revokeAllUserSessions(userId);
}

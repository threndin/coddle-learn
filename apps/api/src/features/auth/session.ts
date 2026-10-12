import { createHash, randomBytes, randomUUID } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { config } from "../../config.js";
import { AppError } from "../../shared/errors.js";
import { findUserById } from "../users/users.service.js";
import {
  createOAuthStateRow,
  createSessionRow,
  deleteSessionByJti,
  deleteSessionsByUserId,
  findOAuthStateByJti,
  findSessionByJti,
  findSessionByRefreshHash,
  markOAuthStateConsumed,
  rotateSessionRefresh,
} from "./session.repository.js";

const encoder = new TextEncoder();

function secretKey() {
  return encoder.encode(config.jwtSecret);
}

function accessExpiryMs() {
  return config.jwtAccessExpiryMinutes * 60 * 1000;
}

function refreshExpiryMs() {
  return config.jwtRefreshExpiryDays * 24 * 60 * 60 * 1000;
}

function hashRefreshToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function newRefreshToken() {
  return randomBytes(32).toString("base64url");
}

export type SessionClaims = {
  sub: string;
  email: string;
  coddleUserId: string;
  jti: string;
};

export type SessionTokens = {
  accessToken: string;
  refreshToken: string;
};

async function signAccessToken(
  claims: { sub: string; email: string; coddleUserId: string },
  jti: string,
  accessExpiresAt: Date,
) {
  return new SignJWT({
    email: claims.email,
    coddleUserId: claims.coddleUserId,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(claims.sub)
    .setJti(jti)
    .setIssuedAt()
    .setExpirationTime(accessExpiresAt)
    .sign(secretKey());
}

export async function createOAuthState(): Promise<string> {
  const jti = randomUUID();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await createOAuthStateRow(jti, expiresAt);

  return new SignJWT({ purpose: "coddle_sso", jti })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(secretKey());
}

export async function consumeOAuthState(state: string): Promise<void> {
  let jti: string;
  try {
    const { payload } = await jwtVerify(state, secretKey(), {
      algorithms: ["HS256"],
    });
    if (payload.purpose !== "coddle_sso" || typeof payload.jti !== "string") {
      throw new Error("invalid purpose");
    }
    jti = payload.jti;
  } catch {
    throw new AppError(400, "invalid_state", "Invalid sign-in state. Start again.");
  }

  const row = await findOAuthStateByJti(jti);
  if (!row || row.consumedAt || row.expiresAt.getTime() < Date.now()) {
    throw new AppError(400, "invalid_state", "Sign-in state expired or already used.");
  }

  await markOAuthStateConsumed(jti);
}

export async function createSession(claims: {
  sub: string;
  email: string;
  coddleUserId: string;
}): Promise<SessionTokens> {
  const jti = randomUUID();
  const refreshToken = newRefreshToken();
  const accessExpiresAt = new Date(Date.now() + accessExpiryMs());
  const refreshExpiresAt = new Date(Date.now() + refreshExpiryMs());

  await createSessionRow(jti, claims.sub, hashRefreshToken(refreshToken), refreshExpiresAt);

  const accessToken = await signAccessToken(claims, jti, accessExpiresAt);
  return { accessToken, refreshToken };
}

export async function verifySession(token: string): Promise<SessionClaims> {
  const { payload } = await jwtVerify(token, secretKey(), {
    algorithms: ["HS256"],
  });

  const sub = typeof payload.sub === "string" ? payload.sub : "";
  const email = typeof payload.email === "string" ? payload.email : "";
  const coddleUserId =
    typeof payload.coddleUserId === "string" ? payload.coddleUserId : "";
  const jti = typeof payload.jti === "string" ? payload.jti : "";

  if (!sub || !email || !coddleUserId || !jti) {
    throw new AppError(401, "invalid_session", "Session expired. Sign in again.");
  }

  const session = await findSessionByJti(jti);
  if (!session || session.userId !== sub || session.expiresAt.getTime() < Date.now()) {
    throw new AppError(401, "invalid_session", "Session expired. Sign in again.");
  }

  return { sub, email, coddleUserId, jti };
}

export async function refreshSession(refreshToken: string): Promise<{
  tokens: SessionTokens;
  claims: SessionClaims;
}> {
  const session = await findSessionByRefreshHash(hashRefreshToken(refreshToken));
  if (!session || session.expiresAt.getTime() < Date.now()) {
    throw new AppError(401, "invalid_refresh", "Session expired. Sign in again.");
  }

  const user = await findSessionUserClaims(session.userId, session.jti);
  const nextRefresh = newRefreshToken();
  const accessExpiresAt = new Date(Date.now() + accessExpiryMs());
  const refreshExpiresAt = new Date(Date.now() + refreshExpiryMs());

  await rotateSessionRefresh(session.jti, hashRefreshToken(nextRefresh), refreshExpiresAt);

  const accessToken = await signAccessToken(user, session.jti, accessExpiresAt);
  return {
    tokens: { accessToken, refreshToken: nextRefresh },
    claims: user,
  };
}

async function findSessionUserClaims(userId: string, jti: string): Promise<SessionClaims> {
  const user = await findUserById(userId);
  if (!user) {
    await deleteSessionByJti(jti);
    throw new AppError(401, "user_missing", "Account no longer exists. Sign in again.");
  }
  return {
    sub: user.id,
    email: user.email,
    coddleUserId: user.coddleUserId,
    jti,
  };
}

export async function revokeSession(jti: string): Promise<void> {
  await deleteSessionByJti(jti);
}

export async function revokeSessionByRefreshToken(refreshToken: string): Promise<void> {
  const session = await findSessionByRefreshHash(hashRefreshToken(refreshToken));
  if (session) {
    await deleteSessionByJti(session.jti);
  }
}

export async function revokeAllUserSessions(userId: string): Promise<void> {
  await deleteSessionsByUserId(userId);
}

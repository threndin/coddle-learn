import { randomUUID } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { config } from "../config.js";
import { prisma } from "../db.js";
import { AppError } from "./errors.js";

const encoder = new TextEncoder();

function secretKey() {
  return encoder.encode(config.jwtSecret);
}

export type SessionClaims = {
  sub: string;
  email: string;
  coddleUserId: string;
  jti: string;
};

export async function createOAuthState(): Promise<string> {
  const jti = randomUUID();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await prisma.oAuthState.create({
    data: { jti, expiresAt },
  });

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

  const row = await prisma.oAuthState.findUnique({ where: { jti } });
  if (!row || row.consumedAt || row.expiresAt.getTime() < Date.now()) {
    throw new AppError(400, "invalid_state", "Sign-in state expired or already used.");
  }

  await prisma.oAuthState.update({
    where: { jti },
    data: { consumedAt: new Date() },
  });
}

export async function createSession(claims: {
  sub: string;
  email: string;
  coddleUserId: string;
}): Promise<string> {
  const jti = randomUUID();
  const expiresAt = new Date(Date.now() + config.jwtExpiryHours * 60 * 60 * 1000);

  await prisma.session.create({
    data: {
      jti,
      userId: claims.sub,
      expiresAt,
    },
  });

  return new SignJWT({
    email: claims.email,
    coddleUserId: claims.coddleUserId,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(claims.sub)
    .setJti(jti)
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(secretKey());
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

  const session = await prisma.session.findUnique({ where: { jti } });
  if (!session || session.userId !== sub || session.expiresAt.getTime() < Date.now()) {
    throw new AppError(401, "invalid_session", "Session expired. Sign in again.");
  }

  return { sub, email, coddleUserId, jti };
}

export async function revokeSession(jti: string): Promise<void> {
  await prisma.session.deleteMany({ where: { jti } });
}

export async function revokeAllUserSessions(userId: string): Promise<void> {
  await prisma.session.deleteMany({ where: { userId } });
}

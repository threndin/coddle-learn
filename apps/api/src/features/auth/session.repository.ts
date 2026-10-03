import { prisma } from "../../shared/db.js";

export async function createOAuthStateRow(jti: string, expiresAt: Date) {
  return prisma.oAuthState.create({
    data: { jti, expiresAt },
  });
}

export async function findOAuthStateByJti(jti: string) {
  return prisma.oAuthState.findUnique({ where: { jti } });
}

export async function markOAuthStateConsumed(jti: string) {
  return prisma.oAuthState.update({
    where: { jti },
    data: { consumedAt: new Date() },
  });
}

export async function createSessionRow(jti: string, userId: string, expiresAt: Date) {
  return prisma.session.create({
    data: { jti, userId, expiresAt },
  });
}

export async function findSessionByJti(jti: string) {
  return prisma.session.findUnique({ where: { jti } });
}

export async function deleteSessionByJti(jti: string) {
  return prisma.session.deleteMany({ where: { jti } });
}

export async function deleteSessionsByUserId(userId: string) {
  return prisma.session.deleteMany({ where: { userId } });
}

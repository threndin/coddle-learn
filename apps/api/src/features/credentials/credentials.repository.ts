import { randomBytes } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "../../shared/db.js";

const detailInclude = {
  assessment: {
    select: {
      id: true,
      title: true,
      course: { select: { slug: true, title: true } },
    },
  },
  project: {
    select: {
      id: true,
      slug: true,
      title: true,
      roadmap: { select: { slug: true, name: true } },
    },
  },
  user: {
    select: {
      id: true,
      name: true,
      avatarUrl: true,
    },
  },
} satisfies Prisma.CredentialInclude;

export type CredentialDetailRow = Prisma.CredentialGetPayload<{
  include: typeof detailInclude;
}>;

export type CredentialListRow = Prisma.CredentialGetPayload<{
  include: {
    assessment: {
      select: {
        id: true;
        title: true;
        course: { select: { slug: true; title: true } };
      };
    };
    project: {
      select: {
        id: true;
        slug: true;
        title: true;
        roadmap: { select: { slug: true; name: true } };
      };
    };
  };
}>;

function newCode() {
  return randomBytes(9).toString("base64url");
}

export async function listCredentialsForUser(userId: string) {
  return prisma.credential.findMany({
    where: { userId },
    include: {
      assessment: {
        select: {
          id: true,
          title: true,
          course: { select: { slug: true, title: true } },
        },
      },
      project: {
        select: {
          id: true,
          slug: true,
          title: true,
          roadmap: { select: { slug: true, name: true } },
        },
      },
    },
    orderBy: { issuedAt: "desc" },
  });
}

export async function findCredentialForUser(userId: string, id: string) {
  return prisma.credential.findFirst({
    where: { id, userId },
    include: detailInclude,
  });
}

export async function findCredentialByCode(code: string) {
  return prisma.credential.findUnique({
    where: { code },
    include: detailInclude,
  });
}

export async function findAssessmentCredential(userId: string, assessmentId: string) {
  return prisma.credential.findFirst({
    where: { userId, assessmentId },
  });
}

export async function findProjectCredential(userId: string, projectId: string) {
  return prisma.credential.findFirst({
    where: { userId, projectId },
  });
}

export async function createAssessmentCredential(input: {
  userId: string;
  assessmentId: string;
  assessmentAttemptId: string;
  title: string;
  summary: string;
}) {
  return prisma.credential.create({
    data: {
      code: newCode(),
      userId: input.userId,
      kind: "assessment",
      title: input.title,
      summary: input.summary,
      assessmentId: input.assessmentId,
      assessmentAttemptId: input.assessmentAttemptId,
    },
  });
}

export async function createProjectCredential(input: {
  userId: string;
  projectId: string;
  projectSubmissionId: string;
  title: string;
  summary: string;
}) {
  return prisma.credential.create({
    data: {
      code: newCode(),
      userId: input.userId,
      kind: "project",
      title: input.title,
      summary: input.summary,
      projectId: input.projectId,
      projectSubmissionId: input.projectSubmissionId,
    },
  });
}

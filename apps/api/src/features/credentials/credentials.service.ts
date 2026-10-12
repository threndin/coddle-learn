import { Prisma } from "@prisma/client";
import { pathLabelForRoadmapSlug } from "@coddle/shared";
import { config } from "../../config.js";
import { AppError } from "../../shared/errors.js";
import {
  createAssessmentCredential,
  createProjectCredential,
  findAssessmentCredential,
  findCredentialByCode,
  findCredentialForUser,
  findProjectCredential,
  listCredentialsForUser,
  type CredentialDetailRow,
  type CredentialListRow,
} from "./credentials.repository.js";

function verifyUrl(code: string) {
  return `${config.webOrigin}/verify/${encodeURIComponent(code)}`;
}

function sourceFromRow(row: CredentialListRow | CredentialDetailRow) {
  if (row.kind === "assessment" && row.assessment) {
    return {
      kind: "assessment" as const,
      assessmentId: row.assessment.id,
      assessmentTitle: row.assessment.title,
      courseSlug: row.assessment.course.slug,
      courseTitle: row.assessment.course.title,
      projectSlug: null as string | null,
      projectTitle: null as string | null,
      pathLabel: null as string | null,
    };
  }
  if (row.kind === "project" && row.project) {
    return {
      kind: "project" as const,
      assessmentId: null as string | null,
      assessmentTitle: null as string | null,
      courseSlug: null as string | null,
      courseTitle: null as string | null,
      projectSlug: row.project.slug,
      projectTitle: row.project.title,
      pathLabel: pathLabelForRoadmapSlug(row.project.roadmap.slug),
    };
  }
  return {
    kind: row.kind,
    assessmentId: null,
    assessmentTitle: null,
    courseSlug: null,
    courseTitle: null,
    projectSlug: null,
    projectTitle: null,
    pathLabel: null,
  };
}

function listItem(row: CredentialListRow) {
  return {
    id: row.id,
    code: row.code,
    kind: row.kind,
    title: row.title,
    summary: row.summary,
    issuedAt: row.issuedAt.toISOString(),
    verifyUrl: verifyUrl(row.code),
    source: sourceFromRow(row),
  };
}

function detailPayload(row: CredentialDetailRow) {
  return {
    ...listItem(row),
    earner: {
      name: row.user.name,
      avatarUrl: row.user.avatarUrl,
    },
  };
}

function isUniqueViolation(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002"
  );
}

export async function listMyCredentials(userId: string) {
  const rows = await listCredentialsForUser(userId);
  return { credentials: rows.map(listItem) };
}

export async function getMyCredential(userId: string, id: string) {
  const row = await findCredentialForUser(userId, id);
  if (!row) {
    throw new AppError(404, "credential_missing", "That credential could not be found.");
  }
  return { credential: detailPayload(row) };
}

export async function verifyCredentialByCode(code: string) {
  const normalized = code.trim();
  if (!normalized) {
    throw new AppError(404, "credential_missing", "That credential could not be found.");
  }
  const row = await findCredentialByCode(normalized);
  if (!row) {
    throw new AppError(404, "credential_missing", "That credential could not be found.");
  }
  return { credential: detailPayload(row) };
}

export async function issueAssessmentCredential(input: {
  userId: string;
  assessmentId: string;
  assessmentAttemptId: string;
  assessmentTitle: string;
  courseTitle: string;
  summary?: string;
}) {
  const existing = await findAssessmentCredential(input.userId, input.assessmentId);
  if (existing) return listItemFromBare(existing);

  try {
    const created = await createAssessmentCredential({
      userId: input.userId,
      assessmentId: input.assessmentId,
      assessmentAttemptId: input.assessmentAttemptId,
      title: input.assessmentTitle,
      summary:
        input.summary?.trim() ||
        `Passed the final assessment for ${input.courseTitle}.`,
    });
    return listItemFromBare(created);
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
    const raced = await findAssessmentCredential(input.userId, input.assessmentId);
    if (!raced) throw error;
    return listItemFromBare(raced);
  }
}

export async function issueProjectCredential(input: {
  userId: string;
  projectId: string;
  projectSubmissionId: string;
  projectTitle: string;
  pathLabel: string;
  summary?: string;
}) {
  const existing = await findProjectCredential(input.userId, input.projectId);
  if (existing) return listItemFromBare(existing);

  try {
    const created = await createProjectCredential({
      userId: input.userId,
      projectId: input.projectId,
      projectSubmissionId: input.projectSubmissionId,
      title: input.projectTitle,
      summary:
        input.summary?.trim() ||
        `Submitted a solution for ${input.projectTitle} on the ${input.pathLabel} path.`,
    });
    return listItemFromBare(created);
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
    const raced = await findProjectCredential(input.userId, input.projectId);
    if (!raced) throw error;
    return listItemFromBare(raced);
  }
}

function listItemFromBare(row: {
  id: string;
  code: string;
  kind: string;
  title: string;
  summary: string;
  issuedAt: Date;
}) {
  return {
    id: row.id,
    code: row.code,
    kind: row.kind,
    title: row.title,
    summary: row.summary,
    issuedAt: row.issuedAt.toISOString(),
    verifyUrl: verifyUrl(row.code),
  };
}

export type IssuedCredential = ReturnType<typeof listItemFromBare>;

import {
  PROJECT_LIMITS,
  PROJECT_SUBMIT_POINT_REASON,
  PROJECT_SUBMIT_POINTS,
  isExperienceLevel,
  isHttpUrl,
  pathLabelForRoadmapSlug,
} from "@coddle/shared";
import { AppError } from "../../shared/errors.js";
import { scheduleAchievementEvaluation } from "../achievements/achievements.service.js";
import { scheduleSkillGraphEvaluation } from "../skills/skills.service.js";
import {
  issueProjectCredential,
  type IssuedCredential,
} from "../credentials/credentials.service.js";
import { isReviewerUser } from "../users/users.service.js";
import { awardUserPoints } from "../points/points.repository.js";
import {
  findProjectBySlug,
  findPublishedProjectBySlug,
  findSubmission,
  listPublishedProjects,
  listUserSubmissions,
  saveSubmission,
  startSubmission,
  type ProjectRow,
} from "./projects.repository.js";

function skillPayload(project: ProjectRow) {
  return project.skills.map((row) => ({
    slug: row.skill.slug,
    name: row.skill.name,
    category: row.skill.category,
  }));
}

function primarySkillName(project: ProjectRow) {
  return (
    project.skills.find((row) => row.skill.slug === project.primarySkillSlug)?.skill.name ??
    project.primarySkillSlug
  );
}

function submissionPayload(
  submission: Awaited<ReturnType<typeof findSubmission>>,
) {
  if (!submission) return null;
  return {
    id: submission.id,
    status: submission.status,
    repoUrl: submission.repoUrl,
    liveUrl: submission.liveUrl,
    notes: submission.notes,
    pointsAwarded: submission.pointsAwarded,
    startedAt: submission.startedAt.toISOString(),
    submittedAt: submission.submittedAt?.toISOString() ?? null,
    updatedAt: submission.updatedAt.toISOString(),
  };
}

function catalogItem(
  project: ProjectRow,
  submission: Awaited<ReturnType<typeof findSubmission>>,
) {
  return {
    id: project.id,
    slug: project.slug,
    title: project.title,
    summary: project.summary,
    level: project.level,
    estimatedHours: project.estimatedHours,
    exampleImageUrl: project.exampleImageUrl,
    primarySkillSlug: project.primarySkillSlug,
    primarySkillName: primarySkillName(project),
    skills: skillPayload(project),
    checklistCount: project.checklist.length,
    startedCount: project._count.submissions,
    path: {
      roadmapSlug: project.roadmap.slug,
      roadmapName: project.roadmap.name,
      label: pathLabelForRoadmapSlug(project.roadmap.slug),
    },
    course: project.course
      ? { slug: project.course.slug, title: project.course.title }
      : null,
    mySubmission: submission
      ? {
          status: submission.status,
          startedAt: submission.startedAt.toISOString(),
          submittedAt: submission.submittedAt?.toISOString() ?? null,
        }
      : null,
  };
}

function detailPayload(
  project: ProjectRow,
  submission: Awaited<ReturnType<typeof findSubmission>>,
) {
  return {
    ...catalogItem(project, submission),
    body: project.body,
    checklist: project.checklist,
    roadmapStep: project.roadmapStep
      ? {
          slug: project.roadmapStep.slug,
          title: project.roadmapStep.title,
        }
      : null,
    createdBy: {
      id: project.createdBy.id,
      username: project.createdBy.username,
      name: project.createdBy.name,
      avatarUrl: project.createdBy.avatarUrl,
    },
    publishedAt: project.publishedAt?.toISOString() ?? null,
    submission: submissionPayload(submission),
  };
}

export async function listProjects(userId: string) {
  const projects = await listPublishedProjects();
  const submissions = await listUserSubmissions(userId);
  const byProjectId = new Map(submissions.map((row) => [row.projectId, row]));

  return {
    projects: projects.map((project) =>
      catalogItem(project, byProjectId.get(project.id) ?? null),
    ),
  };
}

export async function getProject(userId: string, slug: string) {
  const project = await findProjectBySlug(slug);
  const visible =
    project &&
    (project.status === "published" ||
      project.createdByUserId === userId ||
      ((project.status === "in_review" || project.status === "changes_requested") &&
        (await isReviewerUser(userId))));
  if (!visible) {
    throw new AppError(404, "project_missing", "That project could not be found.");
  }
  const submission = await findSubmission(userId, project.id);
  return { project: detailPayload(project, submission) };
}

export async function startProject(userId: string, slug: string) {
  const project = await findPublishedProjectBySlug(slug);
  if (!project) {
    throw new AppError(404, "project_missing", "That project could not be found.");
  }
  const submission = await startSubmission(userId, project.id);
  scheduleSkillGraphEvaluation(userId);
  return {
    project: detailPayload(project, submission),
  };
}

type Body = Record<string, unknown>;

function asBody(input: unknown): Body {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new AppError(400, "invalid_body", "Request details were missing.");
  }
  return input as Body;
}

function readOptionalUrl(body: Body, key: string, label: string): string | null {
  if (!(key in body)) return null;
  const raw = body[key];
  if (raw === null || raw === "") return null;
  if (typeof raw !== "string") {
    throw new AppError(400, "invalid_field", `${label} must be a URL.`, { field: key });
  }
  const value = raw.trim();
  if (!value) return null;
  if (value.length > PROJECT_LIMITS.urlMax || !isHttpUrl(value)) {
    throw new AppError(400, "invalid_field", `${label} must be a valid http(s) URL.`, {
      field: key,
    });
  }
  return value;
}

export async function submitProject(userId: string, slug: string, input: unknown) {
  const project = await findPublishedProjectBySlug(slug);
  if (!project) {
    throw new AppError(404, "project_missing", "That project could not be found.");
  }

  const body = asBody(input);
  const repoUrl = readOptionalUrl(body, "repoUrl", "Repository URL");
  const liveUrl = readOptionalUrl(body, "liveUrl", "Live URL");
  if (!repoUrl && !liveUrl) {
    throw new AppError(
      400,
      "invalid_field",
      "Add a repository URL or a live URL.",
      { field: "repoUrl" },
    );
  }

  let notes = "";
  if ("notes" in body) {
    if (typeof body.notes !== "string") {
      throw new AppError(400, "invalid_field", "Notes must be text.", { field: "notes" });
    }
    notes = body.notes.trim();
    if (notes.length > PROJECT_LIMITS.notesMax) {
      throw new AppError(
        400,
        "invalid_field",
        `Notes must be ${PROJECT_LIMITS.notesMax.toLocaleString()} characters or fewer.`,
        { field: "notes" },
      );
    }
  }

  let submission = await findSubmission(userId, project.id);
  if (!submission) {
    submission = await startSubmission(userId, project.id);
  }

  const firstSubmit = submission.status !== "submitted" || !submission.submittedAt;
  let pointsAwarded = submission.pointsAwarded;
  if (firstSubmit && pointsAwarded === 0) {
    pointsAwarded = PROJECT_SUBMIT_POINTS;
    await awardUserPoints({
      userId,
      amount: PROJECT_SUBMIT_POINTS,
      reason: PROJECT_SUBMIT_POINT_REASON,
      refType: "project",
      refId: project.id,
    });
  }

  const saved = await saveSubmission(submission.id, {
    status: "submitted",
    repoUrl,
    liveUrl,
    notes,
    submittedAt: submission.submittedAt ?? new Date(),
    pointsAwarded,
  });

  let credential: IssuedCredential | null = null;
  if (firstSubmit) {
    credential = await issueProjectCredential({
      userId,
      projectId: project.id,
      projectSubmissionId: saved.id,
      projectTitle: project.title,
      pathLabel: pathLabelForRoadmapSlug(project.roadmap.slug),
      summary: project.summary,
    });
  }

  scheduleAchievementEvaluation(userId);
  scheduleSkillGraphEvaluation(userId);

  return {
    project: detailPayload(project, saved),
    pointsAwarded: firstSubmit ? pointsAwarded : 0,
    credential,
  };
}

export async function listMyProjectActivity(userId: string) {
  const rows = await listUserSubmissions(userId);
  return {
    submissions: rows.map((row) => ({
      id: row.id,
      status: row.status,
      startedAt: row.startedAt.toISOString(),
      submittedAt: row.submittedAt?.toISOString() ?? null,
      updatedAt: row.updatedAt.toISOString(),
      project: {
        id: row.project.id,
        slug: row.project.slug,
        title: row.project.title,
        summary: row.project.summary,
        level: isExperienceLevel(row.project.level) ? row.project.level : row.project.level,
        primarySkillSlug: row.project.primarySkillSlug,
        exampleImageUrl: row.project.exampleImageUrl,
        path: {
          roadmapSlug: row.project.roadmap.slug,
          roadmapName: row.project.roadmap.name,
          label: pathLabelForRoadmapSlug(row.project.roadmap.slug),
        },
      },
    })),
  };
}

import {
  EDITABLE_PROJECT_STATUSES,
  PROJECT_LIMITS,
  isExperienceLevel,
  isHttpUrl,
  isProjectStatus,
  pathLabelForRoadmapSlug,
  projectChecklist,
  slugify,
  uniqueSlug,
  type ProjectStatus,
} from "@coddle/shared";
import { config } from "../../config.js";
import { AppError } from "../../shared/errors.js";
import { scheduleAchievementEvaluation } from "../achievements/achievements.service.js";
import {
  createProject,
  deleteProject,
  findCourseBySlug,
  findRoadmapBySlug,
  findStudioProject,
  listCreatorProjects,
  listPublishedCourseOptions,
  listRoadmapOptions,
  projectSlugsLike,
  replaceProjectSkills,
  skillIdsForSlugs,
  updateProject,
  type ProjectRow,
} from "./projects.repository.js";

type Body = Record<string, unknown>;

function asBody(input: unknown): Body {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new AppError(400, "invalid_body", "Request details were missing.");
  }
  return input as Body;
}

function statusOf(project: { status: string }): ProjectStatus {
  return isProjectStatus(project.status) ? project.status : "draft";
}

function assertEditable(project: ProjectRow) {
  if (!EDITABLE_PROJECT_STATUSES.includes(statusOf(project))) {
    throw new AppError(
      409,
      "project_locked",
      "This project is in review. Withdraw it to make changes.",
    );
  }
}

async function loadOwned(userId: string, projectId: string): Promise<ProjectRow> {
  const project = await findStudioProject(projectId);
  if (!project || project.createdByUserId !== userId) {
    throw new AppError(404, "project_missing", "That project could not be found.");
  }
  return project;
}

function readText(
  body: Body,
  key: string,
  label: string,
  limits: { min?: number; max: number },
): string | undefined {
  if (!(key in body)) return undefined;
  const raw = body[key];
  if (typeof raw !== "string") {
    throw new AppError(400, "invalid_field", `${label} must be text.`, { field: key });
  }
  const value = raw.trim();
  if (limits.min !== undefined && value.length < limits.min) {
    throw new AppError(
      400,
      "invalid_field",
      `${label} needs at least ${limits.min} characters.`,
      { field: key },
    );
  }
  if (value.length > limits.max) {
    throw new AppError(
      400,
      "invalid_field",
      `${label} must be ${limits.max.toLocaleString()} characters or fewer.`,
      { field: key },
    );
  }
  return value;
}

function readSkillSlugs(body: Body): string[] | undefined {
  if (!("skillSlugs" in body)) return undefined;
  const raw = body.skillSlugs;
  if (!Array.isArray(raw) || raw.some((item) => typeof item !== "string")) {
    throw new AppError(400, "invalid_field", "Skills must be a list.", { field: "skillSlugs" });
  }
  const unique = Array.from(new Set(raw as string[]));
  if (unique.length > PROJECT_LIMITS.skillMax) {
    throw new AppError(
      400,
      "invalid_field",
      `Tag up to ${PROJECT_LIMITS.skillMax} skills.`,
      { field: "skillSlugs" },
    );
  }
  return unique;
}

function readChecklist(body: Body): string[] | undefined {
  if (!("checklist" in body)) return undefined;
  const raw = body.checklist;
  if (!Array.isArray(raw) || raw.some((item) => typeof item !== "string")) {
    throw new AppError(400, "invalid_field", "Checklist must be a list of text items.", {
      field: "checklist",
    });
  }
  const items = (raw as string[])
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, PROJECT_LIMITS.checklistMax);
  if (items.some((item) => item.length > PROJECT_LIMITS.checklistItemMax)) {
    throw new AppError(
      400,
      "invalid_field",
      `Each checklist item must be ${PROJECT_LIMITS.checklistItemMax} characters or fewer.`,
      { field: "checklist" },
    );
  }
  return items;
}

async function resolveSkillIds(slugs: string[]): Promise<string[]> {
  const rows = await skillIdsForSlugs(slugs);
  if (rows.length !== slugs.length) {
    throw new AppError(400, "invalid_field", "One of those skills is not in the catalog.", {
      field: "skillSlugs",
    });
  }
  return rows.map((row) => row.id);
}

function checklistFor(project: ProjectRow) {
  return projectChecklist({
    title: project.title,
    summary: project.summary,
    body: project.body,
    checklist: project.checklist,
    primarySkillSlug: project.primarySkillSlug,
    skillCount: project.skills.length,
    roadmapSlug: project.roadmap.slug,
  });
}

function permissionsFor(project: ProjectRow) {
  const status = statusOf(project);
  const checklist = checklistFor(project);
  const complete = checklist.every((item) => item.done);
  return {
    canEdit: EDITABLE_PROJECT_STATUSES.includes(status),
    canSubmit: (status === "draft" || status === "changes_requested") && complete,
    canWithdraw: status === "in_review",
    canArchive: status === "published",
    canRestore: status === "archived",
    canDelete: status === "draft" || status === "changes_requested" || status === "archived",
  };
}

function studioPayload(project: ProjectRow) {
  const status = statusOf(project);
  return {
    id: project.id,
    slug: project.slug,
    title: project.title,
    summary: project.summary,
    body: project.body,
    level: project.level,
    checklist: project.checklist,
    exampleImageUrl: project.exampleImageUrl,
    primarySkillSlug: project.primarySkillSlug,
    estimatedHours: project.estimatedHours,
    status,
    sortOrder: project.sortOrder,
    reviewNote: project.reviewNote,
    submittedAt: project.submittedAt?.toISOString() ?? null,
    reviewedAt: project.reviewedAt?.toISOString() ?? null,
    publishedAt: project.publishedAt?.toISOString() ?? null,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
    reviewMode: config.reviewMode,
    skills: project.skills.map((row) => ({
      slug: row.skill.slug,
      name: row.skill.name,
      category: row.skill.category,
    })),
    path: {
      roadmapId: project.roadmap.id,
      roadmapSlug: project.roadmap.slug,
      roadmapName: project.roadmap.name,
      label: pathLabelForRoadmapSlug(project.roadmap.slug),
      stepId: project.roadmapStep?.id ?? null,
      stepSlug: project.roadmapStep?.slug ?? null,
      stepTitle: project.roadmapStep?.title ?? null,
    },
    course: project.course
      ? { id: project.course.id, slug: project.course.slug, title: project.course.title }
      : null,
    startedCount: project._count.submissions,
    checklistReady: checklistFor(project),
    permissions: permissionsFor(project),
  };
}

export async function listStudioProjects(userId: string) {
  const projects = await listCreatorProjects(userId);
  return {
    reviewMode: config.reviewMode,
    projects: projects.map((project) => ({
      id: project.id,
      slug: project.slug,
      title: project.title,
      summary: project.summary,
      level: project.level,
      status: statusOf(project),
      primarySkillSlug: project.primarySkillSlug,
      exampleImageUrl: project.exampleImageUrl,
      estimatedHours: project.estimatedHours,
      startedCount: project._count.submissions,
      reviewNote: project.reviewNote,
      path: {
        roadmapSlug: project.roadmap.slug,
        roadmapName: project.roadmap.name,
        label: pathLabelForRoadmapSlug(project.roadmap.slug),
      },
      submittedAt: project.submittedAt?.toISOString() ?? null,
      publishedAt: project.publishedAt?.toISOString() ?? null,
      updatedAt: project.updatedAt.toISOString(),
      createdAt: project.createdAt.toISOString(),
    })),
  };
}

export async function getStudioProjectOptions() {
  const [roadmaps, courses] = await Promise.all([
    listRoadmapOptions(),
    listPublishedCourseOptions(),
  ]);
  return {
    roadmaps: roadmaps.map((roadmap) => ({
      id: roadmap.id,
      slug: roadmap.slug,
      name: roadmap.name,
      label: pathLabelForRoadmapSlug(roadmap.slug),
      steps: roadmap.steps.map((step) => ({
        id: step.id,
        slug: step.slug,
        title: step.title,
      })),
    })),
    courses: courses.map((course) => ({
      id: course.id,
      slug: course.slug,
      title: course.title,
    })),
  };
}

export async function getStudioProject(userId: string, projectId: string) {
  const project = await loadOwned(userId, projectId);
  return { project: studioPayload(project) };
}

export async function createStudioProject(userId: string, input: unknown) {
  const body = asBody(input);
  const title = readText(body, "title", "Title", {
    min: PROJECT_LIMITS.titleMin,
    max: PROJECT_LIMITS.titleMax,
  });
  if (!title) {
    throw new AppError(400, "invalid_field", "Title is required.", { field: "title" });
  }

  const summary =
    readText(body, "summary", "Summary", { max: PROJECT_LIMITS.summaryMax }) ?? "";
  const levelRaw = typeof body.level === "string" ? body.level : "beginner";
  if (!isExperienceLevel(levelRaw)) {
    throw new AppError(400, "invalid_field", "Pick a valid level.", { field: "level" });
  }

  const roadmapSlug =
    typeof body.roadmapSlug === "string" ? body.roadmapSlug.trim() : "";
  if (!roadmapSlug) {
    throw new AppError(400, "invalid_field", "Pick a learning path.", {
      field: "roadmapSlug",
    });
  }
  const roadmap = await findRoadmapBySlug(roadmapSlug);
  if (!roadmap) {
    throw new AppError(400, "invalid_field", "That learning path was not found.", {
      field: "roadmapSlug",
    });
  }

  const skillSlugs = readSkillSlugs(body) ?? [];
  const primarySkillSlug =
    typeof body.primarySkillSlug === "string" && body.primarySkillSlug.trim()
      ? body.primarySkillSlug.trim()
      : skillSlugs[0] ?? "";
  if (!primarySkillSlug) {
    throw new AppError(400, "invalid_field", "Pick a primary skill.", {
      field: "primarySkillSlug",
    });
  }
  const allSkills = Array.from(new Set([primarySkillSlug, ...skillSlugs]));
  const skillIds = await resolveSkillIds(allSkills);

  const baseSlug = slugify(title, "project");
  const slug = uniqueSlug(baseSlug, await projectSlugsLike(baseSlug));

  const project = await createProject(
    {
      slug,
      title,
      summary:
        summary ||
        "Describe the goal of this project so learners know what they are building.",
      body: "",
      level: levelRaw,
      checklist: [],
      primarySkillSlug,
      estimatedHours: 2,
      status: "draft",
      roadmapId: roadmap.id,
      createdByUserId: userId,
    },
    skillIds,
  );

  return { project: studioPayload(project) };
}

export async function updateStudioProject(
  userId: string,
  projectId: string,
  input: unknown,
) {
  const project = await loadOwned(userId, projectId);
  assertEditable(project);
  const body = asBody(input);
  const data: Parameters<typeof updateProject>[1] = {};

  const title = readText(body, "title", "Title", {
    min: PROJECT_LIMITS.titleMin,
    max: PROJECT_LIMITS.titleMax,
  });
  if (title !== undefined) data.title = title;

  const summary = readText(body, "summary", "Summary", {
    min: PROJECT_LIMITS.summaryMin,
    max: PROJECT_LIMITS.summaryMax,
  });
  if (summary !== undefined) data.summary = summary;

  const projectBody = readText(body, "body", "Requirements", {
    max: PROJECT_LIMITS.bodyMax,
  });
  if (projectBody !== undefined) data.body = projectBody;

  if ("level" in body) {
    if (typeof body.level !== "string" || !isExperienceLevel(body.level)) {
      throw new AppError(400, "invalid_field", "Pick a valid level.", { field: "level" });
    }
    data.level = body.level;
  }

  if ("estimatedHours" in body) {
    const hours = Number(body.estimatedHours);
    if (
      !Number.isInteger(hours) ||
      hours < PROJECT_LIMITS.estimatedHoursMin ||
      hours > PROJECT_LIMITS.estimatedHoursMax
    ) {
      throw new AppError(
        400,
        "invalid_field",
        `Estimated hours must be between ${PROJECT_LIMITS.estimatedHoursMin} and ${PROJECT_LIMITS.estimatedHoursMax}.`,
        { field: "estimatedHours" },
      );
    }
    data.estimatedHours = hours;
  }

  if ("exampleImageUrl" in body) {
    const raw = body.exampleImageUrl;
    if (raw === null || raw === "") {
      data.exampleImageUrl = null;
    } else if (typeof raw !== "string") {
      throw new AppError(400, "invalid_field", "Example image must be a URL or path.", {
        field: "exampleImageUrl",
      });
    } else {
      const value = raw.trim();
      if (value.length > PROJECT_LIMITS.exampleImageUrlMax) {
        throw new AppError(400, "invalid_field", "Example image URL is too long.", {
          field: "exampleImageUrl",
        });
      }
      if (!(value.startsWith("/") || isHttpUrl(value))) {
        throw new AppError(
          400,
          "invalid_field",
          "Example image must be an http(s) URL or a site path like /projects/demo.svg.",
          { field: "exampleImageUrl" },
        );
      }
      data.exampleImageUrl = value;
    }
  }

  const checklist = readChecklist(body);
  if (checklist !== undefined) data.checklist = checklist;

  if ("roadmapSlug" in body) {
    if (typeof body.roadmapSlug !== "string" || !body.roadmapSlug.trim()) {
      throw new AppError(400, "invalid_field", "Pick a learning path.", {
        field: "roadmapSlug",
      });
    }
    const roadmap = await findRoadmapBySlug(body.roadmapSlug.trim());
    if (!roadmap) {
      throw new AppError(400, "invalid_field", "That learning path was not found.", {
        field: "roadmapSlug",
      });
    }
    data.roadmapId = roadmap.id;

    if ("roadmapStepSlug" in body) {
      const stepSlug =
        typeof body.roadmapStepSlug === "string" ? body.roadmapStepSlug.trim() : "";
      if (!stepSlug) {
        data.roadmapStepId = null;
      } else {
        const step = roadmap.steps.find((item) => item.slug === stepSlug);
        if (!step) {
          throw new AppError(400, "invalid_field", "That roadmap step was not found.", {
            field: "roadmapStepSlug",
          });
        }
        data.roadmapStepId = step.id;
      }
    }
  } else if ("roadmapStepSlug" in body) {
    const roadmap = await findRoadmapBySlug(project.roadmap.slug);
    const stepSlug =
      typeof body.roadmapStepSlug === "string" ? body.roadmapStepSlug.trim() : "";
    if (!stepSlug) {
      data.roadmapStepId = null;
    } else {
      const step = roadmap?.steps.find((item) => item.slug === stepSlug);
      if (!step) {
        throw new AppError(400, "invalid_field", "That roadmap step was not found.", {
          field: "roadmapStepSlug",
        });
      }
      data.roadmapStepId = step.id;
    }
  }

  if ("courseSlug" in body) {
    const courseSlug = typeof body.courseSlug === "string" ? body.courseSlug.trim() : "";
    if (!courseSlug) {
      data.courseId = null;
    } else {
      const course = await findCourseBySlug(courseSlug);
      if (!course || course.status !== "published") {
        throw new AppError(400, "invalid_field", "That course was not found.", {
          field: "courseSlug",
        });
      }
      data.courseId = course.id;
    }
  }

  const skillSlugs = readSkillSlugs(body);
  let primarySkillSlug =
    typeof body.primarySkillSlug === "string" ? body.primarySkillSlug.trim() : undefined;
  if (skillSlugs !== undefined || primarySkillSlug !== undefined) {
    const nextSkills =
      skillSlugs ?? project.skills.map((row) => row.skill.slug);
    const nextPrimary =
      primarySkillSlug ??
      (nextSkills.includes(project.primarySkillSlug)
        ? project.primarySkillSlug
        : nextSkills[0] ?? "");
    if (!nextPrimary || !nextSkills.includes(nextPrimary)) {
      throw new AppError(
        400,
        "invalid_field",
        "Primary skill must be one of the tagged skills.",
        { field: "primarySkillSlug" },
      );
    }
    const skillIds = await resolveSkillIds(nextSkills);
    await replaceProjectSkills(project.id, skillIds);
    data.primarySkillSlug = nextPrimary;
  }

  const updated = await updateProject(project.id, data);
  return { project: studioPayload(updated) };
}

export async function deleteStudioProject(userId: string, projectId: string) {
  const project = await loadOwned(userId, projectId);
  if (!permissionsFor(project).canDelete) {
    throw new AppError(409, "invalid_transition", "This project cannot be deleted right now.");
  }
  await deleteProject(project.id);
  return { ok: true as const };
}

export async function submitStudioProject(userId: string, projectId: string) {
  const project = await loadOwned(userId, projectId);
  const status = statusOf(project);
  if (status !== "draft" && status !== "changes_requested") {
    throw new AppError(409, "invalid_transition", "Only drafts can be submitted for review.");
  }
  const missing = checklistFor(project).filter((item) => !item.done);
  if (missing.length > 0) {
    throw new AppError(422, "project_incomplete", "Finish the checklist before submitting.", {
      missing: missing.map((item) => item.label),
    });
  }

  const now = new Date();
  if (config.reviewMode === "auto") {
    const updated = await updateProject(project.id, {
      status: "published",
      submittedAt: now,
      reviewedAt: now,
      reviewedByUserId: null,
      reviewNote: null,
      publishedAt: project.publishedAt ?? now,
    });
    scheduleAchievementEvaluation(userId);
    return { project: studioPayload(updated) };
  }

  const updated = await updateProject(project.id, {
    status: "in_review",
    submittedAt: now,
    reviewNote: null,
  });
  return { project: studioPayload(updated) };
}

export async function withdrawStudioProject(userId: string, projectId: string) {
  const project = await loadOwned(userId, projectId);
  if (statusOf(project) !== "in_review") {
    throw new AppError(409, "invalid_transition", "Only projects in review can be withdrawn.");
  }
  const updated = await updateProject(project.id, { status: "draft" });
  return { project: studioPayload(updated) };
}

export async function archiveStudioProject(userId: string, projectId: string) {
  const project = await loadOwned(userId, projectId);
  if (statusOf(project) !== "published") {
    throw new AppError(409, "invalid_transition", "Only published projects can be archived.");
  }
  const updated = await updateProject(project.id, { status: "archived" });
  return { project: studioPayload(updated) };
}

export async function restoreStudioProject(userId: string, projectId: string) {
  const project = await loadOwned(userId, projectId);
  if (statusOf(project) !== "archived") {
    throw new AppError(409, "invalid_transition", "Only archived projects can be restored.");
  }
  const updated = await updateProject(project.id, {
    status: "published",
    publishedAt: project.publishedAt ?? new Date(),
  });
  return { project: studioPayload(updated) };
}

import {
  MENTOR_LIMITS,
  MENTOR_SCOPES,
  MENTOR_SORTS,
  MENTOR_TOPICS,
  isMentorAvailability,
  isMentorProgramStatus,
  isMentorTopic,
  mentorAcceptsApplications,
  programSlugFromTitle,
  type MentorAvailability,
  type MentorScope,
  type MentorSort,
} from "@coddle/shared";
import type { Prisma } from "@prisma/client";
import { AppError } from "../../shared/errors.js";
import { scheduleAchievementEvaluation } from "../achievements/achievements.service.js";
import {
  notifyMentorApplication,
  notifyMentorApplicationUpdate,
} from "../notifications/notifications.events.js";
import {
  countApplicationsSince,
  countApprovedForProgram,
  countMentorProfiles,
  countMentorsByTopic,
  countOpenPrograms,
  createApplication,
  createMentorProfile,
  createProgram,
  findApplicationById,
  findApplicationByProgramAndMentee,
  findMentorProfileByUserId,
  findMentorProfileByUsername,
  findProgramById,
  findProgramByMentorAndSlug,
  findSkillIdsBySlugs,
  listApplicationsForMentee,
  listApplicationsForMentor,
  listMentorProfiles,
  listMentorSkills,
  listProgramSlugs,
  listViewerApplications,
  updateApplication,
  updateMentorProfile,
  updateProgram,
  type MentorProfileWithRelations,
  type MentorshipApplicationWithRelations,
  type MentorshipProgramWithCounts,
} from "./mentors.repository.js";

type CatalogFilters = {
  q: string;
  topic: string | null;
  skill: string | null;
  availability: MentorAvailability | null;
  scope: MentorScope;
  sort: MentorSort;
  page: number;
};

const MAX_SEARCH_TERMS = 5;
const AVAILABILITY_RANK: Record<string, number> = {
  open: 0,
  limited: 1,
  waitlist: 2,
  paused: 3,
};

function firstString(value: unknown): string {
  if (Array.isArray(value)) return firstString(value[0]);
  return typeof value === "string" ? value.trim() : "";
}

function readString(body: Record<string, unknown>, key: string): string {
  const value = body[key];
  return typeof value === "string" ? value.trim() : "";
}

function parseFilters(query: Record<string, unknown>): CatalogFilters {
  const topic = firstString(query.topic);
  const availability = firstString(query.availability);
  const scope = firstString(query.scope);
  const sort = firstString(query.sort);
  const page = Number.parseInt(firstString(query.page), 10);
  return {
    q: firstString(query.q).slice(0, MENTOR_LIMITS.queryMax),
    topic: isMentorTopic(topic) ? topic : null,
    skill: firstString(query.skill).slice(0, 64) || null,
    availability: isMentorAvailability(availability) ? availability : null,
    scope: (MENTOR_SCOPES as readonly string[]).includes(scope) ? (scope as MentorScope) : "all",
    sort: (MENTOR_SORTS as readonly string[]).includes(sort) ? (sort as MentorSort) : "available",
    page: Number.isFinite(page) && page > 0 ? Math.min(page, 1000) : 1,
  };
}

function scopeWhere(userId: string, scope: MentorScope): Prisma.MentorProfileWhereInput {
  if (scope === "applied") {
    return { programs: { some: { applications: { some: { menteeId: userId } } } } };
  }
  if (scope === "mentoring") return { userId };
  return {};
}

function buildWhere(userId: string, filters: CatalogFilters): Prisma.MentorProfileWhereInput {
  const and: Prisma.MentorProfileWhereInput[] = [scopeWhere(userId, filters.scope)];
  if (filters.topic) and.push({ topics: { has: filters.topic } });
  if (filters.availability) and.push({ availability: filters.availability });
  if (filters.skill) and.push({ skills: { some: { skill: { slug: filters.skill } } } });

  const terms = filters.q.split(/\s+/).filter(Boolean).slice(0, MAX_SEARCH_TERMS);
  for (const term of terms) {
    const contains = { contains: term, mode: "insensitive" as const };
    and.push({
      OR: [
        { headline: contains },
        { about: contains },
        { user: { name: contains } },
        { user: { username: contains } },
        { skills: { some: { skill: { name: contains } } } },
      ],
    });
  }
  return { AND: and };
}

function orderFor(sort: MentorSort): Prisma.MentorProfileOrderByWithRelationInput[] {
  if (sort === "newest") return [{ createdAt: "desc" }];
  if (sort === "name") return [{ user: { name: "asc" } }];
  return [{ createdAt: "desc" }];
}

function sortAvailable(rows: MentorProfileWithRelations[]) {
  return [...rows].sort((a, b) => {
    const rank = (AVAILABILITY_RANK[a.availability] ?? 9) - (AVAILABILITY_RANK[b.availability] ?? 9);
    if (rank !== 0) return rank;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });
}

function toProgram(
  program: MentorshipProgramWithCounts,
  viewerApplication: { id: string; status: string } | null,
) {
  return {
    id: program.id,
    slug: program.slug,
    title: program.title,
    summary: program.summary,
    description: program.description,
    kind: program.kind,
    capacity: program.capacity,
    durationWeeks: program.durationWeeks,
    status: program.status,
    approvedCount: program._count.applications,
    seatsLeft:
      program.capacity == null ? null : Math.max(0, program.capacity - program._count.applications),
    viewerApplication,
    createdAt: program.createdAt.toISOString(),
    updatedAt: program.updatedAt.toISOString(),
  };
}

function toCard(
  profile: MentorProfileWithRelations,
  userId: string,
  applicationsByProgram: Map<string, { id: string; status: string }>,
) {
  const programs = profile.programs
    .filter((program) => program.status !== "archived")
    .map((program) => toProgram(program, applicationsByProgram.get(program.id) ?? null));
  const viewerApplication = programs.find((program) => program.viewerApplication)?.viewerApplication ?? null;
  return {
    id: profile.id,
    username: profile.user.username,
    name: profile.user.name,
    avatarUrl: profile.user.avatarUrl,
    headline: profile.headline,
    about: profile.about,
    experienceYears: profile.experienceYears,
    availability: profile.availability,
    timezone: profile.timezone,
    topics: profile.topics,
    skills: profile.skills.map((row) => row.skill).sort((a, b) => a.name.localeCompare(b.name)),
    openProgramCount: profile._count.programs,
    programs,
    viewerApplication,
    isOwner: profile.userId === userId,
    createdAt: profile.createdAt.toISOString(),
    updatedAt: profile.updatedAt.toISOString(),
  };
}

function toApplication(row: MentorshipApplicationWithRelations) {
  return {
    id: row.id,
    status: row.status,
    message: row.message,
    goals: row.goals,
    mentorNote: row.mentorNote,
    mentee: row.mentee,
    mentor: row.program.mentorProfile.user,
    program: {
      id: row.program.id,
      slug: row.program.slug,
      title: row.program.title,
      kind: row.program.kind,
      status: row.program.status,
      capacity: row.program.capacity,
    },
    createdAt: row.createdAt.toISOString(),
    reviewedAt: row.reviewedAt?.toISOString() ?? null,
    completedAt: row.completedAt?.toISOString() ?? null,
  };
}

async function applicationsMap(userId: string, profiles: MentorProfileWithRelations[]) {
  const programIds = profiles.flatMap((profile) => profile.programs.map((program) => program.id));
  const rows = await listViewerApplications(userId, programIds);
  return new Map(rows.map((row) => [row.programId, { id: row.id, status: row.status }]));
}

export async function getMentorCatalog(userId: string, query: Record<string, unknown>) {
  const filters = parseFilters(query);
  const pageSize = MENTOR_LIMITS.pageSize;
  const where = buildWhere(userId, filters);

  const [{ rows, total }, topicCounts, skills, appliedCount, mentoringCount] = await Promise.all([
    listMentorProfiles({
      where,
      orderBy: orderFor(filters.sort === "available" ? "newest" : filters.sort),
      skip: (filters.page - 1) * pageSize,
      take: pageSize,
    }),
    countMentorsByTopic(scopeWhere(userId, filters.scope)),
    listMentorSkills(),
    countMentorProfiles(scopeWhere(userId, "applied")),
    countMentorProfiles(scopeWhere(userId, "mentoring")),
  ]);

  const sorted = filters.sort === "available" ? sortAvailable(rows) : rows;
  const applications = await applicationsMap(userId, sorted);

  return {
    mentors: sorted.map((row) => toCard(row, userId, applications)),
    page: filters.page,
    pageSize,
    total,
    hasMore: filters.page * pageSize < total,
    topicCounts: Object.fromEntries(
      MENTOR_TOPICS.map((topic) => [topic, topicCounts.get(topic) ?? 0]),
    ),
    skills,
    counts: { applied: appliedCount, mentoring: mentoringCount },
  };
}

export async function getMentorByUsername(userId: string, username: string) {
  const profile = await findMentorProfileByUsername(username.trim().toLowerCase());
  if (!profile) {
    throw new AppError(404, "mentor_missing", "That mentor could not be found.");
  }
  const applications = await applicationsMap(userId, [profile]);
  return { mentor: toCard(profile, userId, applications) };
}

export async function getMyMentorship(userId: string) {
  const [profile, incoming, outgoing] = await Promise.all([
    findMentorProfileByUserId(userId),
    listApplicationsForMentor(userId),
    listApplicationsForMentee(userId),
  ]);
  const applications = profile ? await applicationsMap(userId, [profile]) : new Map();
  return {
    profile: profile ? toCard(profile, userId, applications) : null,
    incoming: incoming.map(toApplication),
    outgoing: outgoing.map(toApplication),
    counts: {
      pendingIncoming: incoming.filter((row) => row.status === "pending").length,
      activeMentees: incoming.filter((row) => row.status === "approved").length,
      outgoingPending: outgoing.filter((row) => row.status === "pending").length,
    },
  };
}

function parseTopics(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const topics = value.filter(isMentorTopic);
  return [...new Set(topics)];
}

function parseSkillSlugs(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [
    ...new Set(
      value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ].slice(0, MENTOR_LIMITS.skillMax);
}

function parseExperienceYears(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const years = typeof value === "number" ? value : Number.parseInt(String(value), 10);
  if (!Number.isFinite(years) || years < 0 || years > MENTOR_LIMITS.experienceYearsMax) {
    throw new AppError(
      400,
      "invalid_experience_years",
      `Experience must be between 0 and ${MENTOR_LIMITS.experienceYearsMax} years.`,
    );
  }
  return Math.round(years);
}

async function resolveSkills(slugs: string[]) {
  const skills = await findSkillIdsBySlugs(slugs);
  if (skills.length !== slugs.length) {
    throw new AppError(400, "invalid_skills", "One or more technologies are not in the catalog.");
  }
  return skills;
}

function parseProfileBody(body: Record<string, unknown>) {
  const headline = readString(body, "headline");
  const about = readString(body, "about");
  const timezone = readString(body, "timezone").slice(0, MENTOR_LIMITS.timezoneMax);
  const availability = readString(body, "availability");
  const topics = parseTopics(body.topics);
  const skillSlugs = parseSkillSlugs(body.skillSlugs);

  if (headline.length < MENTOR_LIMITS.headlineMin || headline.length > MENTOR_LIMITS.headlineMax) {
    throw new AppError(
      400,
      "invalid_headline",
      `Headline must be ${MENTOR_LIMITS.headlineMin}–${MENTOR_LIMITS.headlineMax} characters.`,
    );
  }
  if (about.length < MENTOR_LIMITS.aboutMin || about.length > MENTOR_LIMITS.aboutMax) {
    throw new AppError(
      400,
      "invalid_about",
      `About must be ${MENTOR_LIMITS.aboutMin}–${MENTOR_LIMITS.aboutMax} characters.`,
    );
  }
  if (!isMentorAvailability(availability)) {
    throw new AppError(400, "invalid_availability", "Choose a valid availability.");
  }
  if (topics.length < MENTOR_LIMITS.topicMin || topics.length > MENTOR_LIMITS.topicMax) {
    throw new AppError(
      400,
      "invalid_topics",
      `Pick ${MENTOR_LIMITS.topicMin}–${MENTOR_LIMITS.topicMax} topics you will help with.`,
    );
  }

  return {
    headline,
    about,
    experienceYears: parseExperienceYears(body.experienceYears),
    availability,
    timezone: timezone || null,
    topics,
    skillSlugs,
  };
}

export async function upsertMyMentorProfile(userId: string, body: unknown) {
  if (!body || typeof body !== "object") {
    throw new AppError(400, "invalid_profile", "Send a mentor profile.");
  }
  const parsed = parseProfileBody(body as Record<string, unknown>);
  const skills = await resolveSkills(parsed.skillSlugs);
  const existing = await findMentorProfileByUserId(userId);
  const data = {
    headline: parsed.headline,
    about: parsed.about,
    experienceYears: parsed.experienceYears,
    availability: parsed.availability,
    timezone: parsed.timezone,
    topics: parsed.topics,
    skillIds: skills.map((skill) => skill.id),
  };

  const profile = existing
    ? await updateMentorProfile(existing.id, data)
    : await createMentorProfile({ userId, ...data });

  if (!existing) {
    const kind = parsed.topics[0] ?? "learning";
    await createProgram({
      mentorProfileId: profile.id,
      slug: programSlugFromTitle("Open mentorship", []),
      title: "Open mentorship",
      summary: `Apply if you want help with ${kind.replaceAll("_", " ")}. I review every request.`,
      description:
        "Tell me what you are working on and what you want from mentorship. I approve a small number of learners so the work stays useful.",
      kind,
      capacity: 6,
      durationWeeks: 8,
      status: mentorAcceptsApplications(parsed.availability) ? "open" : "closed",
    });
  }

  const latest = (await findMentorProfileByUserId(userId)) ?? profile;
  return { mentor: toCard(latest, userId, new Map()) };
}

function parseOptionalInt(
  value: unknown,
  key: "capacity" | "durationWeeks",
  max: number,
): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed) || parsed < 1 || parsed > max) {
    throw new AppError(400, `invalid_${key}`, `Enter a number between 1 and ${max}.`);
  }
  return Math.round(parsed);
}

function parseProgramBody(body: Record<string, unknown>, options?: { requireStatus?: boolean }) {
  const title = readString(body, "title");
  const summary = readString(body, "summary");
  const description = readString(body, "description");
  const kind = readString(body, "kind");
  const status = readString(body, "status") || "open";

  if (title.length < MENTOR_LIMITS.programTitleMin || title.length > MENTOR_LIMITS.programTitleMax) {
    throw new AppError(
      400,
      "invalid_title",
      `Title must be ${MENTOR_LIMITS.programTitleMin}–${MENTOR_LIMITS.programTitleMax} characters.`,
    );
  }
  if (
    summary.length < MENTOR_LIMITS.programSummaryMin ||
    summary.length > MENTOR_LIMITS.programSummaryMax
  ) {
    throw new AppError(
      400,
      "invalid_summary",
      `Summary must be ${MENTOR_LIMITS.programSummaryMin}–${MENTOR_LIMITS.programSummaryMax} characters.`,
    );
  }
  if (description.length > MENTOR_LIMITS.programDescriptionMax) {
    throw new AppError(
      400,
      "invalid_description",
      `Description must be ${MENTOR_LIMITS.programDescriptionMax} characters or fewer.`,
    );
  }
  if (!isMentorTopic(kind)) {
    throw new AppError(400, "invalid_kind", "Choose a valid program focus.");
  }
  if (options?.requireStatus !== false && !isMentorProgramStatus(status)) {
    throw new AppError(400, "invalid_status", "Choose a valid program status.");
  }

  return {
    title,
    summary,
    description,
    kind,
    capacity: parseOptionalInt(body.capacity, "capacity", MENTOR_LIMITS.capacityMax),
    durationWeeks: parseOptionalInt(body.durationWeeks, "durationWeeks", MENTOR_LIMITS.durationWeeksMax),
    status: isMentorProgramStatus(status) ? status : "open",
  };
}

async function requireMyProfile(userId: string) {
  const profile = await findMentorProfileByUserId(userId);
  if (!profile) {
    throw new AppError(403, "mentor_required", "Create a mentor profile before offering programs.");
  }
  return profile;
}

export async function createMyProgram(userId: string, body: unknown) {
  if (!body || typeof body !== "object") {
    throw new AppError(400, "invalid_program", "Send a mentorship program.");
  }
  const profile = await requireMyProfile(userId);
  const parsed = parseProgramBody(body as Record<string, unknown>);
  if (parsed.status === "open") {
    const openCount = await countOpenPrograms(profile.id);
    if (openCount >= MENTOR_LIMITS.openProgramsMax) {
      throw new AppError(
        400,
        "program_limit",
        `You can have ${MENTOR_LIMITS.openProgramsMax} open programs at a time.`,
      );
    }
  }
  const slug = programSlugFromTitle(parsed.title, await listProgramSlugs(profile.id));
  const program = await createProgram({
    mentorProfileId: profile.id,
    slug,
    ...parsed,
  });
  return { program: toProgram(program, null) };
}

export async function updateMyProgram(userId: string, programId: string, body: unknown) {
  if (!body || typeof body !== "object") {
    throw new AppError(400, "invalid_program", "Send a mentorship program.");
  }
  const profile = await requireMyProfile(userId);
  const existing = await findProgramById(programId);
  if (!existing || existing.mentorProfile.userId !== userId) {
    throw new AppError(404, "program_missing", "That program could not be found.");
  }
  const parsed = parseProgramBody(body as Record<string, unknown>);
  if (parsed.status === "open" && existing.status !== "open") {
    const openCount = await countOpenPrograms(profile.id);
    if (openCount >= MENTOR_LIMITS.openProgramsMax) {
      throw new AppError(
        400,
        "program_limit",
        `You can have ${MENTOR_LIMITS.openProgramsMax} open programs at a time.`,
      );
    }
  }
  const program = await updateProgram(existing.id, parsed);
  return { program: toProgram(program, null) };
}

export async function applyToProgram(
  userId: string,
  username: string,
  slug: string,
  body: unknown,
) {
  if (!body || typeof body !== "object") {
    throw new AppError(400, "invalid_application", "Tell the mentor why you want to join.");
  }
  const record = body as Record<string, unknown>;
  const message = readString(record, "message");
  const goals = readString(record, "goals");
  if (
    message.length < MENTOR_LIMITS.applicationMessageMin ||
    message.length > MENTOR_LIMITS.applicationMessageMax
  ) {
    throw new AppError(
      400,
      "invalid_message",
      `Your note must be ${MENTOR_LIMITS.applicationMessageMin}–${MENTOR_LIMITS.applicationMessageMax} characters.`,
    );
  }
  if (goals.length > MENTOR_LIMITS.applicationGoalsMax) {
    throw new AppError(
      400,
      "invalid_goals",
      `Goals must be ${MENTOR_LIMITS.applicationGoalsMax} characters or fewer.`,
    );
  }

  const profile = await findMentorProfileByUsername(username.trim().toLowerCase());
  if (!profile) {
    throw new AppError(404, "mentor_missing", "That mentor could not be found.");
  }
  if (profile.userId === userId) {
    throw new AppError(400, "invalid_application", "You cannot apply to your own program.");
  }
  if (!mentorAcceptsApplications(profile.availability)) {
    throw new AppError(409, "mentor_paused", "This mentor is not accepting applications right now.");
  }

  const program = await findProgramByMentorAndSlug(profile.id, slug);
  if (!program || program.status !== "open") {
    throw new AppError(404, "program_missing", "That program is not open for applications.");
  }
  if (program.capacity != null && program._count.applications >= program.capacity) {
    throw new AppError(409, "program_full", "This program is full. Ask the mentor to open another seat.");
  }

  const existing = await findApplicationByProgramAndMentee(program.id, userId);
  if (existing?.status === "pending") {
    throw new AppError(409, "application_exists", "You already have a pending application.");
  }
  if (existing?.status === "approved" || existing?.status === "completed") {
    throw new AppError(409, "application_exists", "You are already in this program.");
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recent = await countApplicationsSince(userId, since);
  if (!existing && recent >= MENTOR_LIMITS.dailyApplications) {
    throw new AppError(429, "submission_limit", "You have sent enough applications for today.");
  }

  const application = existing
    ? await updateApplication(existing.id, {
        message,
        goals,
        status: "pending",
        mentorNote: null,
        reviewedAt: null,
        completedAt: null,
      })
    : await createApplication({ programId: program.id, menteeId: userId, message, goals });

  await notifyMentorApplication({
    mentorUserId: profile.userId,
    mentee: application.mentee,
    applicationId: application.id,
    programTitle: program.title,
  });

  return { application: toApplication(application) };
}

function requireMentorNote(body: unknown) {
  if (!body || typeof body !== "object") return null;
  const note = readString(body as Record<string, unknown>, "mentorNote");
  if (note.length > MENTOR_LIMITS.mentorNoteMax) {
    throw new AppError(
      400,
      "invalid_note",
      `Note must be ${MENTOR_LIMITS.mentorNoteMax} characters or fewer.`,
    );
  }
  return note || null;
}

async function requireMentorOwnedApplication(userId: string, applicationId: string) {
  const application = await findApplicationById(applicationId);
  if (!application) {
    throw new AppError(404, "application_missing", "That application could not be found.");
  }
  if (application.program.mentorProfile.userId !== userId) {
    throw new AppError(403, "forbidden", "Only the mentor can review this application.");
  }
  return application;
}

export async function approveApplication(userId: string, applicationId: string, body: unknown) {
  const application = await requireMentorOwnedApplication(userId, applicationId);
  if (application.status !== "pending") {
    throw new AppError(409, "invalid_transition", "Only pending applications can be approved.");
  }
  const program = await findProgramById(application.program.id);
  if (program?.capacity != null) {
    const approved = await countApprovedForProgram(program.id);
    if (approved >= program.capacity) {
      throw new AppError(409, "program_full", "This program is at capacity. Close it or add seats first.");
    }
  }
  const updated = await updateApplication(application.id, {
    status: "approved",
    mentorNote: requireMentorNote(body),
    reviewedAt: new Date(),
  });
  await notifyMentorApplicationUpdate({
    menteeId: updated.mentee.id,
    mentor: updated.program.mentorProfile.user,
    applicationId: updated.id,
    programTitle: updated.program.title,
    status: "approved",
  });
  return { application: toApplication(updated) };
}

export async function declineApplication(userId: string, applicationId: string, body: unknown) {
  const application = await requireMentorOwnedApplication(userId, applicationId);
  if (application.status !== "pending") {
    throw new AppError(409, "invalid_transition", "Only pending applications can be declined.");
  }
  const updated = await updateApplication(application.id, {
    status: "declined",
    mentorNote: requireMentorNote(body),
    reviewedAt: new Date(),
  });
  await notifyMentorApplicationUpdate({
    menteeId: updated.mentee.id,
    mentor: updated.program.mentorProfile.user,
    applicationId: updated.id,
    programTitle: updated.program.title,
    status: "declined",
  });
  return { application: toApplication(updated) };
}

export async function completeApplication(userId: string, applicationId: string) {
  const application = await requireMentorOwnedApplication(userId, applicationId);
  if (application.status !== "approved") {
    throw new AppError(409, "invalid_transition", "Only approved mentorships can be marked complete.");
  }
  const updated = await updateApplication(application.id, {
    status: "completed",
    completedAt: new Date(),
  });
  await notifyMentorApplicationUpdate({
    menteeId: updated.mentee.id,
    mentor: updated.program.mentorProfile.user,
    applicationId: updated.id,
    programTitle: updated.program.title,
    status: "completed",
  });
  scheduleAchievementEvaluation(userId);
  return { application: toApplication(updated) };
}

export async function withdrawApplication(userId: string, applicationId: string) {
  const application = await findApplicationById(applicationId);
  if (!application || application.mentee.id !== userId) {
    throw new AppError(404, "application_missing", "That application could not be found.");
  }
  if (application.status !== "pending") {
    throw new AppError(409, "invalid_transition", "Only pending applications can be withdrawn.");
  }
  const updated = await updateApplication(application.id, { status: "withdrawn" });
  return { application: toApplication(updated) };
}

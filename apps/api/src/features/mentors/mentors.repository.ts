import type { Prisma } from "@prisma/client";
import { prisma } from "../../shared/db.js";

const personSelect = {
  id: true,
  username: true,
  name: true,
  avatarUrl: true,
} satisfies Prisma.UserSelect;

const skillSelect = { slug: true, name: true } satisfies Prisma.SkillSelect;

const programInclude = {
  _count: {
    select: {
      applications: { where: { status: "approved" } },
    },
  },
} satisfies Prisma.MentorshipProgramInclude;

const profileInclude = {
  user: { select: personSelect },
  skills: { include: { skill: { select: skillSelect } } },
  programs: {
    where: { status: { not: "archived" } },
    orderBy: { createdAt: "asc" as const },
    include: programInclude,
  },
  _count: {
    select: {
      programs: { where: { status: "open" } },
    },
  },
} satisfies Prisma.MentorProfileInclude;

const applicationInclude = {
  mentee: { select: { ...personSelect, bio: true } },
  program: {
    select: {
      id: true,
      slug: true,
      title: true,
      kind: true,
      status: true,
      capacity: true,
      mentorProfile: {
        select: {
          id: true,
          userId: true,
          user: { select: personSelect },
        },
      },
    },
  },
} satisfies Prisma.MentorshipApplicationInclude;

export type MentorProfileWithRelations = Prisma.MentorProfileGetPayload<{
  include: typeof profileInclude;
}>;

export type MentorshipProgramWithCounts = Prisma.MentorshipProgramGetPayload<{
  include: typeof programInclude;
}>;

export type MentorshipApplicationWithRelations = Prisma.MentorshipApplicationGetPayload<{
  include: typeof applicationInclude;
}>;

export async function listMentorProfiles(input: {
  where: Prisma.MentorProfileWhereInput;
  orderBy: Prisma.MentorProfileOrderByWithRelationInput[];
  skip: number;
  take: number;
}): Promise<{ rows: MentorProfileWithRelations[]; total: number }> {
  const [rows, total] = await prisma.$transaction([
    prisma.mentorProfile.findMany({
      where: input.where,
      include: profileInclude,
      orderBy: input.orderBy,
      skip: input.skip,
      take: input.take,
    }),
    prisma.mentorProfile.count({ where: input.where }),
  ]);
  return { rows, total };
}

export async function countMentorProfiles(where: Prisma.MentorProfileWhereInput) {
  return prisma.mentorProfile.count({ where });
}

export async function countMentorsByTopic(where: Prisma.MentorProfileWhereInput) {
  const rows = await prisma.mentorProfile.findMany({
    where,
    select: { topics: true },
  });
  const counts = new Map<string, number>();
  for (const row of rows) {
    for (const topic of row.topics) {
      counts.set(topic, (counts.get(topic) ?? 0) + 1);
    }
  }
  return counts;
}

/** Skills that tag at least one mentor, for the filter menu. */
export async function listMentorSkills() {
  return prisma.skill.findMany({
    where: { mentors: { some: {} } },
    select: { slug: true, name: true, category: true },
    orderBy: { name: "asc" },
  });
}

export async function findSkillIdsBySlugs(slugs: string[]) {
  if (slugs.length === 0) return [];
  return prisma.skill.findMany({
    where: { slug: { in: slugs } },
    select: { id: true, slug: true },
  });
}

export async function findMentorProfileByUserId(
  userId: string,
): Promise<MentorProfileWithRelations | null> {
  return prisma.mentorProfile.findUnique({
    where: { userId },
    include: profileInclude,
  });
}

export async function findMentorProfileByUsername(
  username: string,
): Promise<MentorProfileWithRelations | null> {
  return prisma.mentorProfile.findFirst({
    where: { user: { username: { equals: username, mode: "insensitive" } } },
    include: profileInclude,
  });
}

export async function createMentorProfile(input: {
  userId: string;
  headline: string;
  about: string;
  experienceYears: number | null;
  availability: string;
  timezone: string | null;
  topics: string[];
  skillIds: string[];
}): Promise<MentorProfileWithRelations> {
  const { skillIds, ...data } = input;
  return prisma.mentorProfile.create({
    data: {
      ...data,
      skills: { create: skillIds.map((skillId) => ({ skillId })) },
    },
    include: profileInclude,
  });
}

export async function updateMentorProfile(
  id: string,
  input: {
    headline: string;
    about: string;
    experienceYears: number | null;
    availability: string;
    timezone: string | null;
    topics: string[];
    skillIds: string[];
  },
): Promise<MentorProfileWithRelations> {
  const { skillIds, ...data } = input;
  return prisma.$transaction(async (tx) => {
    await tx.mentorProfileSkill.deleteMany({ where: { mentorProfileId: id } });
    return tx.mentorProfile.update({
      where: { id },
      data: {
        ...data,
        skills: { create: skillIds.map((skillId) => ({ skillId })) },
      },
      include: profileInclude,
    });
  });
}

export async function findProgramById(id: string) {
  return prisma.mentorshipProgram.findUnique({
    where: { id },
    include: {
      ...programInclude,
      mentorProfile: { select: { id: true, userId: true, availability: true } },
    },
  });
}

export async function findProgramByMentorAndSlug(mentorProfileId: string, slug: string) {
  return prisma.mentorshipProgram.findUnique({
    where: { mentorProfileId_slug: { mentorProfileId, slug } },
    include: {
      ...programInclude,
      mentorProfile: { select: { id: true, userId: true, availability: true } },
    },
  });
}

export async function listProgramSlugs(mentorProfileId: string) {
  const rows = await prisma.mentorshipProgram.findMany({
    where: { mentorProfileId },
    select: { slug: true },
  });
  return rows.map((row) => row.slug);
}

export async function countOpenPrograms(mentorProfileId: string) {
  return prisma.mentorshipProgram.count({
    where: { mentorProfileId, status: "open" },
  });
}

export async function createProgram(input: {
  mentorProfileId: string;
  slug: string;
  title: string;
  summary: string;
  description: string;
  kind: string;
  capacity: number | null;
  durationWeeks: number | null;
  status: string;
}): Promise<MentorshipProgramWithCounts> {
  return prisma.mentorshipProgram.create({
    data: input,
    include: programInclude,
  });
}

export async function updateProgram(
  id: string,
  input: {
    title: string;
    summary: string;
    description: string;
    kind: string;
    capacity: number | null;
    durationWeeks: number | null;
    status: string;
  },
): Promise<MentorshipProgramWithCounts> {
  return prisma.mentorshipProgram.update({
    where: { id },
    data: input,
    include: programInclude,
  });
}

export async function findApplicationById(
  id: string,
): Promise<MentorshipApplicationWithRelations | null> {
  return prisma.mentorshipApplication.findUnique({
    where: { id },
    include: applicationInclude,
  });
}

export async function findApplicationByProgramAndMentee(programId: string, menteeId: string) {
  return prisma.mentorshipApplication.findUnique({
    where: { programId_menteeId: { programId, menteeId } },
    include: applicationInclude,
  });
}

export async function listApplicationsForMentee(menteeId: string) {
  return prisma.mentorshipApplication.findMany({
    where: { menteeId },
    include: applicationInclude,
    orderBy: { createdAt: "desc" },
  });
}

export async function listApplicationsForMentor(mentorUserId: string) {
  return prisma.mentorshipApplication.findMany({
    where: { program: { mentorProfile: { userId: mentorUserId } } },
    include: applicationInclude,
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });
}

export async function listViewerApplications(menteeId: string, programIds: string[]) {
  if (programIds.length === 0) return [];
  return prisma.mentorshipApplication.findMany({
    where: { menteeId, programId: { in: programIds } },
    select: { id: true, programId: true, status: true },
  });
}

export async function createApplication(input: {
  programId: string;
  menteeId: string;
  message: string;
  goals: string;
}): Promise<MentorshipApplicationWithRelations> {
  return prisma.mentorshipApplication.create({
    data: { ...input, status: "pending" },
    include: applicationInclude,
  });
}

export async function updateApplication(
  id: string,
  data: Prisma.MentorshipApplicationUpdateInput,
): Promise<MentorshipApplicationWithRelations> {
  return prisma.mentorshipApplication.update({
    where: { id },
    data,
    include: applicationInclude,
  });
}

export async function countApplicationsSince(menteeId: string, since: Date) {
  return prisma.mentorshipApplication.count({
    where: { menteeId, createdAt: { gte: since } },
  });
}

export async function countApprovedForProgram(programId: string) {
  return prisma.mentorshipApplication.count({
    where: { programId, status: "approved" },
  });
}

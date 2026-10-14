import { prisma } from "../../shared/db.js";

export async function listSkills() {
  return prisma.skill.findMany({
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });
}

export async function findSkillBySlug(slug: string) {
  return prisma.skill.findUnique({ where: { slug } });
}

export async function listSkillEdges() {
  return prisma.skillEdge.findMany({
    include: {
      fromSkill: { select: { slug: true } },
      toSkill: { select: { slug: true } },
    },
  });
}

export async function listUserInterestSkillIds(userId: string) {
  const rows = await prisma.userSkill.findMany({
    where: { userId },
    select: { skillId: true },
  });
  return new Set(rows.map((row) => row.skillId));
}

/** Enrolled courses (in progress or complete) with their skill ids. */
export async function listCourseSkillActivity(userId: string) {
  return prisma.userCourse.findMany({
    where: { userId },
    select: {
      courseId: true,
      completedAt: true,
      course: {
        select: {
          skills: { select: { skillId: true } },
        },
      },
    },
  });
}

export async function listRoadmapSkillActivity(userId: string) {
  return prisma.userRoadmap.findMany({
    where: { userId },
    select: {
      completedAt: true,
      roadmap: { select: { skillSlugs: true } },
    },
  });
}

export async function listProjectSkillActivity(userId: string) {
  return prisma.projectSubmission.findMany({
    where: { userId },
    select: {
      status: true,
      submittedAt: true,
      project: {
        select: {
          skills: { select: { skillId: true } },
        },
      },
    },
  });
}

export async function listPassedAssessmentSkillIds(userId: string) {
  const rows = await prisma.assessmentAttempt.findMany({
    where: { userId, passed: true, status: "submitted" },
    select: {
      assessment: {
        select: {
          course: {
            select: {
              skills: { select: { skillId: true } },
            },
          },
        },
      },
    },
  });
  return rows.flatMap((row) => row.assessment.course.skills.map((skill) => skill.skillId));
}

export async function listCredentialSkillIds(userId: string) {
  const rows = await prisma.credential.findMany({
    where: { userId },
    select: {
      kind: true,
      assessment: {
        select: {
          course: {
            select: {
              skills: { select: { skillId: true } },
            },
          },
        },
      },
      project: {
        select: {
          skills: { select: { skillId: true } },
        },
      },
    },
  });

  const skillIds: string[] = [];
  for (const row of rows) {
    if (row.assessment?.course) {
      for (const skill of row.assessment.course.skills) {
        skillIds.push(skill.skillId);
      }
    }
    if (row.project) {
      for (const skill of row.project.skills) {
        skillIds.push(skill.skillId);
      }
    }
  }
  return skillIds;
}

export async function upsertSkillProgress(
  userId: string,
  skillId: string,
  status: string,
  evidence: object,
) {
  return prisma.userSkillProgress.upsert({
    where: { userId_skillId: { userId, skillId } },
    create: { userId, skillId, status, evidence },
    update: { status, evidence },
  });
}

export async function deleteStaleSkillProgress(userId: string, keepSkillIds: string[]) {
  if (keepSkillIds.length === 0) {
    return prisma.userSkillProgress.deleteMany({ where: { userId } });
  }
  return prisma.userSkillProgress.deleteMany({
    where: { userId, skillId: { notIn: keepSkillIds } },
  });
}

export async function listUserIds() {
  const rows = await prisma.user.findMany({
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });
  return rows.map((row) => row.id);
}

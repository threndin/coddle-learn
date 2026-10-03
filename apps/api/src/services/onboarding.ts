import { parseOnboardingInput } from "@coddle/shared";
import { prisma } from "../db.js";
import { AppError } from "../lib/errors.js";
import { toPublicUser } from "./users.js";

export async function completeOnboarding(userId: string, input: unknown) {
  const parsed = parseOnboardingInput(input);
  if (!parsed.ok) {
    throw new AppError(400, "invalid_onboarding", parsed.message);
  }

  const { value } = parsed;

  await prisma.$transaction(async (tx) => {
    const skillIds: string[] = [];
    for (const skill of value.skills) {
      const row = await tx.skill.upsert({
        where: { slug: skill.slug },
        create: {
          slug: skill.slug,
          name: skill.name,
          category: skill.category,
        },
        update: { name: skill.name },
      });
      skillIds.push(row.id);
    }

    await tx.userSkill.deleteMany({ where: { userId } });
    await tx.userSkill.createMany({
      data: skillIds.map((skillId) => ({ userId, skillId })),
    });
    await tx.user.update({
      where: { id: userId },
      data: {
        bio: value.bio,
        experienceLevel: value.experienceLevel,
        dailyGoalMinutes: value.dailyGoalMinutes,
        practiceDays: value.practiceDays,
        startingRoadmapSlug: value.roadmapSlug,
        onboardingCompletedAt: new Date(),
      },
    });
  });

  const updated = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      skills: {
        include: { skill: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!updated) {
    throw new AppError(404, "user_missing", "Account no longer exists. Sign in again.");
  }

  return toPublicUser(updated);
}

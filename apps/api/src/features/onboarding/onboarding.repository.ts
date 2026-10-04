import { ONBOARDING_POINTS, type NormalizedOnboarding } from "@coddle/shared";
import { prisma } from "../../shared/db.js";
import { findById, type UserWithSkills } from "../users/users.repository.js";

export async function saveOnboarding(
  userId: string,
  value: NormalizedOnboarding,
): Promise<UserWithSkills | null> {
  await prisma.$transaction(async (tx) => {
    const existing = await tx.user.findUnique({
      where: { id: userId },
      select: { onboardingCompletedAt: true },
    });
    const awardOnboardingPoints = !existing?.onboardingCompletedAt;

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
        ...(awardOnboardingPoints ? { points: { increment: ONBOARDING_POINTS } } : {}),
      },
    });
  });

  return findById(userId);
}

import type { NormalizedProfileUpdate } from "@coddle/shared";
import { prisma } from "../../shared/db.js";
import { findById, type UserWithSkills } from "../users/users.repository.js";

export async function saveProfileUpdate(
  userId: string,
  value: NormalizedProfileUpdate,
): Promise<UserWithSkills | null> {
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
        showRoadmapsPublic: value.visibility.roadmaps,
        showProjectsPublic: value.visibility.projects,
        showPostsPublic: value.visibility.posts,
        showSkillsPublic: value.visibility.skills,
        showCredentialsPublic: value.visibility.credentials,
        showAchievementsPublic: value.visibility.achievements,
      },
    });
  });

  return findById(userId);
}

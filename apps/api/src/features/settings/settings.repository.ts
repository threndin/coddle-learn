import type { NormalizedSettingsUpdate } from "@coddle/shared";
import type { Prisma } from "@prisma/client";
import { prisma } from "../../shared/db.js";
import { findById, type UserWithSkills } from "../users/users.repository.js";

export async function saveSettings(
  userId: string,
  value: NormalizedSettingsUpdate,
): Promise<UserWithSkills | null> {
  const data: Prisma.UserUpdateInput = {};

  if (value.dailyGoalMinutes !== undefined) {
    data.dailyGoalMinutes = value.dailyGoalMinutes;
  }
  if (value.practiceDays !== undefined) {
    data.practiceDays = value.practiceDays;
  }
  if (value.notificationPrefs) {
    data.notifyAccount = value.notificationPrefs.account;
    data.notifyCommunity = value.notificationPrefs.community;
    data.notifyLearning = value.notificationPrefs.learning;
    data.notifyMentorship = value.notificationPrefs.mentorship;
    data.notifyModeration = value.notificationPrefs.moderation;
  }

  await prisma.user.update({
    where: { id: userId },
    data,
  });

  return findById(userId);
}

import { parseOnboardingInput } from "@coddle/shared";
import { AppError } from "../../shared/errors.js";
import { notifyOnboardingComplete } from "../notifications/notifications.events.js";
import { findUserById, toPublicUser } from "../users/users.service.js";
import { saveOnboarding } from "./onboarding.repository.js";

export async function completeOnboarding(userId: string, input: unknown) {
  const parsed = parseOnboardingInput(input);
  if (!parsed.ok) {
    throw new AppError(400, "invalid_onboarding", parsed.message);
  }

  const existing = await findUserById(userId);
  const firstComplete = !existing?.onboardingCompletedAt;

  const updated = await saveOnboarding(userId, parsed.value);
  if (!updated) {
    throw new AppError(404, "user_missing", "Account no longer exists. Sign in again.");
  }

  if (firstComplete) {
    await notifyOnboardingComplete(userId, parsed.value.roadmapSlug);
  }

  return toPublicUser(updated);
}

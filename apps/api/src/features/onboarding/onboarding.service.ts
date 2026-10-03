import { parseOnboardingInput } from "@coddle/shared";
import { AppError } from "../../shared/errors.js";
import { toPublicUser } from "../users/users.service.js";
import { saveOnboarding } from "./onboarding.repository.js";

export async function completeOnboarding(userId: string, input: unknown) {
  const parsed = parseOnboardingInput(input);
  if (!parsed.ok) {
    throw new AppError(400, "invalid_onboarding", parsed.message);
  }

  const updated = await saveOnboarding(userId, parsed.value);
  if (!updated) {
    throw new AppError(404, "user_missing", "Account no longer exists. Sign in again.");
  }

  return toPublicUser(updated);
}

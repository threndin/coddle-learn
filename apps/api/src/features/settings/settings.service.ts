import { parseSettingsUpdate } from "@coddle/shared";
import { AppError } from "../../shared/errors.js";
import { toPublicUser } from "../users/users.service.js";
import { saveSettings } from "./settings.repository.js";

export async function updateOwnSettings(userId: string, input: unknown) {
  const parsed = parseSettingsUpdate(input);
  if (!parsed.ok) {
    throw new AppError(400, "invalid_settings", parsed.message);
  }

  const updated = await saveSettings(userId, parsed.value);
  if (!updated) {
    throw new AppError(404, "user_missing", "Account no longer exists. Sign in again.");
  }

  return toPublicUser(updated);
}

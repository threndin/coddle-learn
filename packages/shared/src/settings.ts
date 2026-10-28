import {
  isValidDailyGoal,
  normalizePracticeDays,
  type PracticeDay,
} from "./onboarding.js";
import { parseNotificationPrefs, type NotificationPrefs } from "./notifications.js";

export const SETTINGS_TABS = ["account", "notifications", "learning"] as const;
export type SettingsTab = (typeof SETTINGS_TABS)[number];
export const DEFAULT_SETTINGS_TAB: SettingsTab = "account";

export type NormalizedSettingsUpdate = {
  dailyGoalMinutes?: number;
  practiceDays?: PracticeDay[];
  notificationPrefs?: NotificationPrefs;
};

export function isSettingsTab(value: unknown): value is SettingsTab {
  return typeof value === "string" && (SETTINGS_TABS as readonly string[]).includes(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Partial settings payload (daily goal, practice days, in-app notification mutes). */
export function parseSettingsUpdate(
  input: unknown,
): { ok: true; value: NormalizedSettingsUpdate } | { ok: false; message: string } {
  if (!isRecord(input)) {
    return { ok: false, message: "Settings could not be read." };
  }

  const value: NormalizedSettingsUpdate = {};

  if (input.dailyGoalMinutes !== undefined) {
    if (typeof input.dailyGoalMinutes !== "number" || !isValidDailyGoal(input.dailyGoalMinutes)) {
      return { ok: false, message: "Choose a daily goal between 15 and 120 minutes." };
    }
    value.dailyGoalMinutes = input.dailyGoalMinutes;
  }

  if (input.practiceDays !== undefined) {
    const practiceDays = normalizePracticeDays(input.practiceDays);
    if (practiceDays.length < 1) {
      return { ok: false, message: "Choose at least one day." };
    }
    value.practiceDays = practiceDays;
  }

  if (input.notificationPrefs !== undefined) {
    const parsed = parseNotificationPrefs(input.notificationPrefs);
    if (!parsed.ok) return parsed;
    value.notificationPrefs = parsed.value;
  }

  if (
    value.dailyGoalMinutes === undefined &&
    value.practiceDays === undefined &&
    value.notificationPrefs === undefined
  ) {
    return { ok: false, message: "Nothing to update." };
  }

  return { ok: true, value };
}

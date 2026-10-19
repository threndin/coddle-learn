import type {
  ExperienceLevel,
  LearnUser,
  PracticeDay,
  ProfileVisibility,
} from "@coddle/shared";
import { apiFetch, csrfHeaders } from "@/lib/api-client";

export type PublicUser = LearnUser;

export type OnboardingSubmission = {
  bio: string;
  experienceLevel: ExperienceLevel;
  skills: { slug: string; name: string }[];
  roadmapSlug: string;
  dailyGoalMinutes: number;
  practiceDays: PracticeDay[];
};

export type ProfileUpdateSubmission = {
  bio: string;
  experienceLevel: ExperienceLevel;
  skills: { slug: string; name: string }[];
  visibility: ProfileVisibility;
};

export async function fetchMe(): Promise<PublicUser | null> {
  const res = await apiFetch("/api/auth/me");
  if (res.status === 401) return null;
  if (!res.ok) throw new Error("Could not load session");
  const body = (await res.json()) as { data: { user: PublicUser; csrf?: string } };
  return body.data.user;
}

export async function logout(): Promise<void> {
  await apiFetch("/api/auth/logout", {
    method: "POST",
    headers: csrfHeaders(),
  });
}

export function startCoddleLogin(): void {
  window.location.href = "/api/auth/coddle/start";
}

export async function completeOnboarding(input: OnboardingSubmission): Promise<PublicUser> {
  const res = await apiFetch("/api/onboarding", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...csrfHeaders(),
    },
    body: JSON.stringify(input),
  });

  if (res.status === 401) {
    throw new Error("UNAUTHENTICATED");
  }

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as {
      error?: { message?: string };
    } | null;
    throw new Error(body?.error?.message ?? "Could not save your setup");
  }

  const body = (await res.json()) as { data: { user: PublicUser } };
  return body.data.user;
}

export async function updateProfile(input: ProfileUpdateSubmission): Promise<PublicUser> {
  const res = await apiFetch("/api/profiles/me", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...csrfHeaders(),
    },
    body: JSON.stringify(input),
  });

  if (res.status === 401) {
    throw new Error("UNAUTHENTICATED");
  }

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as {
      error?: { message?: string };
    } | null;
    throw new Error(body?.error?.message ?? "Could not save your profile");
  }

  const body = (await res.json()) as { data: { user: PublicUser } };
  return body.data.user;
}

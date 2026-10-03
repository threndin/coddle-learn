import type { ExperienceLevel, LearnUser, PracticeDay } from "@coddle/shared";

export type PublicUser = LearnUser;

export type OnboardingSubmission = {
  bio: string;
  experienceLevel: ExperienceLevel;
  skills: { slug: string; name: string }[];
  roadmapSlug: string;
  dailyGoalMinutes: number;
  practiceDays: PracticeDay[];
};

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`));
  if (!match) return null;
  return decodeURIComponent(match.slice(name.length + 1));
}

export async function fetchMe(): Promise<PublicUser | null> {
  const res = await fetch("/api/auth/me", {
    credentials: "include",
    cache: "no-store",
  });
  if (res.status === 401) return null;
  if (!res.ok) throw new Error("Could not load session");
  const body = (await res.json()) as { data: { user: PublicUser; csrf?: string } };
  return body.data.user;
}

export async function logout(): Promise<void> {
  const csrf = readCookie("learn_csrf");
  await fetch("/api/auth/logout", {
    method: "POST",
    credentials: "include",
    headers: csrf ? { "x-csrf-token": csrf } : {},
  });
}

export function startCoddleLogin(): void {
  window.location.href = "/api/auth/coddle/start";
}

export async function completeOnboarding(input: OnboardingSubmission): Promise<PublicUser> {
  const csrf = readCookie("learn_csrf");
  const res = await fetch("/api/onboarding", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(csrf ? { "x-csrf-token": csrf } : {}),
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

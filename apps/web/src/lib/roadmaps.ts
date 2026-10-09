import type { ExperienceLevel, StepProgressStatus } from "@coddle/shared";

export type RoadmapResource = {
  id: string;
  title: string;
  url: string;
  type: string;
  bookmarked?: boolean;
};

export type RoadmapStepStatus =
  | "locked"
  | "current"
  | "completed"
  | "skipped"
  | "optional";

export type RoadmapCatalogItem = {
  slug: string;
  name: string;
  level: ExperienceLevel | string;
  summary: string;
  weeks: number;
  skillSlugs: string[];
  matchedSkillSlugs: string[];
  stepCount: number;
  enrolled: boolean;
  isPrimary: boolean;
  startedAt: string | null;
  completedAt: string | null;
  progressPercent: number;
  nextStep: { slug: string; title: string } | null;
};

export type RoadmapStepDetail = {
  slug: string;
  title: string;
  summary: string;
  estimatedMinutes: number;
  learnings: string[];
  practice: string;
  branchKey: string | null;
  resources: RoadmapResource[];
  status: RoadmapStepStatus;
};

export type RoadmapDetail = {
  slug: string;
  name: string;
  level: ExperienceLevel | string;
  summary: string;
  weeks: number;
  skillSlugs: string[];
  enrolled: boolean;
  isPrimary: boolean;
  startedAt: string | null;
  completedAt: string | null;
  progressPercent: number;
  nextStep: { slug: string; title: string } | null;
  steps: RoadmapStepDetail[];
};

export type ContinueLearning = {
  slug: string;
  name: string;
  summary: string;
  isPrimary?: boolean;
  progressPercent: number;
  nextStep: { slug: string; title: string } | null;
  completedAt: string | null;
};

export type EnrolledRoadmapSummary = {
  slug: string;
  name: string;
  isPrimary: boolean;
  progressPercent: number;
  completedAt: string | null;
  nextStep: { slug: string; title: string } | null;
};

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`));
  if (!match) return null;
  return decodeURIComponent(match.slice(name.length + 1));
}

function csrfHeaders(): HeadersInit {
  const csrf = readCookie("learn_csrf");
  return csrf ? { "x-csrf-token": csrf } : {};
}

async function parseError(res: Response): Promise<string> {
  const body = (await res.json().catch(() => null)) as {
    error?: { message?: string };
  } | null;
  return body?.error?.message ?? "Something went wrong";
}

export async function fetchRoadmaps(): Promise<RoadmapCatalogItem[]> {
  const res = await fetch("/api/roadmaps", {
    credentials: "include",
    cache: "no-store",
  });
  if (res.status === 401) throw new Error("UNAUTHENTICATED");
  if (!res.ok) throw new Error(await parseError(res));
  const body = (await res.json()) as { data: { roadmaps: RoadmapCatalogItem[] } };
  return body.data.roadmaps;
}

export async function fetchRoadmap(slug: string): Promise<RoadmapDetail> {
  const res = await fetch(`/api/roadmaps/${encodeURIComponent(slug)}`, {
    credentials: "include",
    cache: "no-store",
  });
  if (res.status === 401) throw new Error("UNAUTHENTICATED");
  if (res.status === 404) throw new Error("NOT_FOUND");
  if (!res.ok) throw new Error(await parseError(res));
  const body = (await res.json()) as { data: { roadmap: RoadmapDetail } };
  return body.data.roadmap;
}

export async function startRoadmap(
  slug: string,
  options?: { makePrimary?: boolean },
): Promise<RoadmapDetail> {
  const res = await fetch(`/api/roadmaps/${encodeURIComponent(slug)}/start`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...csrfHeaders(),
    },
    body: JSON.stringify({ makePrimary: options?.makePrimary ?? false }),
  });
  if (res.status === 401) throw new Error("UNAUTHENTICATED");
  if (!res.ok) throw new Error(await parseError(res));
  const body = (await res.json()) as { data: { roadmap: RoadmapDetail } };
  return body.data.roadmap;
}

export async function setPrimaryRoadmap(slug: string): Promise<RoadmapDetail> {
  const res = await fetch(`/api/roadmaps/${encodeURIComponent(slug)}/primary`, {
    method: "POST",
    credentials: "include",
    headers: csrfHeaders(),
  });
  if (res.status === 401) throw new Error("UNAUTHENTICATED");
  if (!res.ok) throw new Error(await parseError(res));
  const body = (await res.json()) as { data: { roadmap: RoadmapDetail } };
  return body.data.roadmap;
}

export async function updateRoadmapProgress(
  slug: string,
  stepSlug: string,
  status: StepProgressStatus | "incomplete",
): Promise<RoadmapDetail> {
  const res = await fetch(`/api/roadmaps/${encodeURIComponent(slug)}/progress`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...csrfHeaders(),
    },
    body: JSON.stringify({ stepSlug, status }),
  });
  if (res.status === 401) throw new Error("UNAUTHENTICATED");
  if (!res.ok) throw new Error(await parseError(res));
  const body = (await res.json()) as { data: { roadmap: RoadmapDetail } };
  return body.data.roadmap;
}

export async function toggleBookmark(
  slug: string,
  input: { stepSlug: string; url: string; remove?: boolean },
): Promise<RoadmapDetail> {
  const res = await fetch(`/api/roadmaps/${encodeURIComponent(slug)}/bookmarks`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...csrfHeaders(),
    },
    body: JSON.stringify(input),
  });
  if (res.status === 401) throw new Error("UNAUTHENTICATED");
  if (!res.ok) throw new Error(await parseError(res));
  const body = (await res.json()) as { data: { roadmap: RoadmapDetail } };
  return body.data.roadmap;
}

export async function fetchContinueLearning(): Promise<{
  continue: ContinueLearning | null;
  enrolled: EnrolledRoadmapSummary[];
}> {
  const res = await fetch("/api/roadmaps/continue", {
    credentials: "include",
    cache: "no-store",
  });
  if (res.status === 401) throw new Error("UNAUTHENTICATED");
  if (!res.ok) throw new Error(await parseError(res));
  const body = (await res.json()) as {
    data: {
      continue: ContinueLearning | null;
      enrolled: EnrolledRoadmapSummary[];
    };
  };
  return body.data;
}

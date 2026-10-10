import { cookies } from "next/headers";
import type {
  AssessmentAttemptDetail,
  AssessmentCatalogItem,
  AssessmentDetail,
  AssessmentMeta,
} from "@/lib/assessments";

const apiUrl = (process.env.API_URL ?? "http://localhost:4000").replace(/\/$/, "");

async function apiFetch(path: string) {
  const jar = await cookies();
  const cookieHeader = jar
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");

  return fetch(`${apiUrl}${path}`, {
    headers: cookieHeader ? { cookie: cookieHeader } : {},
    cache: "no-store",
  });
}

export async function loadAssessmentCatalog(): Promise<AssessmentCatalogItem[] | null> {
  try {
    const res = await apiFetch("/assessments");
    if (!res.ok) return null;
    const body = (await res.json()) as { data: { assessments: AssessmentCatalogItem[] } };
    return body.data.assessments;
  } catch {
    return null;
  }
}

export async function loadAssessmentDetail(id: string): Promise<AssessmentDetail | null> {
  try {
    const res = await apiFetch(`/assessments/${encodeURIComponent(id)}`);
    if (!res.ok) return null;
    const body = (await res.json()) as { data: { assessment: AssessmentDetail } };
    return body.data.assessment;
  } catch {
    return null;
  }
}

export async function loadAssessmentAttempt(
  id: string,
  attemptId: string,
): Promise<{ attempt: AssessmentAttemptDetail; assessment: AssessmentMeta } | null> {
  try {
    const res = await apiFetch(
      `/assessments/${encodeURIComponent(id)}/attempts/${encodeURIComponent(attemptId)}`,
    );
    if (!res.ok) return null;
    const body = (await res.json()) as {
      data: { attempt: AssessmentAttemptDetail; assessment: AssessmentMeta };
    };
    return body.data;
  } catch {
    return null;
  }
}

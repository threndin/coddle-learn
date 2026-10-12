import type {
  AssessmentAttemptDetail,
  AssessmentCatalogItem,
  AssessmentDetail,
  AssessmentMeta,
} from "@/lib/assessments";
import { serverApiFetch } from "@/lib/server-api";

export async function loadAssessmentCatalog(): Promise<AssessmentCatalogItem[] | null> {
  try {
    const res = await serverApiFetch("/assessments");
    if (!res.ok) return null;
    const body = (await res.json()) as { data: { assessments: AssessmentCatalogItem[] } };
    return body.data.assessments;
  } catch {
    return null;
  }
}

export async function loadAssessmentDetail(id: string): Promise<AssessmentDetail | null> {
  try {
    const res = await serverApiFetch(`/assessments/${encodeURIComponent(id)}`);
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
    const res = await serverApiFetch(
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

import type { SkillEvidence, SkillStatus } from "@coddle/shared";
import { apiRequest } from "@/lib/api-client";

export type SkillNode = {
  slug: string;
  name: string;
  category: string;
  status: SkillStatus;
  evidence: SkillEvidence;
};

export type SkillEdge = {
  from: string;
  to: string;
  kind: string;
};

export type SkillGraph = {
  demonstratedCount: number;
  learningCount: number;
  interestedCount: number;
  lockedCount: number;
  totalCount: number;
  nodes: SkillNode[];
  edges: SkillEdge[];
};

export type SkillDetail = {
  skill: SkillNode;
  prerequisites: SkillNode[];
  leadsTo: SkillNode[];
};

export function fetchSkillGraph() {
  return apiRequest<SkillGraph>("/skills");
}

export function fetchSkill(slug: string) {
  return apiRequest<SkillDetail>(`/skills/${encodeURIComponent(slug)}`);
}

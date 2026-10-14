/**
 * Skill graph: directed relationships and evidence-based proficiency.
 * Onboarding `UserSkill` rows are interests only — a finished course alone
 * does not demonstrate a skill.
 */

export const SKILL_STATUSES = [
  "locked",
  "interested",
  "learning",
  "demonstrated",
  "credentialed",
] as const;

export type SkillStatus = (typeof SKILL_STATUSES)[number];

export const SKILL_STATUS_RANK: Record<SkillStatus, number> = {
  locked: 0,
  interested: 1,
  learning: 2,
  demonstrated: 3,
  credentialed: 4,
};

export const SKILL_STATUS_LABELS: Record<SkillStatus, string> = {
  locked: "Not started",
  interested: "Interested",
  learning: "Learning",
  demonstrated: "Demonstrated",
  credentialed: "Credentialed",
};

export function isSkillStatus(value: unknown): value is SkillStatus {
  return typeof value === "string" && (SKILL_STATUSES as readonly string[]).includes(value);
}

export function maxSkillStatus(a: SkillStatus, b: SkillStatus): SkillStatus {
  return SKILL_STATUS_RANK[a] >= SKILL_STATUS_RANK[b] ? a : b;
}

/** Directed edge: mastering `from` leads toward `to`. */
export type SkillEdgeSeed = {
  from: string;
  to: string;
  kind?: "leads_to" | "prerequisite";
};

/**
 * Canonical skill relationships for the catalog.
 * Example path: javascript → typescript → react → nextjs.
 */
export const SKILL_EDGES: readonly SkillEdgeSeed[] = [
  { from: "html", to: "css" },
  { from: "css", to: "javascript" },
  { from: "html", to: "accessibility" },
  { from: "css", to: "accessibility" },
  { from: "javascript", to: "typescript" },
  { from: "javascript", to: "react" },
  { from: "typescript", to: "react" },
  { from: "react", to: "nextjs" },
  { from: "react", to: "accessibility" },
  { from: "javascript", to: "node" },
  { from: "typescript", to: "node" },
  { from: "node", to: "express" },
  { from: "node", to: "apis" },
  { from: "express", to: "apis" },
  { from: "apis", to: "auth" },
  { from: "node", to: "auth" },
  { from: "sql", to: "postgres" },
  { from: "apis", to: "sql" },
  { from: "python", to: "sql" },
  { from: "linux", to: "git" },
  { from: "git", to: "docker" },
  { from: "linux", to: "docker" },
  { from: "docker", to: "cloud" },
  { from: "apis", to: "testing" },
  { from: "node", to: "testing" },
  { from: "react", to: "testing" },
  { from: "apis", to: "system-design" },
  { from: "cloud", to: "system-design" },
  { from: "postgres", to: "system-design" },
  { from: "javascript", to: "go" },
  { from: "javascript", to: "java" },
  { from: "javascript", to: "rust" },
] as const;

export type SkillEvidence = {
  interested: boolean;
  coursesLearning: number;
  roadmapsLearning: number;
  projectsStarted: number;
  assessmentsPassed: number;
  projectsSubmitted: number;
  credentialsIssued: number;
};

export function emptySkillEvidence(): SkillEvidence {
  return {
    interested: false,
    coursesLearning: 0,
    roadmapsLearning: 0,
    projectsStarted: 0,
    assessmentsPassed: 0,
    projectsSubmitted: 0,
    credentialsIssued: 0,
  };
}

/** Derive status from evidence. Course completion alone never unlocks demonstrated. */
export function skillStatusFromEvidence(evidence: SkillEvidence): SkillStatus {
  if (evidence.credentialsIssued > 0) return "credentialed";
  if (evidence.assessmentsPassed > 0 || evidence.projectsSubmitted > 0) {
    return "demonstrated";
  }
  if (
    evidence.coursesLearning > 0 ||
    evidence.roadmapsLearning > 0 ||
    evidence.projectsStarted > 0
  ) {
    return "learning";
  }
  if (evidence.interested) return "interested";
  return "locked";
}

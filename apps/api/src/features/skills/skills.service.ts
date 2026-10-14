import {
  emptySkillEvidence,
  skillStatusFromEvidence,
  type SkillEvidence,
  type SkillStatus,
} from "@coddle/shared";
import { AppError } from "../../shared/errors.js";
import {
  deleteStaleSkillProgress,
  findSkillBySlug,
  listCourseSkillActivity,
  listCredentialSkillIds,
  listPassedAssessmentSkillIds,
  listProjectSkillActivity,
  listRoadmapSkillActivity,
  listSkillEdges,
  listSkills,
  listUserIds,
  listUserInterestSkillIds,
  upsertSkillProgress,
} from "./skills.repository.js";

export type SkillNodePayload = {
  slug: string;
  name: string;
  category: string;
  status: SkillStatus;
  evidence: SkillEvidence;
};

export type SkillEdgePayload = {
  from: string;
  to: string;
  kind: string;
};

export type SkillGraphPayload = {
  demonstratedCount: number;
  learningCount: number;
  interestedCount: number;
  lockedCount: number;
  totalCount: number;
  nodes: SkillNodePayload[];
  edges: SkillEdgePayload[];
};

async function collectEvidenceBySkillId(userId: string) {
  const skills = await listSkills();
  const skillIdBySlug = new Map(skills.map((skill) => [skill.slug, skill.id]));
  const evidenceBySkillId = new Map<string, SkillEvidence>();

  for (const skill of skills) {
    evidenceBySkillId.set(skill.id, emptySkillEvidence());
  }

  const ensure = (skillId: string) => {
    let evidence = evidenceBySkillId.get(skillId);
    if (!evidence) {
      evidence = emptySkillEvidence();
      evidenceBySkillId.set(skillId, evidence);
    }
    return evidence;
  };

  const [
    interestIds,
    courseActivity,
    roadmapActivity,
    projectActivity,
    passedSkillIds,
    credentialSkillIds,
  ] = await Promise.all([
    listUserInterestSkillIds(userId),
    listCourseSkillActivity(userId),
    listRoadmapSkillActivity(userId),
    listProjectSkillActivity(userId),
    listPassedAssessmentSkillIds(userId),
    listCredentialSkillIds(userId),
  ]);

  for (const skillId of interestIds) {
    ensure(skillId).interested = true;
  }

  for (const row of courseActivity) {
    for (const link of row.course.skills) {
      // Enrollment counts as learning. Course completion alone does not demonstrate.
      ensure(link.skillId).coursesLearning += 1;
    }
  }

  for (const row of roadmapActivity) {
    if (row.completedAt) continue;
    for (const slug of row.roadmap.skillSlugs) {
      const skillId = skillIdBySlug.get(slug);
      if (skillId) ensure(skillId).roadmapsLearning += 1;
    }
  }

  for (const row of projectActivity) {
    const submitted = row.status === "submitted" && Boolean(row.submittedAt);
    for (const link of row.project.skills) {
      const evidence = ensure(link.skillId);
      if (submitted) evidence.projectsSubmitted += 1;
      else evidence.projectsStarted += 1;
    }
  }

  for (const skillId of passedSkillIds) {
    ensure(skillId).assessmentsPassed += 1;
  }

  for (const skillId of credentialSkillIds) {
    ensure(skillId).credentialsIssued += 1;
  }

  return { skills, evidenceBySkillId };
}

export async function evaluateSkillGraphForUser(userId: string) {
  const { skills, evidenceBySkillId } = await collectEvidenceBySkillId(userId);
  const keepIds: string[] = [];

  for (const skill of skills) {
    const evidence = evidenceBySkillId.get(skill.id) ?? emptySkillEvidence();
    const status = skillStatusFromEvidence(evidence);
    if (status === "locked") continue;
    keepIds.push(skill.id);
    await upsertSkillProgress(userId, skill.id, status, evidence);
  }

  await deleteStaleSkillProgress(userId, keepIds);
  return keepIds.length;
}

export function scheduleSkillGraphEvaluation(userId: string) {
  void evaluateSkillGraphForUser(userId).catch((error) => {
    console.error("[skills] evaluate failed", { userId, error });
  });
}

export async function backfillSkillGraphForAllUsers() {
  const userIds = await listUserIds();
  let updated = 0;
  for (const userId of userIds) {
    updated += await evaluateSkillGraphForUser(userId);
  }
  return { users: userIds.length, progressRows: updated };
}

async function buildGraph(userId: string): Promise<SkillGraphPayload> {
  const [{ skills, evidenceBySkillId }, edgeRows] = await Promise.all([
    collectEvidenceBySkillId(userId),
    listSkillEdges(),
  ]);

  const nodes: SkillNodePayload[] = skills.map((skill) => {
    const evidence = evidenceBySkillId.get(skill.id) ?? emptySkillEvidence();
    return {
      slug: skill.slug,
      name: skill.name,
      category: skill.category,
      status: skillStatusFromEvidence(evidence),
      evidence,
    };
  });

  const edges: SkillEdgePayload[] = edgeRows.map((edge) => ({
    from: edge.fromSkill.slug,
    to: edge.toSkill.slug,
    kind: edge.kind,
  }));

  return {
    demonstratedCount: nodes.filter(
      (node) => node.status === "demonstrated" || node.status === "credentialed",
    ).length,
    learningCount: nodes.filter((node) => node.status === "learning").length,
    interestedCount: nodes.filter((node) => node.status === "interested").length,
    lockedCount: nodes.filter((node) => node.status === "locked").length,
    totalCount: nodes.length,
    nodes,
    edges,
  };
}

export async function getMySkillGraph(userId: string) {
  // Persist progress in the background; response is always computed live.
  scheduleSkillGraphEvaluation(userId);
  return buildGraph(userId);
}

export async function getMySkillNode(userId: string, slug: string) {
  const skill = await findSkillBySlug(slug);
  if (!skill) {
    throw new AppError(404, "skill_missing", "That skill could not be found.");
  }

  const graph = await buildGraph(userId);
  const node = graph.nodes.find((item) => item.slug === slug);
  if (!node) {
    throw new AppError(404, "skill_missing", "That skill could not be found.");
  }

  const prerequisites = graph.edges
    .filter((edge) => edge.to === slug)
    .map((edge) => edge.from);
  const leadsTo = graph.edges
    .filter((edge) => edge.from === slug)
    .map((edge) => edge.to);

  const bySlug = new Map(graph.nodes.map((item) => [item.slug, item]));

  return {
    skill: node,
    prerequisites: prerequisites
      .map((item) => bySlug.get(item))
      .filter((item): item is SkillNodePayload => Boolean(item)),
    leadsTo: leadsTo
      .map((item) => bySlug.get(item))
      .filter((item): item is SkillNodePayload => Boolean(item)),
  };
}

import {
  USER_ROLE_LABELS,
  achievementBySlug,
  isUserRole,
  profilePath,
  SETTINGS_PROFILE_HREF,
  type AchievementSlug,
  type UserRole,
} from "@coddle/shared";
import { actorName, firstName, notify } from "./notifications.service.js";

type Person = {
  id: string;
  username?: string | null;
  name?: string | null;
};

function utcDayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export async function notifyWelcome(userId: string, name: string) {
  await notify({
    userId,
    type: "welcome",
    dedupeKey: "welcome",
    title: `Welcome to Coddle Learn, ${firstName(name)}`,
    body: "Finish setup to pick a roadmap, set a daily goal, and start learning.",
    href: "/onboarding",
    refType: "user",
    refId: userId,
  });
}

export async function notifyLogin(userId: string) {
  const day = utcDayKey();
  await notify({
    userId,
    type: "login",
    dedupeKey: `login:${day}`,
    title: "You signed in",
    body: "Welcome back. Pick up where you left off from the dashboard.",
    href: "/dashboard",
    refType: "user",
    refId: userId,
  });
}

export async function notifyProfileUpdated(userId: string, username: string | null) {
  await notify({
    userId,
    type: "profile_updated",
    dedupeKey: `profile_updated:${utcDayKey()}`,
    title: "You updated your profile",
    body: "Your public profile now shows the latest bio, skills, and visibility settings.",
    href: username ? profilePath(username) : SETTINGS_PROFILE_HREF,
    refType: "user",
    refId: userId,
  });
}

export async function notifyRoleGranted(userId: string, role: string) {
  if (!isUserRole(role) || (role !== "reviewer" && role !== "admin")) return;
  const label = USER_ROLE_LABELS[role as UserRole];
  await notify({
    userId,
    type: "role_granted",
    dedupeKey: `role:${role}`,
    title: `${label} access granted`,
    body:
      role === "admin"
        ? "You can review content and manage Coddle Learn."
        : "You can review courses, projects, resources, and tools submitted by the community.",
    href: "/reviewers",
    refType: "role",
    refId: role,
  });
}

export async function notifyOnboardingComplete(userId: string, roadmapSlug: string | null) {
  await notify({
    userId,
    type: "onboarding_complete",
    dedupeKey: "onboarding",
    title: "You're set. Time to learn.",
    body: roadmapSlug
      ? "Your profile is ready. Continue on your starting roadmap."
      : "Your profile is ready. Pick a roadmap and start the first step.",
    href: roadmapSlug ? `/roadmaps/${roadmapSlug}` : "/dashboard",
    refType: "user",
    refId: userId,
  });
}

export async function notifyFollow(recipientId: string, actor: Person) {
  await notify({
    userId: recipientId,
    type: "follow",
    actorId: actor.id,
    dedupeKey: `follow:${actor.id}`,
    title: `${actorName(actor)} followed you`,
    body: "They will see your public learning activity from now on.",
    href: actor.username ? profilePath(actor.username) : "/community",
    refType: "user",
    refId: actor.id,
  });
}

export async function notifyCommunityPostCreated(input: {
  userId: string;
  postSlug: string;
  postTitle: string;
  postId: string;
}) {
  await notify({
    userId: input.userId,
    type: "community_post",
    dedupeKey: `community_post:${input.postId}`,
    title: "You published a post",
    body: input.postTitle,
    href: `/community/${encodeURIComponent(input.postSlug)}`,
    refType: "community_post",
    refId: input.postId,
  });
}

export async function notifyResourceSaved(input: {
  userId: string;
  resourceId: string;
  title: string;
}) {
  await notify({
    userId: input.userId,
    type: "resource_saved",
    dedupeKey: `resource_saved:${input.resourceId}`,
    title: "You saved a resource",
    body: input.title,
    href: "/resources",
    refType: "resource",
    refId: input.resourceId,
  });
}

export async function notifyToolSaved(input: {
  userId: string;
  toolId: string;
  toolSlug: string;
  title: string;
}) {
  await notify({
    userId: input.userId,
    type: "tool_saved",
    dedupeKey: `tool_saved:${input.toolId}`,
    title: "You saved a tool",
    body: input.title,
    href: `/tools/${encodeURIComponent(input.toolSlug)}`,
    refType: "tool",
    refId: input.toolId,
  });
}

export async function notifyCourseStarted(input: {
  userId: string;
  courseId: string;
  courseSlug: string;
  courseTitle: string;
}) {
  await notify({
    userId: input.userId,
    type: "course_started",
    dedupeKey: `course_started:${input.courseId}`,
    title: `You started ${input.courseTitle}`,
    body: "Your progress is saved. Continue from the first lesson when you're ready.",
    href: `/courses/${encodeURIComponent(input.courseSlug)}`,
    refType: "course",
    refId: input.courseId,
  });
}

export async function notifyCommunityComment(input: {
  recipientId: string;
  actor: Person;
  postSlug: string;
  postTitle: string;
}) {
  await notify({
    userId: input.recipientId,
    type: "community_comment",
    actorId: input.actor.id,
    title: `${actorName(input.actor)} commented on your post`,
    body: input.postTitle,
    href: `/community/${encodeURIComponent(input.postSlug)}`,
    refType: "community_post",
    refId: input.postSlug,
  });
}

export async function notifyCommunityReply(input: {
  recipientId: string;
  actor: Person;
  postSlug: string;
  postTitle: string;
}) {
  await notify({
    userId: input.recipientId,
    type: "community_reply",
    actorId: input.actor.id,
    title: `${actorName(input.actor)} replied to your comment`,
    body: input.postTitle,
    href: `/community/${encodeURIComponent(input.postSlug)}`,
    refType: "community_post",
    refId: input.postSlug,
  });
}

export async function notifyCommunityReaction(input: {
  recipientId: string;
  actor: Person;
  postSlug: string;
  postTitle: string;
  target: "post" | "comment";
  targetId: string;
}) {
  await notify({
    userId: input.recipientId,
    type: "community_reaction",
    actorId: input.actor.id,
    dedupeKey: `reaction:${input.target}:${input.targetId}:${input.actor.id}`,
    title:
      input.target === "comment"
        ? `${actorName(input.actor)} reacted to your comment`
        : `${actorName(input.actor)} reacted to your post`,
    body: input.postTitle,
    href: `/community/${encodeURIComponent(input.postSlug)}`,
    refType: input.target === "comment" ? "community_comment" : "community_post",
    refId: input.targetId,
  });
}

export async function notifyCommunityQuote(input: {
  recipientId: string;
  actor: Person;
  postSlug: string;
  postTitle: string;
}) {
  await notify({
    userId: input.recipientId,
    type: "community_quote",
    actorId: input.actor.id,
    title: `${actorName(input.actor)} quoted your post`,
    body: input.postTitle,
    href: `/community/${encodeURIComponent(input.postSlug)}`,
    refType: "community_post",
    refId: input.postSlug,
  });
}

export async function notifyMentorApplication(input: {
  mentorUserId: string;
  mentee: Person;
  applicationId: string;
  programTitle: string;
}) {
  await notify({
    userId: input.mentorUserId,
    type: "mentor_application",
    actorId: input.mentee.id,
    dedupeKey: `mentor_app:${input.applicationId}`,
    title: `${actorName(input.mentee)} applied to your program`,
    body: input.programTitle,
    href: "/mentors/me",
    refType: "mentorship_application",
    refId: input.applicationId,
  });
}

export async function notifyMentorApplicationUpdate(input: {
  menteeId: string;
  mentor: Person;
  applicationId: string;
  programTitle: string;
  status: "approved" | "declined" | "completed";
}) {
  const copy =
    input.status === "approved"
      ? {
          title: `${actorName(input.mentor)} accepted your application`,
          body: `You're in ${input.programTitle}.`,
        }
      : input.status === "declined"
        ? {
            title: `${actorName(input.mentor)} declined your application`,
            body: input.programTitle,
          }
        : {
            title: `${input.programTitle} is complete`,
            body: `${actorName(input.mentor)} marked this mentorship as finished.`,
          };

  await notify({
    userId: input.menteeId,
    type: "mentor_application_update",
    actorId: input.mentor.id,
    dedupeKey: `mentor_app_status:${input.applicationId}:${input.status}`,
    title: copy.title,
    body: copy.body,
    href: "/mentors/me",
    refType: "mentorship_application",
    refId: input.applicationId,
  });
}

export async function notifyReviewDecision(input: {
  recipientId: string;
  reviewerId: string;
  kind: "course" | "project" | "resource" | "tool";
  action: "approve" | "decline" | "flag";
  title: string;
  href: string;
  itemId: string;
  note?: string | null;
}) {
  const kindLabel =
    input.kind === "course"
      ? "course"
      : input.kind === "project"
        ? "project"
        : input.kind === "resource"
          ? "resource"
          : "tool";
  const copy =
    input.action === "approve"
      ? {
          title: `Your ${kindLabel} was published`,
          body: input.title,
        }
      : input.action === "decline"
        ? {
            title: `Changes requested on your ${kindLabel}`,
            body: input.note?.trim() || input.title,
          }
        : {
            title: `Your ${kindLabel} was flagged`,
            body: input.note?.trim() || input.title,
          };

  await notify({
    userId: input.recipientId,
    type: "review_decision",
    actorId: input.reviewerId,
    dedupeKey: `review:${input.kind}:${input.itemId}:${input.action}`,
    title: copy.title,
    body: copy.body,
    href: input.href,
    refType: input.kind,
    refId: input.itemId,
  });
}

export async function notifyAchievement(userId: string, slug: AchievementSlug) {
  const definition = achievementBySlug(slug);
  if (!definition) return;
  await notify({
    userId,
    type: "achievement",
    dedupeKey: `achievement:${slug}`,
    title: `Achievement unlocked: ${definition.title}`,
    body: definition.summary,
    href: `/achievements/${encodeURIComponent(slug)}`,
    refType: "achievement",
    refId: slug,
  });
}

export async function notifyCourseComplete(userId: string, course: { id: string; slug: string; title: string }) {
  await notify({
    userId,
    type: "course_complete",
    dedupeKey: `course_complete:${course.id}`,
    title: `You completed ${course.title}`,
    body: "Nice work. Share it, take the next course, or keep going on your roadmap.",
    href: `/courses/${encodeURIComponent(course.slug)}`,
    refType: "course",
    refId: course.id,
  });
}

export async function notifyCourseReview(input: {
  recipientId: string;
  actor: Person;
  courseSlug: string;
  courseTitle: string;
  rating: number;
}) {
  await notify({
    userId: input.recipientId,
    type: "course_review",
    actorId: input.actor.id,
    dedupeKey: `course_review:${input.courseSlug}:${input.actor.id}`,
    title: `${actorName(input.actor)} reviewed ${input.courseTitle}`,
    body: `${input.rating} star${input.rating === 1 ? "" : "s"}`,
    href: `/courses/${encodeURIComponent(input.courseSlug)}`,
    refType: "course",
    refId: input.courseSlug,
  });
}

export async function notifyRoadmapComplete(
  userId: string,
  roadmap: { id: string; slug: string; name: string },
) {
  await notify({
    userId,
    type: "roadmap_complete",
    dedupeKey: `roadmap_complete:${roadmap.id}`,
    title: `You finished ${roadmap.name}`,
    body: "Every step on this path is done. Pick a project or start another roadmap.",
    href: `/roadmaps/${encodeURIComponent(roadmap.slug)}`,
    refType: "roadmap",
    refId: roadmap.id,
  });
}

export async function notifyAssessmentPassed(input: {
  userId: string;
  assessmentId: string;
  assessmentTitle: string;
  courseTitle: string;
  credentialId?: string | null;
}) {
  await notify({
    userId: input.userId,
    type: "assessment_passed",
    dedupeKey: `assessment_passed:${input.assessmentId}`,
    title: `You passed ${input.assessmentTitle}`,
    body: input.credentialId
      ? `A credential for ${input.courseTitle} is ready to share.`
      : `You cleared the final for ${input.courseTitle}.`,
    href: input.credentialId
      ? `/credentials/${encodeURIComponent(input.credentialId)}`
      : `/assessments/${encodeURIComponent(input.assessmentId)}`,
    refType: "assessment",
    refId: input.assessmentId,
  });
}

export async function notifyProjectSubmitted(input: {
  userId: string;
  projectId: string;
  projectSlug: string;
  projectTitle: string;
  credentialId?: string | null;
}) {
  await notify({
    userId: input.userId,
    type: "project_submitted",
    dedupeKey: `project_submitted:${input.projectId}`,
    title: `You submitted ${input.projectTitle}`,
    body: input.credentialId
      ? "A project credential is ready to share."
      : "Your solution is on the record.",
    href: input.credentialId
      ? `/credentials/${encodeURIComponent(input.credentialId)}`
      : `/projects/${encodeURIComponent(input.projectSlug)}`,
    refType: "project",
    refId: input.projectId,
  });
}

export async function notifyChallengeSolved(input: {
  userId: string;
  challengeId: string;
  challengeSlug: string;
  challengeTitle: string;
  rank: number | null;
  pointsAwarded: number;
}) {
  const rankBit =
    input.rank != null ? ` You placed #${input.rank}.` : "";
  await notify({
    userId: input.userId,
    type: "challenge_solved",
    dedupeKey: `challenge_solved:${input.challengeId}`,
    title: `You solved ${input.challengeTitle}`,
    body: `+${input.pointsAwarded} pts.${rankBit}`,
    href: `/challenges/${encodeURIComponent(input.challengeSlug)}`,
    refType: "challenge",
    refId: input.challengeId,
  });
}

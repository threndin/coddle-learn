import { slugify, uniqueSlug } from "./course-studio.js";

export const MENTOR_TOPICS = [
  "career",
  "code_review",
  "project_feedback",
  "technical",
  "learning",
] as const;
export type MentorTopic = (typeof MENTOR_TOPICS)[number];

export const MENTOR_TOPIC_LABELS: Record<MentorTopic, string> = {
  career: "Career guidance",
  code_review: "Code review",
  project_feedback: "Project feedback",
  technical: "Technical guidance",
  learning: "Learning advice",
};

export const MENTOR_TOPIC_BLURBS: Record<MentorTopic, string> = {
  career: "Interviews, leveling up, and choosing what to learn next.",
  code_review: "Thoughtful review of pull requests and learner projects.",
  project_feedback: "Direction on what to build and how to ship it.",
  technical: "Architecture, debugging, and going deeper in a stack.",
  learning: "Study plans, practice habits, and getting unstuck.",
};

export function isMentorTopic(value: unknown): value is MentorTopic {
  return typeof value === "string" && (MENTOR_TOPICS as readonly string[]).includes(value);
}

export const MENTOR_AVAILABILITIES = ["open", "limited", "waitlist", "paused"] as const;
export type MentorAvailability = (typeof MENTOR_AVAILABILITIES)[number];

export const MENTOR_AVAILABILITY_LABELS: Record<MentorAvailability, string> = {
  open: "Accepting mentees",
  limited: "Limited spots",
  waitlist: "Waitlist",
  paused: "Not accepting",
};

export function isMentorAvailability(value: unknown): value is MentorAvailability {
  return (
    typeof value === "string" && (MENTOR_AVAILABILITIES as readonly string[]).includes(value)
  );
}

export function mentorAcceptsApplications(availability: string): boolean {
  return availability === "open" || availability === "limited" || availability === "waitlist";
}

export const MENTOR_PROGRAM_STATUSES = ["open", "closed", "archived"] as const;
export type MentorProgramStatus = (typeof MENTOR_PROGRAM_STATUSES)[number];

export const MENTOR_PROGRAM_STATUS_LABELS: Record<MentorProgramStatus, string> = {
  open: "Open",
  closed: "Closed",
  archived: "Archived",
};

export function isMentorProgramStatus(value: unknown): value is MentorProgramStatus {
  return (
    typeof value === "string" && (MENTOR_PROGRAM_STATUSES as readonly string[]).includes(value)
  );
}

export const MENTORSHIP_APPLICATION_STATUSES = [
  "pending",
  "approved",
  "declined",
  "withdrawn",
  "completed",
] as const;
export type MentorshipApplicationStatus = (typeof MENTORSHIP_APPLICATION_STATUSES)[number];

export const MENTORSHIP_APPLICATION_STATUS_LABELS: Record<
  MentorshipApplicationStatus,
  string
> = {
  pending: "Pending",
  approved: "Approved",
  declined: "Declined",
  withdrawn: "Withdrawn",
  completed: "Completed",
};

export function isMentorshipApplicationStatus(
  value: unknown,
): value is MentorshipApplicationStatus {
  return (
    typeof value === "string" &&
    (MENTORSHIP_APPLICATION_STATUSES as readonly string[]).includes(value)
  );
}

export const MENTOR_SCOPES = ["all", "applied", "mentoring"] as const;
export type MentorScope = (typeof MENTOR_SCOPES)[number];

export const MENTOR_SORTS = ["available", "newest", "name"] as const;
export type MentorSort = (typeof MENTOR_SORTS)[number];

export const MENTOR_LIMITS = {
  headlineMin: 8,
  headlineMax: 80,
  aboutMin: 40,
  aboutMax: 2000,
  timezoneMax: 64,
  experienceYearsMax: 50,
  skillMax: 8,
  topicMin: 1,
  topicMax: 5,
  programTitleMin: 6,
  programTitleMax: 80,
  programSummaryMin: 24,
  programSummaryMax: 280,
  programDescriptionMax: 4000,
  capacityMax: 50,
  durationWeeksMax: 52,
  applicationMessageMin: 40,
  applicationMessageMax: 1500,
  applicationGoalsMax: 500,
  mentorNoteMax: 500,
  queryMax: 100,
  pageSize: 24,
  dailyApplications: 8,
  openProgramsMax: 6,
} as const;

const RESERVED_PROGRAM_SLUGS = new Set(["apply", "new", "me"]);

export function programSlugFromTitle(title: string, taken: Iterable<string>): string {
  const base = slugify(title, "program");
  const safe = RESERVED_PROGRAM_SLUGS.has(base) ? `${base}-program` : base;
  return uniqueSlug(safe, taken);
}

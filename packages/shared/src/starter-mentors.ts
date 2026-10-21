import type { MentorAvailability, MentorTopic } from "./mentors.js";

export type StarterMentorProgram = {
  slug: string;
  title: string;
  summary: string;
  description: string;
  kind: MentorTopic;
  capacity: number | null;
  durationWeeks: number | null;
};

export type StarterMentor = {
  headline: string;
  about: string;
  experienceYears: number;
  availability: MentorAvailability;
  timezone: string;
  topics: MentorTopic[];
  skillSlugs: string[];
  programs: StarterMentorProgram[];
};

/** Attached to the Learn user matching `SEED_MENTOR_EMAIL`. */
export const STARTER_MENTOR: StarterMentor = {
  headline: "Helping developers learn, ship, and grow with clear next steps",
  about:
    "I mentor people who are past tutorials and want honest feedback on what to build, how to review their work, and how to keep a practice that lasts. Apply to a program and I will decide who I can take on.",
  experienceYears: 8,
  availability: "open",
  timezone: "Africa/Lagos",
  topics: ["career", "code_review", "learning", "project_feedback"],
  skillSlugs: ["javascript", "typescript", "react", "nextjs", "node"],
  programs: [
    {
      slug: "open-mentorship",
      title: "Open mentorship",
      summary: "Apply with what you are working on. I review every request before anyone joins.",
      description:
        "Tell me what you are building and what you want from mentorship. I keep this small so the work stays useful — career questions, code review, or a project crit.",
      kind: "learning",
      capacity: 6,
      durationWeeks: 8,
    },
    {
      slug: "code-review",
      title: "Code review",
      summary: "Thoughtful review of pull requests and learner projects.",
      description:
        "Send a repo or PR. I leave comments on structure and the highest-leverage fixes, then we talk through the why.",
      kind: "code_review",
      capacity: 4,
      durationWeeks: 4,
    },
  ],
};

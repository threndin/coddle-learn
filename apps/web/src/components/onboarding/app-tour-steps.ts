export type TourPlacement = "auto" | "right" | "left" | "bottom" | "top";

export type AppTourStep = {
  id: string;
  target: string;
  title: string;
  body: string;
  /** Navigate here first if the target is not on the current page. */
  href?: string;
  /** Expand / open the sidebar so the target can be seen. */
  revealSidebar?: boolean;
  placement?: TourPlacement;
};

function navStep(
  href: string,
  title: string,
  body: string,
  id = href.replace(/^\//, "") || "dashboard",
): AppTourStep {
  return {
    id,
    target: `[data-tour='nav:${href}']`,
    href,
    title,
    body,
    revealSidebar: true,
    placement: "right",
  };
}

export const APP_TOUR_STEPS: AppTourStep[] = [
  navStep(
    "/dashboard",
    "Dashboard",
    "Your learning home. Continue a roadmap or course, track progress, your daily goal, and the points you have earned.",
  ),
  navStep(
    "/search",
    "Search",
    "Find courses, roadmaps, people, and tools in one place when you know what you are looking for.",
  ),
  navStep(
    "/assistant",
    "AI Assistant",
    "Ask what to learn next. The assistant points you to the right roadmap, course, or resource.",
  ),
  navStep(
    "/roadmaps",
    "Roadmaps",
    "Structured paths, step by step. Start a path and always know what to learn next.",
  ),
  navStep(
    "/courses",
    "Courses",
    "Contributor-made courses with modules and lessons — text, resources, quizzes, and practice.",
  ),
  navStep(
    "/resources",
    "Resources",
    "Curated docs, videos, and articles from around the web. Bookmark the ones you will reuse.",
  ),
  navStep(
    "/tools",
    "Tools",
    "Products developers actually use — editors, hosts, and utilities tied to what you are learning.",
  ),
  navStep(
    "/projects",
    "Projects",
    "Guided builds you can showcase. Start a brief, ship a repo or live URL, and share the work.",
  ),
  navStep(
    "/assessments",
    "Assessments",
    "Prove what you know with quizzes and challenges. Passing can unlock a credential.",
  ),
  navStep(
    "/challenges",
    "Challenges",
    "Compete, practice under a clock, and earn points as you solve problems.",
  ),
  navStep(
    "/credentials",
    "Credentials",
    "Free, verifiable certificates tied to real work. Share a public verification link.",
  ),
  navStep(
    "/community",
    "Community",
    "Ask questions, share progress, and learn with other developers.",
  ),
  navStep(
    "/achievements",
    "Achievements",
    "Smaller milestones — streaks, firsts, and contributions. See what you have earned and what is still locked.",
  ),
  navStep(
    "/notifications",
    "Notifications",
    "Replies, mentor updates, course news, and achievements land here.",
  ),
  navStep(
    "/studio",
    "Studio",
    "Create and manage your own courses and projects. Contributors publish from here.",
  ),
  navStep(
    "/settings",
    "Settings",
    "Update your profile, practice goal, notification preferences, and account.",
  ),
  {
    id: "profile",
    target: "[data-tour='nav:profile']",
    title: "Your profile",
    body: "Your public learning profile — progress, projects, credentials, and what you share with others.",
    revealSidebar: true,
    placement: "right",
  },
  {
    id: "mentors",
    target: "[data-tour='page:mentors']",
    href: "/mentors",
    title: "Mentors",
    body: "Apply to a mentorship program. Mentors approve who they work with for reviews and guidance.",
    placement: "bottom",
  },
  {
    id: "skills",
    target: "[data-tour='page:skills']",
    href: "/skills",
    title: "Skills",
    body: "Your skill graph updates from assessments, projects, and credentials — not just finishing a course.",
    placement: "bottom",
  },
  {
    id: "leaderboard",
    target: "[data-tour='page:leaderboard']",
    href: "/leaderboard",
    title: "Leaderboard",
    body: "Climb as you earn points from learning, building, and contributing.",
    placement: "bottom",
  },
];

export const APP_TOUR_VERSION = 2;

export function tourStorageKey(userId: string) {
  return `learn_app_tour_${userId}`;
}

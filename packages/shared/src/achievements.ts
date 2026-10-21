export const ACHIEVEMENT_SLUGS = [
  "first-course",
  "first-project",
  "streak-7",
  "open-source-contributor",
  "roadmap-completed",
  "mentor",
  "resource-reviewer",
  "course-creator",
] as const;

export type AchievementSlug = (typeof ACHIEVEMENT_SLUGS)[number];

export const ACHIEVEMENT_CATEGORIES = [
  "learning",
  "building",
  "contribution",
  "community",
] as const;

export type AchievementCategory = (typeof ACHIEVEMENT_CATEGORIES)[number];

export type AchievementDefinition = {
  slug: AchievementSlug;
  title: string;
  summary: string;
  howToEarn: string;
  category: AchievementCategory;
  /** Icon key rendered by the web app. */
  icon: string;
  sortOrder: number;
};

export const ACHIEVEMENT_DEFINITIONS: readonly AchievementDefinition[] = [
  {
    slug: "first-course",
    title: "First course",
    summary: "Finished your first course end to end.",
    howToEarn: "Complete every lesson, exercise, and final assessment on a published course.",
    category: "learning",
    icon: "book",
    sortOrder: 10,
  },
  {
    slug: "first-project",
    title: "First project",
    summary: "Submitted your first project solution.",
    howToEarn: "Start a project brief and submit a repository or live URL.",
    category: "building",
    icon: "layers",
    sortOrder: 20,
  },
  {
    slug: "streak-7",
    title: "7-day streak",
    summary: "Practiced on seven days in a row.",
    howToEarn: "Complete lessons, roadmap steps, exercises, or assessments on seven consecutive days.",
    category: "learning",
    icon: "sparkle",
    sortOrder: 30,
  },
  {
    slug: "open-source-contributor",
    title: "Open-source contributor",
    summary: "Shared learning content with the community.",
    howToEarn: "Publish a course or project in Studio, or submit a resource that gets published.",
    category: "contribution",
    icon: "code",
    sortOrder: 40,
  },
  {
    slug: "roadmap-completed",
    title: "Roadmap completed",
    summary: "Finished every step on a learning path.",
    howToEarn: "Complete or skip every step on an enrolled roadmap.",
    category: "learning",
    icon: "target",
    sortOrder: 50,
  },
  {
    slug: "mentor",
    title: "Mentor",
    summary: "Helped another learner through mentorship.",
    howToEarn: "Approve a learner and complete a mentorship program with them.",
    category: "community",
    icon: "users",
    sortOrder: 60,
  },
  {
    slug: "resource-reviewer",
    title: "Resource reviewer",
    summary: "Reviewed community learning content.",
    howToEarn: "Review a submitted course or project once moderation review is available.",
    category: "contribution",
    icon: "eye",
    sortOrder: 70,
  },
  {
    slug: "course-creator",
    title: "Course creator",
    summary: "Published a course for other learners.",
    howToEarn: "Create a course in Studio and publish it.",
    category: "contribution",
    icon: "pencil",
    sortOrder: 80,
  },
] as const;

export const ACHIEVEMENT_CATEGORY_LABELS: Record<AchievementCategory, string> = {
  learning: "Learning",
  building: "Building",
  contribution: "Contribution",
  community: "Community",
};

export function isAchievementSlug(value: unknown): value is AchievementSlug {
  return (
    typeof value === "string" &&
    (ACHIEVEMENT_SLUGS as readonly string[]).includes(value)
  );
}

export function achievementBySlug(slug: string): AchievementDefinition | undefined {
  return ACHIEVEMENT_DEFINITIONS.find((item) => item.slug === slug);
}

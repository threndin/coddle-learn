export const BIO_MAX = 200;
export const SKILL_MIN = 1;
export const SKILL_MAX = 12;

export const EXPERIENCE_LEVELS = [
  {
    id: "beginner",
    label: "Beginner",
    description: "New to programming, or new to this kind of work.",
  },
  {
    id: "intermediate",
    label: "Intermediate",
    description: "I build projects and want a clearer path forward.",
  },
  {
    id: "advanced",
    label: "Advanced",
    description: "I want depth: systems, design, and harder problems.",
  },
] as const;

export type ExperienceLevel = (typeof EXPERIENCE_LEVELS)[number]["id"];

export const SKILL_CATALOG = [
  { slug: "html", name: "HTML", category: "Frontend" },
  { slug: "css", name: "CSS", category: "Frontend" },
  { slug: "javascript", name: "JavaScript", category: "Language" },
  { slug: "typescript", name: "TypeScript", category: "Language" },
  { slug: "python", name: "Python", category: "Language" },
  { slug: "go", name: "Go", category: "Language" },
  { slug: "java", name: "Java", category: "Language" },
  { slug: "rust", name: "Rust", category: "Language" },
  { slug: "react", name: "React", category: "Frontend" },
  { slug: "nextjs", name: "Next.js", category: "Frontend" },
  { slug: "accessibility", name: "Accessibility", category: "Frontend" },
  { slug: "node", name: "Node.js", category: "Backend" },
  { slug: "express", name: "Express", category: "Backend" },
  { slug: "apis", name: "APIs", category: "Backend" },
  { slug: "auth", name: "Auth", category: "Backend" },
  { slug: "sql", name: "SQL", category: "Data" },
  { slug: "postgres", name: "PostgreSQL", category: "Data" },
  { slug: "git", name: "Git", category: "Tools" },
  { slug: "docker", name: "Docker", category: "Tools" },
  { slug: "linux", name: "Linux", category: "Tools" },
  { slug: "cloud", name: "Cloud", category: "Tools" },
  { slug: "testing", name: "Testing", category: "Practice" },
  { slug: "system-design", name: "System design", category: "Practice" },
] as const;

export type CatalogSkill = (typeof SKILL_CATALOG)[number];

export const SKILL_CATEGORIES = [
  "All",
  ...Array.from(new Set(SKILL_CATALOG.map((skill) => skill.category))),
] as const;

export type SkillCategory = (typeof SKILL_CATEGORIES)[number];

export const SUGGESTED_SKILL_SLUGS: Record<ExperienceLevel, readonly string[]> = {
  beginner: ["html", "css", "javascript", "git"],
  intermediate: ["typescript", "react", "node", "postgres"],
  advanced: ["system-design", "docker", "testing", "go"],
};

export const STARTER_ROADMAPS = [
  {
    slug: "programming-foundations",
    name: "Programming Foundations",
    level: "beginner",
    summary: "How software works, your first programs, and Git.",
    weeks: 6,
    nodes: ["Computers", "Programming", "Git", "Debugging"],
    skillSlugs: ["git"],
  },
  {
    slug: "frontend-developer",
    name: "Frontend Developer",
    level: "beginner",
    summary: "From a web page to a React app you can ship.",
    weeks: 12,
    nodes: ["HTML", "CSS", "JavaScript", "TypeScript", "React", "Next.js"],
    skillSlugs: ["html", "css", "javascript", "typescript", "react", "nextjs"],
  },
  {
    slug: "typescript",
    name: "TypeScript",
    level: "intermediate",
    summary: "Types, generics, and patterns you can use every day.",
    weeks: 6,
    nodes: ["JavaScript", "Types", "Generics", "Patterns"],
    skillSlugs: ["javascript", "typescript"],
  },
  {
    slug: "node-backend",
    name: "Node Backend",
    level: "intermediate",
    summary: "APIs, auth, and Postgres with Node.js.",
    weeks: 10,
    nodes: ["JavaScript", "Node", "APIs", "Auth", "Postgres"],
    skillSlugs: ["javascript", "node", "apis", "auth", "postgres", "sql"],
  },
  {
    slug: "cloud-engineering",
    name: "Cloud Engineering",
    level: "intermediate",
    summary: "Linux, containers, and how software gets to production.",
    weeks: 10,
    nodes: ["Linux", "Docker", "CI/CD", "Cloud"],
    skillSlugs: ["linux", "docker", "git", "cloud"],
  },
  {
    slug: "go-services",
    name: "Go Services",
    level: "intermediate",
    summary: "Small, reliable services in Go.",
    weeks: 8,
    nodes: ["Syntax", "Concurrency", "HTTP", "Deploy"],
    skillSlugs: ["go", "apis", "docker"],
  },
  {
    slug: "system-design",
    name: "System Design",
    level: "advanced",
    summary: "Scaling, tradeoffs, and how large systems are shaped.",
    weeks: 8,
    nodes: ["Foundations", "Scaling", "Tradeoffs", "Case studies"],
    skillSlugs: ["system-design", "sql", "apis"],
  },
] as const;

export type StarterRoadmap = (typeof STARTER_ROADMAPS)[number];

export type LearnSkill = {
  slug: string;
  name: string;
};

export type LearnUser = {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  bio: string | null;
  coddleUserId: string;
  lastLoginAt: string | null;
  createdAt: string;
  experienceLevel: ExperienceLevel | null;
  dailyGoalMinutes: number | null;
  practiceDays: PracticeDay[];
  startingRoadmapSlug: string | null;
  onboardingCompletedAt: string | null;
  skills: LearnSkill[];
};

export type NormalizedOnboarding = {
  bio: string | null;
  experienceLevel: ExperienceLevel;
  skills: { slug: string; name: string; category: string }[];
  roadmapSlug: string;
  dailyGoalMinutes: number;
  practiceDays: PracticeDay[];
};

export function isExperienceLevel(value: unknown): value is ExperienceLevel {
  return (
    typeof value === "string" &&
    EXPERIENCE_LEVELS.some((level) => level.id === value)
  );
}

export function isValidDailyGoal(minutes: number): boolean {
  return Number.isInteger(minutes) && minutes >= 15 && minutes <= 120 && minutes % 15 === 0;
}

export function slugifySkill(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");
}

export function findCatalogSkill(nameOrSlug: string): CatalogSkill | null {
  const trimmed = nameOrSlug.trim().toLowerCase();
  const slug = slugifySkill(nameOrSlug);
  const compact = slug.replace(/-/g, "");
  return (
    SKILL_CATALOG.find((skill) => {
      return skill.slug === slug || skill.slug === compact || skill.name.toLowerCase() === trimmed;
    }) ?? null
  );
}

export function levelById(id: string) {
  return EXPERIENCE_LEVELS.find((level) => level.id === id) ?? null;
}

export function roadmapBySlug(slug: string): StarterRoadmap | null {
  return STARTER_ROADMAPS.find((roadmap) => roadmap.slug === slug) ?? null;
}

export function roadmapMatchScore(
  roadmap: { skillSlugs: readonly string[]; level: ExperienceLevel },
  input: { skillSlugs: readonly string[]; experienceLevel: ExperienceLevel | null },
): number {
  const selected = new Set(input.skillSlugs);
  let overlap = 0;
  for (const slug of roadmap.skillSlugs) {
    if (selected.has(slug)) overlap += 1;
  }
  const levelBoost = input.experienceLevel && roadmap.level === input.experienceLevel ? 2 : 0;
  return overlap * 3 + levelBoost;
}

export function recommendRoadmap(input: {
  skillSlugs: readonly string[];
  experienceLevel: ExperienceLevel | null;
}): StarterRoadmap | null {
  let best: StarterRoadmap | null = null;
  let bestScore = 0;
  for (const roadmap of STARTER_ROADMAPS) {
    const score = roadmapMatchScore(roadmap, input);
    if (score > bestScore) {
      best = roadmap;
      bestScore = score;
    }
  }
  return best;
}

export const PRACTICE_DAYS = [
  { id: "mon", label: "Mon" },
  { id: "tue", label: "Tue" },
  { id: "wed", label: "Wed" },
  { id: "thu", label: "Thu" },
  { id: "fri", label: "Fri" },
  { id: "sat", label: "Sat" },
  { id: "sun", label: "Sun" },
] as const;

export type PracticeDay = (typeof PRACTICE_DAYS)[number]["id"];

const PRACTICE_DAY_IDS = new Set<string>(PRACTICE_DAYS.map((day) => day.id));

export function isPracticeDay(value: unknown): value is PracticeDay {
  return typeof value === "string" && PRACTICE_DAY_IDS.has(value);
}

export function normalizePracticeDays(value: unknown): PracticeDay[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<PracticeDay>();
  for (const item of value) {
    if (isPracticeDay(item)) seen.add(item);
  }
  return PRACTICE_DAYS.map((day) => day.id).filter((id) => seen.has(id));
}

export function practiceDaysLabel(days: readonly PracticeDay[]): string {
  if (days.length === 0) return "Choose the days you'll learn";
  if (days.length === 7) return "every day";
  const selected = new Set(days);
  return PRACTICE_DAYS.filter((day) => selected.has(day.id))
    .map((day) => day.label)
    .join(", ");
}

export function formatMinutes(minutes: number): string {
  if (minutes % 60 === 0) {
    const hours = minutes / 60;
    return hours === 1 ? "1 hour" : `${hours} hours`;
  }
  if (minutes > 60) {
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return `${hours} hr ${rest} min`;
  }
  return `${minutes} min`;
}

export function weeklyPracticeLabel(minutes: number, dayCount: number): string {
  const days = Math.max(0, Math.min(7, Math.floor(dayCount)));
  const hours = (minutes * days) / 60;
  const rounded = Math.round(hours * 10) / 10;
  const pretty = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  const unit = rounded === 1 ? "hour" : "hours";
  return `${pretty} ${unit} a week`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseOnboardingInput(
  input: unknown,
): { ok: true; value: NormalizedOnboarding } | { ok: false; message: string } {
  if (!isRecord(input)) {
    return { ok: false, message: "Onboarding details were missing." };
  }

  const bioRaw = typeof input.bio === "string" ? input.bio.trim() : "";
  if (bioRaw.length > BIO_MAX) {
    return { ok: false, message: `Keep your bio under ${BIO_MAX} characters.` };
  }

  if (!isExperienceLevel(input.experienceLevel)) {
    return { ok: false, message: "Choose a level to continue." };
  }

  if (!Array.isArray(input.skills)) {
    return { ok: false, message: "Add at least one skill." };
  }

  const skills: NormalizedOnboarding["skills"] = [];
  const seen = new Set<string>();

  for (const item of input.skills) {
    if (!isRecord(item)) {
      return { ok: false, message: "One of the skills could not be read." };
    }

    const rawSlug = typeof item.slug === "string" ? item.slug : "";
    const rawName =
      typeof item.name === "string" ? item.name.trim().replace(/\s+/g, " ") : "";
    const catalog = SKILL_CATALOG.find((skill) => skill.slug === rawSlug);

    if (catalog) {
      if (seen.has(catalog.slug)) continue;
      seen.add(catalog.slug);
      skills.push({ slug: catalog.slug, name: catalog.name, category: catalog.category });
      continue;
    }

    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(rawSlug) || rawSlug.length < 2 || rawSlug.length > 40) {
      return { ok: false, message: "One of the skills has an invalid name." };
    }
    if (rawName.length < 2 || rawName.length > 32) {
      return { ok: false, message: "Skill names need 2 to 32 characters." };
    }
    if (seen.has(rawSlug)) continue;
    seen.add(rawSlug);
    skills.push({ slug: rawSlug, name: rawName, category: "Custom" });
  }

  if (skills.length < SKILL_MIN) {
    return { ok: false, message: "Add at least one skill." };
  }
  if (skills.length > SKILL_MAX) {
    return { ok: false, message: `Choose up to ${SKILL_MAX} skills.` };
  }

  const roadmapSlug = typeof input.roadmapSlug === "string" ? input.roadmapSlug : "";
  if (!STARTER_ROADMAPS.some((roadmap) => roadmap.slug === roadmapSlug)) {
    return { ok: false, message: "Choose a roadmap to start." };
  }

  if (typeof input.dailyGoalMinutes !== "number" || !isValidDailyGoal(input.dailyGoalMinutes)) {
    return { ok: false, message: "Choose a daily goal between 15 and 120 minutes." };
  }

  const practiceDays = normalizePracticeDays(input.practiceDays);
  if (practiceDays.length < 1) {
    return { ok: false, message: "Choose at least one day." };
  }

  return {
    ok: true,
    value: {
      bio: bioRaw.length > 0 ? bioRaw : null,
      experienceLevel: input.experienceLevel,
      skills,
      roadmapSlug,
      dailyGoalMinutes: input.dailyGoalMinutes,
      practiceDays,
    },
  };
}

export const COMMUNITY_KINDS = ["question", "discussion", "project_share"] as const;
export type CommunityKind = (typeof COMMUNITY_KINDS)[number];

export const COMMUNITY_KIND_LABELS: Record<CommunityKind, string> = {
  question: "Question",
  discussion: "Discussion",
  project_share: "Project share",
};

export function isCommunityKind(value: unknown): value is CommunityKind {
  return typeof value === "string" && (COMMUNITY_KINDS as readonly string[]).includes(value);
}

/** What the post is about. Links to a catalog item when a related slug is set. */
export const COMMUNITY_TOPICS = ["general", "course", "roadmap", "project"] as const;
export type CommunityTopic = (typeof COMMUNITY_TOPICS)[number];

export const COMMUNITY_TOPIC_LABELS: Record<CommunityTopic, string> = {
  general: "General",
  course: "Course",
  roadmap: "Roadmap",
  project: "Project",
};

export function isCommunityTopic(value: unknown): value is CommunityTopic {
  return typeof value === "string" && (COMMUNITY_TOPICS as readonly string[]).includes(value);
}

export const COMMUNITY_SCOPES = ["all", "mine"] as const;
export type CommunityScope = (typeof COMMUNITY_SCOPES)[number];

export const COMMUNITY_SORTS = ["newest"] as const;
export type CommunitySort = (typeof COMMUNITY_SORTS)[number];

export const COMMUNITY_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"] as const;

/** Allowed reaction emojis on a community post. One reaction per user. */
export const COMMUNITY_REACTION_EMOJIS = ["👍", "❤️", "🔥", "💡", "🎉"] as const;
export type CommunityReactionEmoji = (typeof COMMUNITY_REACTION_EMOJIS)[number];

export function isCommunityReactionEmoji(value: unknown): value is CommunityReactionEmoji {
  return (
    typeof value === "string" &&
    (COMMUNITY_REACTION_EMOJIS as readonly string[]).includes(value)
  );
}

/** Why someone is reporting a post or comment. */
export const COMMUNITY_REPORT_REASONS = [
  "spam",
  "harassment",
  "misinformation",
  "inappropriate",
  "other",
] as const;
export type CommunityReportReason = (typeof COMMUNITY_REPORT_REASONS)[number];

export const COMMUNITY_REPORT_REASON_LABELS: Record<CommunityReportReason, string> = {
  spam: "Spam or scam",
  harassment: "Harassment or hate",
  misinformation: "Misinformation",
  inappropriate: "Inappropriate content",
  other: "Something else",
};

export function isCommunityReportReason(value: unknown): value is CommunityReportReason {
  return (
    typeof value === "string" &&
    (COMMUNITY_REPORT_REASONS as readonly string[]).includes(value)
  );
}

export const COMMUNITY_LIMITS = {
  titleMin: 8,
  titleMax: 140,
  bodyMin: 20,
  bodyMax: 4000,
  /** Quote commentary can be shorter than a full post body. */
  quoteBodyMin: 1,
  relatedSlugMax: 120,
  relatedTitleMax: 160,
  queryMax: 100,
  pageSize: 10,
  /** Posts per learner per rolling 24 hours. */
  dailyPosts: 5,
  /** Images attached to a single post. Videos are not supported yet. */
  imagesMax: 2,
  imageBytesMax: 4 * 1024 * 1024,
  commentBodyMin: 1,
  commentBodyMax: 2000,
  /** Top-level comments loaded with a post detail (replies nested). */
  commentsPageSize: 40,
  reportDetailsMax: 500,
} as const;

/** Points awarded when a learner publishes a new community post (not edits or comments). */
export const COMMUNITY_POST_CREATE_POINTS = 5;
export const COMMUNITY_POST_CREATE_POINT_REASON = "community_post_create" as const;

export type StarterCommunityPost = {
  /** Stable id so re-seeding updates the same rows. */
  id: string;
  /** Unique URL slug coined from the title. */
  slug: string;
  kind: CommunityKind;
  topic: CommunityTopic;
  relatedSlug?: string;
  relatedTitle?: string;
  title: string;
  body: string;
  imageUrls?: string[];
};

export const STARTER_COMMUNITY_POSTS: readonly StarterCommunityPost[] = [
  {
    id: "seed_community_q_react_hooks",
    slug: "when-should-i-reach-for-useeffect-vs-deriving-state",
    kind: "question",
    topic: "course",
    relatedSlug: "react-fundamentals",
    relatedTitle: "React Fundamentals",
    title: "When should I reach for useEffect vs deriving state?",
    body: "I'm working through React fundamentals and keep adding useEffect for things that feel like they could just be computed during render. What signals should I look for before introducing an effect?",
  },
  {
    id: "seed_community_d_roadmap_order",
    slug: "how-are-you-pacing-the-frontend-roadmap",
    kind: "discussion",
    topic: "roadmap",
    relatedSlug: "frontend-developer",
    relatedTitle: "Frontend Developer",
    title: "How are you pacing the frontend roadmap?",
    body: "Curious how others are splitting the frontend path across a week. Do you finish each step fully before moving on, or jump ahead to projects and come back for gaps?",
  },
  {
    id: "seed_community_p_portfolio",
    slug: "shipped-a-first-portfolio-with-a-project-grid",
    kind: "project_share",
    topic: "project",
    relatedSlug: "personal-portfolio",
    relatedTitle: "Personal Portfolio",
    title: "Shipped a first portfolio with a project grid",
    body: "Finished the personal portfolio brief: Next.js, a projects section, and a short about page. Biggest lesson was keeping the layout boring so the work could stay the focus. Happy to compare notes on what you included in yours.",
    imageUrls: ["/projects/personal-portfolio.jpg"],
  },
  {
    id: "seed_community_q_typescript",
    slug: "best-way-to-practice-typescript-without-drowning-in-generics",
    kind: "question",
    topic: "general",
    title: "Best way to practice TypeScript without drowning in generics?",
    body: "I can follow typed props and simple unions, but generics still feel abstract. What small exercises helped you before diving into library-level types?",
  },
];

import {
  SEARCH_LIMITS,
  SEARCH_TYPES,
  type ParsedSearchQuery,
  type SearchType,
} from "@coddle/shared";

const STOPWORDS = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "of",
  "for",
  "to",
  "in",
  "on",
  "with",
  "from",
  "how",
  "what",
  "where",
  "which",
  "who",
  "do",
  "does",
  "i",
  "me",
  "my",
  "we",
  "please",
  "find",
  "show",
  "looking",
  "want",
  "need",
  "about",
  "best",
  "good",
  "some",
  "any",
  "help",
  "learn",
  "learning",
]);

const TYPE_ALIASES: Record<string, SearchType> = {
  course: "course",
  courses: "course",
  lesson: "course",
  lessons: "course",
  class: "course",
  classes: "course",
  tutorial: "course",
  tutorials: "course",
  roadmap: "roadmap",
  roadmaps: "roadmap",
  path: "roadmap",
  paths: "roadmap",
  pathway: "roadmap",
  track: "roadmap",
  tracks: "roadmap",
  resource: "resource",
  resources: "resource",
  article: "resource",
  articles: "resource",
  docs: "resource",
  documentation: "resource",
  video: "resource",
  videos: "resource",
  project: "project",
  projects: "project",
  build: "project",
  showcase: "project",
  developer: "developer",
  developers: "developer",
  people: "developer",
  person: "developer",
  profile: "developer",
  profiles: "developer",
  learner: "developer",
  learners: "developer",
  mentor: "mentor",
  mentors: "mentor",
  mentorship: "mentor",
  coach: "mentor",
  coaching: "mentor",
  skill: "skill",
  skills: "skill",
  tech: "skill",
  technology: "skill",
  technologies: "skill",
  language: "skill",
  tool: "tool",
  tools: "tool",
  editor: "tool",
  ide: "tool",
  software: "tool",
};

const SYNONYMS: Record<string, string[]> = {
  js: ["javascript"],
  javascript: ["js"],
  ts: ["typescript"],
  typescript: ["ts"],
  reactjs: ["react"],
  react: ["reactjs", "react.js"],
  next: ["nextjs", "next.js"],
  nextjs: ["next", "next.js"],
  node: ["nodejs", "node.js"],
  nodejs: ["node", "node.js"],
  py: ["python"],
  python: ["py"],
  pg: ["postgres", "postgresql"],
  postgres: ["postgresql", "pg"],
  postgresql: ["postgres", "pg"],
  k8s: ["kubernetes"],
  kubernetes: ["k8s"],
  go: ["golang"],
  golang: ["go"],
  css: ["stylesheet"],
  html: ["markup"],
  db: ["database"],
  database: ["db"],
  ai: ["machine learning", "ml"],
  ml: ["machine learning", "ai"],
  fe: ["frontend", "front-end"],
  frontend: ["front-end", "fe"],
  be: ["backend", "back-end"],
  backend: ["back-end", "be"],
};

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9+#.\s-]/g, " ")
    .split(/[\s/_-]+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 0);
}

export function parseSearchQuery(rawInput: string): ParsedSearchQuery {
  const raw = rawInput.trim().slice(0, SEARCH_LIMITS.queryMax);
  const tokens = tokenize(raw);
  const inferred = new Set<SearchType>();
  const kept: string[] = [];

  for (const token of tokens) {
    const type = TYPE_ALIASES[token];
    if (type) {
      inferred.add(type);
      continue;
    }
    if (STOPWORDS.has(token)) continue;
    kept.push(token);
  }

  const terms = (kept.length > 0 ? kept : tokens.filter((token) => !TYPE_ALIASES[token])).slice(
    0,
    8,
  );
  const expanded = new Set(terms);
  for (const term of terms) {
    for (const extra of SYNONYMS[term] ?? []) {
      for (const piece of tokenize(extra)) expanded.add(piece);
    }
  }

  return {
    raw,
    text: terms.join(" ") || raw.toLowerCase(),
    terms,
    expanded: [...expanded],
    inferredTypes: SEARCH_TYPES.filter((type) => inferred.has(type)),
  };
}

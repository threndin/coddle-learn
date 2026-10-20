import type { ToolCategory, ToolPlatform, ToolPricing } from "./tools.js";

export type StarterTool = {
  slug: string;
  url: string;
  title: string;
  summary: string;
  imageUrl: string;
  category: ToolCategory;
  pricing: ToolPricing;
  platforms: readonly ToolPlatform[];
  skillSlugs: readonly string[];
};

/** Curated catalog. Upserted by URL; community submissions are left alone. */
export const STARTER_TOOLS: readonly StarterTool[] = [
  {
    slug: "coddle",
    url: "https://coddle.dev/",
    title: "Coddle",
    summary:
      "An AI workspace for building products faster. Plan, write PRDs, run sprints, and ship with your team and agents in one place.",
    imageUrl: "/tools/coddle.png",
    category: "workspace",
    pricing: "freemium",
    platforms: ["web"],
    skillSlugs: ["git", "system-design", "cloud"],
  },
  {
    slug: "visual-studio-code",
    url: "https://code.visualstudio.com/",
    title: "Visual Studio Code",
    summary:
      "The editor most learners start in. Fast, free, and extensible: debugging, Git, terminals, and a huge marketplace.",
    imageUrl: "/tools/visual-studio-code.svg",
    category: "editor",
    pricing: "free",
    platforms: ["mac", "windows", "linux"],
    skillSlugs: ["javascript", "typescript", "git"],
  },
  {
    slug: "zed",
    url: "https://zed.dev/",
    title: "Zed",
    summary:
      "A high-performance collaborative editor written in Rust. Multiple cursors, AI, and pair programming without the lag.",
    imageUrl: "/tools/zed.svg",
    category: "editor",
    pricing: "free",
    platforms: ["mac", "windows", "linux"],
    skillSlugs: ["rust", "git"],
  },
  {
    slug: "warp",
    url: "https://www.warp.dev/",
    title: "Warp",
    summary:
      "A modern terminal with blocks, AI command search, and shared workflows, so the shell feels like a real editor.",
    imageUrl: "/tools/warp.svg",
    category: "terminal",
    pricing: "freemium",
    platforms: ["mac", "windows", "linux"],
    skillSlugs: ["linux", "git"],
  },
  {
    slug: "raycast",
    url: "https://www.raycast.com/",
    title: "Raycast",
    summary:
      "Replace Spotlight with snippets, window management, GitHub, and custom scripts a keystroke away.",
    imageUrl: "/tools/raycast.svg",
    category: "productivity",
    pricing: "freemium",
    platforms: ["mac"],
    skillSlugs: ["git"],
  },
  {
    slug: "github",
    url: "https://github.com/",
    title: "GitHub",
    summary:
      "Host code, review pull requests, run Actions, and ship with the workflow every open-source project already uses.",
    imageUrl: "/tools/github.svg",
    category: "collaboration",
    pricing: "freemium",
    platforms: ["web"],
    skillSlugs: ["git"],
  },
  {
    slug: "figma",
    url: "https://www.figma.com/",
    title: "Figma",
    summary:
      "Design interfaces, prototype flows, and hand off specs in the browser. The default for product and frontend teams.",
    imageUrl: "/tools/figma.svg",
    category: "design",
    pricing: "freemium",
    platforms: ["web", "mac", "windows"],
    skillSlugs: ["html", "css", "accessibility"],
  },
  {
    slug: "excalidraw",
    url: "https://excalidraw.com/",
    title: "Excalidraw",
    summary:
      "Whiteboard diagrams that look hand-drawn. Perfect for architecture sketches, user flows, and explaining a system.",
    imageUrl: "/tools/excalidraw.svg",
    category: "design",
    pricing: "free",
    platforms: ["web"],
    skillSlugs: ["system-design"],
  },
  {
    slug: "postman",
    url: "https://www.postman.com/",
    title: "Postman",
    summary:
      "Build, mock, and test APIs. Collections, environments, and docs so a request is never a one-off curl again.",
    imageUrl: "/tools/postman.svg",
    category: "api",
    pricing: "freemium",
    platforms: ["web", "mac", "windows", "linux"],
    skillSlugs: ["apis", "javascript"],
  },
  {
    slug: "hoppscotch",
    url: "https://hoppscotch.io/",
    title: "Hoppscotch",
    summary:
      "A fast, open-source API client in the browser. REST, GraphQL, and realtime, lighter than a full desktop suite.",
    imageUrl: "/tools/hoppscotch.svg",
    category: "api",
    pricing: "free",
    platforms: ["web"],
    skillSlugs: ["apis"],
  },
  {
    slug: "tableplus",
    url: "https://tableplus.com/",
    title: "TablePlus",
    summary:
      "A native GUI for Postgres, MySQL, SQLite, and more. Query, browse rows, and edit data without fighting a web console.",
    imageUrl: "/tools/tableplus.svg",
    category: "database",
    pricing: "freemium",
    platforms: ["mac", "windows", "linux"],
    skillSlugs: ["sql", "postgres"],
  },
  {
    slug: "dbeaver",
    url: "https://dbeaver.io/",
    title: "DBeaver",
    summary:
      "A free universal database tool. Connect to almost any engine, write SQL, and inspect schemas on every OS.",
    imageUrl: "/tools/dbeaver.svg",
    category: "database",
    pricing: "freemium",
    platforms: ["mac", "windows", "linux"],
    skillSlugs: ["sql", "postgres"],
  },
  {
    slug: "docker-desktop",
    url: "https://www.docker.com/products/docker-desktop/",
    title: "Docker Desktop",
    summary:
      "Run containers locally with a GUI for images, volumes, and Compose. The usual first step into Docker.",
    imageUrl: "/tools/docker-desktop.svg",
    category: "devops",
    pricing: "freemium",
    platforms: ["mac", "windows", "linux"],
    skillSlugs: ["docker", "linux"],
  },
  {
    slug: "vercel",
    url: "https://vercel.com/",
    title: "Vercel",
    summary:
      "Push a Git repo and get a preview URL. Built for Next.js, with edge, serverless, and production that stays simple.",
    imageUrl: "/tools/vercel.svg",
    category: "hosting",
    pricing: "freemium",
    platforms: ["web"],
    skillSlugs: ["nextjs", "react", "cloud"],
  },
  {
    slug: "railway",
    url: "https://railway.app/",
    title: "Railway",
    summary:
      "Deploy backends, databases, and workers from a repo without writing Terraform. Good for side projects and first production apps.",
    imageUrl: "/tools/railway.svg",
    category: "hosting",
    pricing: "freemium",
    platforms: ["web"],
    skillSlugs: ["node", "postgres", "cloud"],
  },
  {
    slug: "supabase",
    url: "https://supabase.com/",
    title: "Supabase",
    summary:
      "Postgres, auth, storage, and realtime APIs without standing up your own backend on day one.",
    imageUrl: "/tools/supabase.svg",
    category: "backend",
    pricing: "freemium",
    platforms: ["web"],
    skillSlugs: ["postgres", "auth", "sql"],
  },
  {
    slug: "playwright",
    url: "https://playwright.dev/",
    title: "Playwright",
    summary:
      "Reliable browser tests across Chromium, Firefox, and WebKit. Auto-wait, tracing, and codegen for end-to-end coverage.",
    imageUrl: "/tools/playwright.svg",
    category: "testing",
    pricing: "free",
    platforms: ["mac", "windows", "linux", "cli"],
    skillSlugs: ["testing", "javascript", "typescript"],
  },
  {
    slug: "watchup",
    url: "https://watchup.site/",
    title: "WatchUp",
    summary:
      "Watches errors, latency, databases, uptime, and servers across every environment. When something breaks, the stack trace lands on WhatsApp, the app you will actually open at 3am.",
    imageUrl: "/tools/watchup.webp",
    category: "monitoring",
    pricing: "freemium",
    platforms: ["web"],
    skillSlugs: ["cloud", "docker"],
  },
  {
    slug: "ngrok",
    url: "https://ngrok.com/",
    title: "ngrok",
    summary:
      "Put a public HTTPS URL on localhost. Demo webhooks, mobile clients, and share work-in-progress without deploying.",
    imageUrl: "/tools/ngrok.svg",
    category: "devops",
    pricing: "freemium",
    platforms: ["mac", "windows", "linux", "cli"],
    skillSlugs: ["apis", "cloud"],
  },
  {
    slug: "homebrew",
    url: "https://brew.sh/",
    title: "Homebrew",
    summary:
      "The missing package manager for macOS (and Linux). Install languages, CLIs, and databases with one command.",
    imageUrl: "/tools/homebrew.svg",
    category: "cli",
    pricing: "free",
    platforms: ["mac", "linux", "cli"],
    skillSlugs: ["linux", "git"],
  },
];

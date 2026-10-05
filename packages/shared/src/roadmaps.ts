import type { ExperienceLevel } from "./onboarding.js";

export const RESOURCE_TYPES = ["docs", "article", "video", "course", "tool"] as const;
export type ResourceType = (typeof RESOURCE_TYPES)[number];

export type RoadmapResourceSeed = {
  title: string;
  url: string;
  type: ResourceType;
};

export type RoadmapStepSeed = {
  slug: string;
  title: string;
  summary: string;
  estimatedMinutes: number;
  /** Outcomes the learner should walk away with. */
  learnings: readonly string[];
  /** One concrete practice prompt for the step. */
  practice: string;
  resources: readonly RoadmapResourceSeed[];
  /**
   * Consecutive steps sharing a branchKey form an OR group —
   * completing any one unlocks the next step after the group.
   */
  branchKey?: string;
};

export type StarterRoadmap = {
  slug: string;
  name: string;
  level: ExperienceLevel;
  summary: string;
  weeks: number;
  steps: readonly RoadmapStepSeed[];
  skillSlugs: readonly string[];
};

export const STEP_PROGRESS_STATUSES = ["completed", "skipped"] as const;
export type StepProgressStatus = (typeof STEP_PROGRESS_STATUSES)[number];

export function isStepProgressStatus(value: unknown): value is StepProgressStatus {
  return (
    typeof value === "string" &&
    (STEP_PROGRESS_STATUSES as readonly string[]).includes(value)
  );
}

export const STEP_COMPLETE_POINTS = 10;
export const ROADMAP_COMPLETE_POINTS = 40;

export function roadmapProgressPercent(doneCount: number, totalCount: number): number {
  if (totalCount <= 0) return 0;
  return Math.min(100, Math.round((doneCount / totalCount) * 100));
}

function step(
  partial: RoadmapStepSeed,
): RoadmapStepSeed {
  return partial;
}

export const STARTER_ROADMAPS: readonly StarterRoadmap[] = [
  {
    slug: "programming-foundations",
    name: "Programming Foundations",
    level: "beginner",
    summary: "How software works, your first programs, Git, debugging, and a tiny project you can show.",
    weeks: 8,
    skillSlugs: ["git", "javascript"],
    steps: [
      step({
        slug: "computers",
        title: "Computers & the terminal",
        summary: "How programs run: files, the terminal, and what a computer is doing under the hood.",
        estimatedMinutes: 90,
        learnings: [
          "Navigate folders and run commands in a terminal",
          "Explain what a program, process, and file path are",
          "Create and edit a simple text file from the shell",
        ],
        practice: "Open your terminal, create a folder called practice, and write a one-line hello.txt file inside it.",
        resources: [
          {
            title: "MDN: Getting started with the web",
            url: "https://developer.mozilla.org/en-US/docs/Learn_web_development/Getting_started",
            type: "docs",
          },
          {
            title: "The Command Line Crash Course",
            url: "https://learnpythonthehardway.org/book/appendixa.html",
            type: "article",
          },
        ],
      }),
      step({
        slug: "programming",
        title: "First programs",
        summary: "Write small programs, use variables and control flow, and get comfortable reading errors.",
        estimatedMinutes: 180,
        learnings: [
          "Use variables, conditionals, and loops",
          "Read a basic error message and fix it",
          "Break a problem into smaller steps before coding",
        ],
        practice: "Write a script that asks for a name and prints a personalized greeting; then break it on purpose and fix the error.",
        resources: [
          {
            title: "JavaScript first steps (MDN)",
            url: "https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Scripting",
            type: "docs",
          },
          {
            title: "freeCodeCamp: JavaScript Algorithms and Data Structures",
            url: "https://www.freecodecamp.org/learn/javascript-algorithms-and-data-structures-v8/",
            type: "course",
          },
          {
            title: "javascript.info: Intro",
            url: "https://javascript.info/intro",
            type: "article",
          },
        ],
      }),
      step({
        slug: "git",
        title: "Git basics",
        summary: "Track changes, commit with intent, and push work to a remote repository.",
        estimatedMinutes: 120,
        learnings: [
          "Initialize a repo and make meaningful commits",
          "Push to GitHub and clone an existing project",
          "Use status, diff, and log to understand history",
        ],
        practice: "Create a GitHub repo for your practice folder, make three commits with clear messages, and push them.",
        resources: [
          {
            title: "Git Handbook (GitHub)",
            url: "https://docs.github.com/en/get-started/using-git/about-git",
            type: "docs",
          },
          {
            title: "Oh My Git! (interactive)",
            url: "https://ohmygit.org/",
            type: "tool",
          },
          {
            title: "Pro Git book (free)",
            url: "https://git-scm.com/book/en/v2",
            type: "docs",
          },
        ],
      }),
      step({
        slug: "debugging",
        title: "Debugging",
        summary: "Reproduce bugs, read stack traces, and fix problems methodically.",
        estimatedMinutes: 90,
        learnings: [
          "Reproduce a bug before changing code",
          "Use console logging and a browser debugger",
          "Write down what you expected vs what happened",
        ],
        practice: "Take a broken snippet (or break your greeting script), list three hypotheses, then fix it using the debugger.",
        resources: [
          {
            title: "Chrome DevTools overview",
            url: "https://developer.chrome.com/docs/devtools/overview",
            type: "docs",
          },
          {
            title: "How to debug JavaScript (MDN)",
            url: "https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Scripting/Debugging_JavaScript",
            type: "docs",
          },
        ],
      }),
      step({
        slug: "functions-and-data",
        title: "Functions & data",
        summary: "Organize code with functions and work with arrays and objects.",
        estimatedMinutes: 150,
        learnings: [
          "Write reusable functions with parameters and return values",
          "Create and update arrays and objects",
          "Prefer small functions over one long script",
        ],
        practice: "Build a tiny contact list in memory: add, list, and find contacts by name using functions.",
        resources: [
          {
            title: "Functions (MDN)",
            url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Functions",
            type: "docs",
          },
          {
            title: "Working with objects (MDN)",
            url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Working_with_objects",
            type: "docs",
          },
        ],
      }),
      step({
        slug: "mini-project",
        title: "Mini project",
        summary: "Ship a small CLI or webpage that combines what you learned and share it on GitHub.",
        estimatedMinutes: 180,
        learnings: [
          "Scope a project you can finish in a few hours",
          "Commit as you go instead of once at the end",
          "Write a short README that explains how to run it",
        ],
        practice: "Build a to-do list or tip calculator, push it to GitHub, and write a README with setup steps.",
        resources: [
          {
            title: "Writing a great README",
            url: "https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-readmes",
            type: "docs",
          },
          {
            title: "How to think about side projects",
            url: "https://www.freecodecamp.org/news/how-to-build-a-personal-project/",
            type: "article",
          },
        ],
      }),
    ],
  },
  {
    slug: "frontend-developer",
    name: "Frontend Developer",
    level: "beginner",
    summary: "From a semantic web page to a React app you can ship with Next.js.",
    weeks: 14,
    skillSlugs: ["html", "css", "javascript", "typescript", "react", "nextjs"],
    steps: [
      step({
        slug: "html",
        title: "HTML",
        summary: "Structure pages with semantic HTML and accessible landmarks.",
        estimatedMinutes: 120,
        learnings: [
          "Use headings, lists, links, and forms correctly",
          "Choose semantic elements over generic divs",
          "Check basic accessibility with keyboard navigation",
        ],
        practice: "Build a personal profile page with header, main, and footer using only semantic HTML.",
        resources: [
          {
            title: "HTML: A good basis for accessibility (MDN)",
            url: "https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Accessibility/HTML",
            type: "docs",
          },
          {
            title: "HTML living standard",
            url: "https://html.spec.whatwg.org/multipage/",
            type: "docs",
          },
        ],
      }),
      step({
        slug: "css",
        title: "CSS",
        summary: "Layout, spacing, and responsive design with modern CSS.",
        estimatedMinutes: 150,
        learnings: [
          "Control layout with Flexbox and Grid",
          "Use spacing, typography, and color consistently",
          "Make a layout usable on mobile and desktop",
        ],
        practice: "Style your profile page so it looks good at 375px and 1200px widths.",
        resources: [
          {
            title: "CSS layout (MDN)",
            url: "https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/CSS_layout",
            type: "docs",
          },
          {
            title: "web.dev: Learn CSS",
            url: "https://web.dev/learn/css",
            type: "course",
          },
          {
            title: "Flexbox Froggy",
            url: "https://flexboxfroggy.com/",
            type: "tool",
          },
        ],
      }),
      step({
        slug: "javascript",
        title: "JavaScript in the browser",
        summary: "DOM updates, events, fetch, and modular scripts in the browser.",
        estimatedMinutes: 180,
        learnings: [
          "Select elements and respond to user events",
          "Update the DOM without a full page reload",
          "Fetch JSON from an API and render it",
        ],
        practice: "Add a theme toggle and a live character counter to a form on your profile page.",
        resources: [
          {
            title: "JavaScript guide (MDN)",
            url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide",
            type: "docs",
          },
          {
            title: "javascript.info",
            url: "https://javascript.info/",
            type: "article",
          },
        ],
      }),
      step({
        slug: "typescript",
        title: "TypeScript",
        summary: "Add types to UI code so refactors stay safe as the app grows.",
        estimatedMinutes: 120,
        learnings: [
          "Annotate props and function return types",
          "Model form and API data with interfaces",
          "Fix type errors instead of using any",
        ],
        practice: "Convert one of your scripts to TypeScript and type the data it uses.",
        resources: [
          {
            title: "TypeScript for the New Programmer",
            url: "https://www.typescriptlang.org/docs/handbook/typescript-from-scratch.html",
            type: "docs",
          },
          {
            title: "TypeScript Handbook",
            url: "https://www.typescriptlang.org/docs/handbook/intro.html",
            type: "docs",
          },
        ],
      }),
      step({
        slug: "react",
        title: "React",
        summary: "Components, props, state, and effects for interactive UIs.",
        estimatedMinutes: 210,
        learnings: [
          "Split UI into components with clear props",
          "Manage local state and simple effects",
          "Lift state when siblings need the same data",
        ],
        practice: "Rebuild your profile tip or to-do UI as a React app with at least three components.",
        resources: [
          {
            title: "React Learn",
            url: "https://react.dev/learn",
            type: "docs",
          },
          {
            title: "Thinking in React",
            url: "https://react.dev/learn/thinking-in-react",
            type: "article",
          },
        ],
      }),
      step({
        slug: "nextjs",
        title: "Next.js",
        summary: "Routing, data fetching, and shipping a production-ready React app.",
        estimatedMinutes: 180,
        learnings: [
          "Create pages and nested routes",
          "Fetch data for a page and handle loading/error states",
          "Deploy a Next.js app to a hosting provider",
        ],
        practice: "Create a Next.js app with a home page and a projects page; deploy it and share the URL.",
        resources: [
          {
            title: "Next.js Learn",
            url: "https://nextjs.org/learn",
            type: "course",
          },
          {
            title: "Next.js Docs",
            url: "https://nextjs.org/docs",
            type: "docs",
          },
        ],
      }),
      step({
        slug: "accessibility-polish",
        title: "Accessibility & polish",
        summary: "Keyboard paths, focus states, contrast, and finishing details before you call it done.",
        estimatedMinutes: 120,
        learnings: [
          "Tab through your UI and fix focus traps",
          "Check color contrast on text and buttons",
          "Add labels and alt text where they are missing",
        ],
        practice: "Run through your deployed app with keyboard only and fix every issue you find.",
        resources: [
          {
            title: "web.dev: Accessible to all",
            url: "https://web.dev/learn/accessibility",
            type: "course",
          },
          {
            title: "axe DevTools",
            url: "https://www.deque.com/axe/devtools/",
            type: "tool",
          },
        ],
      }),
    ],
  },
  {
    slug: "typescript",
    name: "TypeScript",
    level: "intermediate",
    summary: "Types, generics, and patterns you can use every day in real apps.",
    weeks: 7,
    skillSlugs: ["javascript", "typescript"],
    steps: [
      step({
        slug: "javascript",
        title: "Modern JavaScript refresh",
        summary: "Refresh modern JS so TypeScript features make sense in context.",
        estimatedMinutes: 90,
        learnings: [
          "Use modules, destructuring, and async/await fluently",
          "Know when values are nullish vs empty",
          "Prefer const and clear names before adding types",
        ],
        practice: "Rewrite a callback-based snippet to async/await and export it as a module.",
        resources: [
          {
            title: "Modern JavaScript tutorial",
            url: "https://javascript.info/",
            type: "article",
          },
        ],
      }),
      step({
        slug: "types",
        title: "Everyday types",
        summary: "Interfaces, unions, narrowing, and modeling real domain data.",
        estimatedMinutes: 150,
        learnings: [
          "Model domain objects with interfaces and type aliases",
          "Narrow unions with typeof, in, and discriminants",
          "Avoid any unless you can explain why",
        ],
        practice: "Type a User, Session, and ApiError union for a tiny auth response payload.",
        resources: [
          {
            title: "Everyday Types",
            url: "https://www.typescriptlang.org/docs/handbook/2/everyday-types.html",
            type: "docs",
          },
          {
            title: "Narrowing",
            url: "https://www.typescriptlang.org/docs/handbook/2/narrowing.html",
            type: "docs",
          },
        ],
      }),
      step({
        slug: "interfaces-track",
        title: "Interfaces-first modeling",
        summary: "Prefer interfaces for object shapes you expect to extend across modules.",
        estimatedMinutes: 90,
        learnings: [
          "Declare interfaces for public object shapes",
          "Extend interfaces instead of duplicating fields",
          "Know when an interface is clearer than a type alias",
        ],
        practice: "Model a BlogPost and Author with interfaces; extend BlogPost into FeaturedPost.",
        branchKey: "modeling-style",
        resources: [
          {
            title: "Interfaces vs type aliases",
            url: "https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#differences-between-type-aliases-and-interfaces",
            type: "docs",
          },
        ],
      }),
      step({
        slug: "types-track",
        title: "Type-aliases-first modeling",
        summary: "Prefer type aliases for unions, mapped shapes, and composition-heavy designs.",
        estimatedMinutes: 90,
        learnings: [
          "Compose unions and intersections with type aliases",
          "Derive types from existing values with typeof",
          "Choose aliases when you need unions more than declaration merging",
        ],
        practice: "Model the same BlogPost domain with type aliases and a status union.",
        branchKey: "modeling-style",
        resources: [
          {
            title: "Type aliases",
            url: "https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#type-aliases",
            type: "docs",
          },
        ],
      }),
      step({
        slug: "generics",
        title: "Generics",
        summary: "Reusable functions and components without losing type safety.",
        estimatedMinutes: 120,
        learnings: [
          "Write a generic helper with constrained type parameters",
          "Type arrays and Promise results generically",
          "Read generic error messages without panic",
        ],
        practice: "Write a generic identity and a generic first() helper with tests or console asserts.",
        resources: [
          {
            title: "Generics handbook chapter",
            url: "https://www.typescriptlang.org/docs/handbook/2/generics.html",
            type: "docs",
          },
        ],
      }),
      step({
        slug: "patterns",
        title: "Patterns & utility types",
        summary: "Utility types, modules, and practical patterns for app code.",
        estimatedMinutes: 120,
        learnings: [
          "Use Partial, Pick, Omit, and Record intentionally",
          "Type API clients and form state cleanly",
          "Keep types close to the values they describe",
        ],
        practice: "Take a full User type and derive CreateUserInput and PublicUser with utility types.",
        resources: [
          {
            title: "Utility Types",
            url: "https://www.typescriptlang.org/docs/handbook/utility-types.html",
            type: "docs",
          },
          {
            title: "Total TypeScript tips",
            url: "https://www.totaltypescript.com/tips",
            type: "article",
          },
        ],
      }),
    ],
  },
  {
    slug: "node-backend",
    name: "Node Backend",
    level: "intermediate",
    summary: "APIs, auth, validation, and Postgres with Node.js.",
    weeks: 12,
    skillSlugs: ["javascript", "node", "apis", "auth", "postgres", "sql"],
    steps: [
      step({
        slug: "javascript",
        title: "Async JavaScript for servers",
        summary: "Async patterns, modules, and Node-friendly JavaScript habits.",
        estimatedMinutes: 90,
        learnings: [
          "Use promises and async/await without nesting hell",
          "Handle errors at boundaries instead of swallowing them",
          "Structure files as small modules",
        ],
        practice: "Write an async function that fetches two URLs and returns both results or a clear error.",
        resources: [
          {
            title: "Node.js guides",
            url: "https://nodejs.org/en/learn/getting-started/introduction-to-nodejs",
            type: "docs",
          },
        ],
      }),
      step({
        slug: "node",
        title: "Node & Express",
        summary: "The runtime, npm, scripts, and structuring a server project.",
        estimatedMinutes: 120,
        learnings: [
          "Scaffold an Express app with scripts and env config",
          "Add a health route and request logging",
          "Keep secrets out of source control",
        ],
        practice: "Create an Express server with GET /health that returns JSON and starts via an npm script.",
        resources: [
          {
            title: "Introduction to Node.js",
            url: "https://nodejs.org/en/learn/getting-started/introduction-to-nodejs",
            type: "docs",
          },
          {
            title: "Express Hello world",
            url: "https://expressjs.com/en/starter/hello-world.html",
            type: "docs",
          },
        ],
      }),
      step({
        slug: "apis",
        title: "REST APIs",
        summary: "Design REST endpoints, validate input, and return clear errors.",
        estimatedMinutes: 150,
        learnings: [
          "Map resources to routes and status codes",
          "Validate request bodies before writing to the database",
          "Return consistent error payloads",
        ],
        practice: "Build CRUD routes for notes in memory with 400 responses for invalid input.",
        resources: [
          {
            title: "MDN: HTTP overview",
            url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Overview",
            type: "docs",
          },
          {
            title: "Microsoft REST API guidelines",
            url: "https://github.com/microsoft/api-guidelines/blob/vNext/azure/Guidelines.md",
            type: "article",
          },
        ],
      }),
      step({
        slug: "auth",
        title: "Auth & sessions",
        summary: "Sessions, cookies, CSRF, and keeping credentials off the client.",
        estimatedMinutes: 150,
        learnings: [
          "Explain cookie flags that matter for auth",
          "Protect mutating routes with CSRF or equivalent",
          "Never store long-lived secrets in localStorage for first-party auth",
        ],
        practice: "Add a fake login that sets an httpOnly session cookie and a logout that clears it.",
        resources: [
          {
            title: "OWASP Authentication Cheat Sheet",
            url: "https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html",
            type: "docs",
          },
          {
            title: "web.dev: SameSite cookies explained",
            url: "https://web.dev/articles/samesite-cookies-explained",
            type: "article",
          },
        ],
      }),
      step({
        slug: "postgres",
        title: "Postgres & SQL",
        summary: "Schema design, SQL queries, and connecting Node to PostgreSQL.",
        estimatedMinutes: 180,
        learnings: [
          "Design tables with primary keys and foreign keys",
          "Write SELECT/INSERT/UPDATE queries safely",
          "Use parameterized queries to avoid SQL injection",
        ],
        practice: "Create a notes table and replace your in-memory store with Postgres queries.",
        resources: [
          {
            title: "PostgreSQL tutorial",
            url: "https://www.postgresql.org/docs/current/tutorial.html",
            type: "docs",
          },
          {
            title: "Prisma docs: Getting started",
            url: "https://www.prisma.io/docs/getting-started",
            type: "docs",
          },
        ],
      }),
      step({
        slug: "testing-apis",
        title: "Testing APIs",
        summary: "Smoke-test routes so regressions show up before deploy.",
        estimatedMinutes: 120,
        learnings: [
          "Write a few integration tests for happy paths and 400s",
          "Keep tests deterministic and fast",
          "Run tests in CI or at least before you merge",
        ],
        practice: "Add tests for creating a note and rejecting an empty title.",
        resources: [
          {
            title: "Vitest docs",
            url: "https://vitest.dev/guide/",
            type: "docs",
          },
          {
            title: "Testing HTTP APIs (overview)",
            url: "https://www.freecodecamp.org/news/how-to-test-api-endpoints/",
            type: "article",
          },
        ],
      }),
    ],
  },
  {
    slug: "cloud-engineering",
    name: "Cloud Engineering",
    level: "intermediate",
    summary: "Linux, containers, pipelines, and getting software to production.",
    weeks: 12,
    skillSlugs: ["linux", "docker", "git", "cloud"],
    steps: [
      step({
        slug: "linux",
        title: "Linux fundamentals",
        summary: "Shell navigation, processes, permissions, and basic server ops.",
        estimatedMinutes: 150,
        learnings: [
          "Manage files, permissions, and processes",
          "Read logs and inspect what a service is doing",
          "Use SSH to reach a remote machine safely",
        ],
        practice: "On a Linux VM or container, create a user, copy a file with scp/rsync concepts, and inspect a running process.",
        resources: [
          {
            title: "Linux Journey",
            url: "https://linuxjourney.com/",
            type: "course",
          },
          {
            title: "The Linux command line",
            url: "https://linuxcommand.org/tlcl.php",
            type: "article",
          },
        ],
      }),
      step({
        slug: "docker",
        title: "Docker",
        summary: "Images, containers, Compose, and packaging an app for deploy.",
        estimatedMinutes: 150,
        learnings: [
          "Write a Dockerfile for a simple app",
          "Run multi-service stacks with Compose",
          "Distinguish image vs container vs volume",
        ],
        practice: "Containerize a Node or static app and run it with docker compose up.",
        resources: [
          {
            title: "Docker Get Started",
            url: "https://docs.docker.com/get-started/",
            type: "docs",
          },
          {
            title: "Compose overview",
            url: "https://docs.docker.com/compose/",
            type: "docs",
          },
        ],
      }),
      step({
        slug: "ci-cd",
        title: "CI/CD",
        summary: "Automate tests and deploys with a simple pipeline.",
        estimatedMinutes: 120,
        learnings: [
          "Trigger a workflow on push or pull request",
          "Run lint/tests in CI before deploy",
          "Keep secrets in the CI secret store",
        ],
        practice: "Add a GitHub Actions workflow that installs dependencies and runs tests on every PR.",
        resources: [
          {
            title: "GitHub Actions: Quickstart",
            url: "https://docs.github.com/en/actions/get-started/quickstart",
            type: "docs",
          },
          {
            title: "What is CI/CD?",
            url: "https://about.gitlab.com/topics/ci-cd/",
            type: "article",
          },
        ],
      }),
      step({
        slug: "aws-path",
        title: "AWS essentials",
        summary: "Core AWS building blocks: compute, storage, networking, and deploys.",
        estimatedMinutes: 150,
        learnings: [
          "Identify when to use compute, storage, and networking services",
          "Deploy a simple app or static site on AWS",
          "Use IAM least privilege for a demo user/role",
        ],
        practice: "Deploy a static site or containerized hello-world on AWS and document the steps you took.",
        branchKey: "cloud-provider",
        resources: [
          {
            title: "AWS Cloud Essentials",
            url: "https://aws.amazon.com/getting-started/cloud-essentials/",
            type: "docs",
          },
        ],
      }),
      step({
        slug: "gcp-path",
        title: "GCP essentials",
        summary: "Core Google Cloud building blocks for shipping a small service.",
        estimatedMinutes: 150,
        learnings: [
          "Navigate GCP console projects and billing awareness",
          "Deploy a simple service or static site on GCP",
          "Apply least-privilege service accounts for demos",
        ],
        practice: "Deploy a hello-world service on GCP and write down the resources you created.",
        branchKey: "cloud-provider",
        resources: [
          {
            title: "Google Cloud skills boost",
            url: "https://www.cloudskillsboost.google/",
            type: "course",
          },
          {
            title: "GCP getting started",
            url: "https://cloud.google.com/docs/get-started",
            type: "docs",
          },
        ],
      }),
      step({
        slug: "observability",
        title: "Observability basics",
        summary: "Logs, metrics, and knowing something is wrong before users tell you.",
        estimatedMinutes: 90,
        learnings: [
          "Emit structured logs from an app",
          "Define one or two health/uptime checks",
          "Decide what you would alert on for a small service",
        ],
        practice: "Add request logging and a /health check to an app, then break it and watch the signals change.",
        resources: [
          {
            title: "Google SRE book: Monitoring distributed systems",
            url: "https://sre.google/sre-book/monitoring-distributed-systems/",
            type: "article",
          },
        ],
      }),
    ],
  },
  {
    slug: "go-services",
    name: "Go Services",
    level: "intermediate",
    summary: "Small, reliable HTTP services in Go — from syntax to deploy.",
    weeks: 9,
    skillSlugs: ["go", "apis", "docker"],
    steps: [
      step({
        slug: "syntax",
        title: "Go syntax & tooling",
        summary: "Go basics: packages, types, error handling, and tooling.",
        estimatedMinutes: 150,
        learnings: [
          "Write packages with exported vs unexported names",
          "Handle errors explicitly",
          "Use go fmt, go test, and go modules",
        ],
        practice: "Write a package with Add and must-handle error example; run go test.",
        resources: [
          {
            title: "A Tour of Go",
            url: "https://go.dev/tour/",
            type: "course",
          },
          {
            title: "Effective Go",
            url: "https://go.dev/doc/effective_go",
            type: "docs",
          },
        ],
      }),
      step({
        slug: "concurrency",
        title: "Concurrency",
        summary: "Goroutines, channels, and safe concurrent patterns.",
        estimatedMinutes: 150,
        learnings: [
          "Start goroutines and wait for them safely",
          "Use channels for coordination, not as a default global bus",
          "Avoid data races with the race detector",
        ],
        practice: "Fetch several URLs concurrently and collect results without a race.",
        resources: [
          {
            title: "Go concurrency patterns",
            url: "https://go.dev/blog/pipelines",
            type: "article",
          },
          {
            title: "Tour: Concurrency",
            url: "https://go.dev/tour/concurrency/1",
            type: "course",
          },
        ],
      }),
      step({
        slug: "http",
        title: "HTTP services",
        summary: "Build HTTP handlers, middleware, and JSON APIs in Go.",
        estimatedMinutes: 150,
        learnings: [
          "Register routes and return JSON",
          "Add middleware for logging or auth stubs",
          "Structure handlers so business logic stays testable",
        ],
        practice: "Build GET /health and POST /echo JSON endpoints with tests.",
        resources: [
          {
            title: "net/http package",
            url: "https://pkg.go.dev/net/http",
            type: "docs",
          },
          {
            title: "Writing Web Applications",
            url: "https://go.dev/doc/articles/wiki/",
            type: "article",
          },
        ],
      }),
      step({
        slug: "deploy",
        title: "Container deploy",
        summary: "Containerize a Go service and run it in a simple production-like setup.",
        estimatedMinutes: 120,
        learnings: [
          "Build a small Docker image for a Go binary",
          "Pass config through environment variables",
          "Document how someone else can run your service",
        ],
        practice: "Dockerize your HTTP service and run it with a published port.",
        resources: [
          {
            title: "Go Docker guide",
            url: "https://docs.docker.com/language/golang/",
            type: "docs",
          },
        ],
      }),
      step({
        slug: "resilience",
        title: "Resilience basics",
        summary: "Timeouts, context cancellation, and failing closed when dependencies die.",
        estimatedMinutes: 90,
        learnings: [
          "Pass context.Context through handlers and clients",
          "Set timeouts on outbound calls",
          "Return useful errors when a dependency is down",
        ],
        practice: "Add a context timeout to an outbound HTTP call and assert it cancels.",
        resources: [
          {
            title: "Go blog: Context",
            url: "https://go.dev/blog/context",
            type: "article",
          },
        ],
      }),
    ],
  },
  {
    slug: "system-design",
    name: "System Design",
    level: "advanced",
    summary: "Scaling, tradeoffs, and how large systems are shaped.",
    weeks: 10,
    skillSlugs: ["system-design", "sql", "apis"],
    steps: [
      step({
        slug: "foundations",
        title: "Foundations",
        summary: "Latency, throughput, consistency, and how to frame design problems.",
        estimatedMinutes: 120,
        learnings: [
          "Clarify requirements and constraints before drawing boxes",
          "Estimate rough traffic and storage needs",
          "Separate functional requirements from non-functional ones",
        ],
        practice: "Pick a familiar app (URL shortener or chat) and write requirements + capacity guesses for 1M users.",
        resources: [
          {
            title: "System Design Primer",
            url: "https://github.com/donnemartin/system-design-primer",
            type: "article",
          },
          {
            title: "ByteByteGo: Getting started",
            url: "https://bytebytego.com/courses/system-design-interview/getting-started",
            type: "article",
          },
        ],
      }),
      step({
        slug: "scaling",
        title: "Scaling patterns",
        summary: "Caching, load balancing, sharding, and growth patterns.",
        estimatedMinutes: 150,
        learnings: [
          "Choose between vertical and horizontal scale",
          "Place caches without making correctness worse",
          "Explain when sharding helps and when it hurts",
        ],
        practice: "Draw a design for a read-heavy feed with cache + DB and list three failure modes.",
        resources: [
          {
            title: "Caching overview",
            url: "https://aws.amazon.com/caching/",
            type: "docs",
          },
          {
            title: "Load balancing concepts",
            url: "https://www.nginx.com/resources/glossary/load-balancing/",
            type: "article",
          },
        ],
      }),
      step({
        slug: "tradeoffs",
        title: "Tradeoffs",
        summary: "Consistency, queues vs sync calls, and choosing boring tech.",
        estimatedMinutes: 120,
        learnings: [
          "Talk through consistency vs availability tradeoffs",
          "Decide when async queues beat sync request chains",
          "Prefer simple designs you can operate",
        ],
        practice: "Rewrite your feed design with a queue for fan-out and list what you gained/lost.",
        resources: [
          {
            title: "CAP Twelve Years Later",
            url: "https://www.infoq.com/articles/cap-twelve-years-later-how-the-rules-have-changed/",
            type: "article",
          },
        ],
      }),
      step({
        slug: "data-modeling",
        title: "Data modeling at scale",
        summary: "Indexes, access patterns, and designing storage around how you query.",
        estimatedMinutes: 120,
        learnings: [
          "Design tables/collections from access patterns",
          "Know what an index buys you and costs you",
          "Avoid premature denormalization without a query reason",
        ],
        practice: "For a URL shortener, write the read/write paths and the schema/indexes you would use.",
        resources: [
          {
            title: "Use the Index, Luke",
            url: "https://use-the-index-luke.com/",
            type: "article",
          },
        ],
      }),
      step({
        slug: "case-studies",
        title: "Case studies",
        summary: "Walk through real designs and practice explaining your choices.",
        estimatedMinutes: 180,
        learnings: [
          "Present a design in 20–30 minutes with clear tradeoffs",
          "Defend choices with constraints, not buzzwords",
          "Leave room for iteration and monitoring",
        ],
        practice: "Record yourself (or write a walkthrough) designing a URL shortener end-to-end.",
        resources: [
          {
            title: "System Design Primer: solutions",
            url: "https://github.com/donnemartin/system-design-primer#system-design-interview-questions-with-solutions",
            type: "article",
          },
          {
            title: "AWS Architecture Center",
            url: "https://aws.amazon.com/architecture/",
            type: "docs",
          },
        ],
      }),
    ],
  },
];

export function roadmapBySlug(slug: string): StarterRoadmap | null {
  return STARTER_ROADMAPS.find((roadmap) => roadmap.slug === slug) ?? null;
}

export function stepBySlug(
  roadmap: StarterRoadmap,
  stepSlug: string,
): RoadmapStepSeed | null {
  return roadmap.steps.find((step) => step.slug === stepSlug) ?? null;
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

export function matchedSkillSlugs(
  roadmapSkillSlugs: readonly string[],
  userSkillSlugs: readonly string[],
): string[] {
  const selected = new Set(userSkillSlugs);
  return roadmapSkillSlugs.filter((slug) => selected.has(slug));
}

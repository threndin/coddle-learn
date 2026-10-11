import type { StarterProject } from "./projects.js";

export const STARTER_PROJECTS: readonly StarterProject[] = [
  {
    slug: "single-page-cv",
    title: "Single-Page CV",
    summary: "Create a single-page HTML CV to showcase your career history.",
    level: "beginner",
    primarySkillSlug: "html",
    skillSlugs: ["html"],
    roadmapSlug: "frontend-developer",
    roadmapStepSlug: "html",
    courseSlug: "html-css-foundations",
    estimatedHours: 2,
    exampleImageUrl: "/projects/single-page-cv.jpg",
    checklist: [
      "Semantically correct HTML structure",
      "Single-page layout with education, skills, and career history",
      "SEO meta tags in the head",
      "Open Graph tags for social sharing",
      "A favicon linked in the head",
    ],
    body: `## Goal

Build a single-page CV using **only HTML**. Focus on clean document structure and basic SEO — styling comes in a later project.

Your page should introduce you, then lay out education, skills, and career history in a semantic way that is ready for CSS later.

## Requirements

### Semantic HTML
Use appropriate tags such as \`header\`, \`main\`, \`section\`, \`article\`, headings, and lists so the content has a meaningful structure.

### SEO meta tags
Include essential meta tags in the \`head\` (charset, viewport, description, and a clear title).

### Open Graph tags
Add OG tags so the page looks good when shared on social platforms.

### Favicon
Link a favicon in the \`head\`.

## Tips

- Keep everything on one page — no multi-page navigation yet.
- Prefer real placeholder content over empty sections.
- Validate your HTML before you submit.
`,
  },
  {
    slug: "basic-html-website",
    title: "Basic HTML Website",
    summary: "Create a simple multi-page website using only HTML.",
    level: "beginner",
    primarySkillSlug: "html",
    skillSlugs: ["html"],
    roadmapSlug: "frontend-developer",
    roadmapStepSlug: "html",
    courseSlug: "html-css-foundations",
    estimatedHours: 3,
    exampleImageUrl: "/projects/basic-html-website.jpg",
    checklist: [
      "At least three linked HTML pages",
      "Shared navigation on every page",
      "Semantic landmarks on each page",
      "Working relative links between pages",
      "Consistent page titles and meta descriptions",
    ],
    body: `## Goal

Build a small multi-page site with plain HTML: a home page, an about page, and a contact page.

## Requirements

- Separate HTML files linked with relative URLs
- A navigation list on every page
- Semantic structure (\`header\`, \`nav\`, \`main\`, \`footer\`)
- Distinct titles and meta descriptions per page
- A contact page with a simple HTML form (no backend required)
`,
  },
  {
    slug: "personal-portfolio",
    title: "Personal Portfolio",
    summary: "Convert a basic HTML site into a styled personal portfolio.",
    level: "beginner",
    primarySkillSlug: "css",
    skillSlugs: ["html", "css"],
    roadmapSlug: "frontend-developer",
    roadmapStepSlug: "css",
    courseSlug: "html-css-foundations",
    estimatedHours: 4,
    exampleImageUrl: "/projects/personal-portfolio.jpg",
    checklist: [
      "External stylesheet linked from HTML",
      "Hero section with name and role",
      "Projects section with at least three cards",
      "Responsive layout that works on mobile",
      "Consistent colors, spacing, and typography",
    ],
    body: `## Goal

Take a simple HTML structure and style it into a personal portfolio with CSS.

## Requirements

- Separate CSS file (no inline styles except where needed for demos)
- Hero, about, projects, and contact sections
- Project cards with title, short description, and link
- Mobile-friendly layout using flexbox or grid
- Readable contrast and clear visual hierarchy
`,
  },
  {
    slug: "changelog-component",
    title: "Changelog Component",
    summary: "Create a changelog component for a product updates page.",
    level: "beginner",
    primarySkillSlug: "css",
    skillSlugs: ["html", "css"],
    roadmapSlug: "frontend-developer",
    roadmapStepSlug: "css",
    estimatedHours: 2,
    exampleImageUrl: "/projects/changelog-component.jpg",
    checklist: [
      "Version entries with date and title",
      "Grouped change types (added, fixed, changed)",
      "Clear visual timeline or list styling",
      "Keyboard-accessible structure",
      "Works without JavaScript",
    ],
    body: `## Goal

Design a changelog UI that presents product updates clearly.

## Requirements

- At least five version entries
- Labels for Added / Fixed / Changed
- Spacing and typography that make scanning easy
- Pure HTML + CSS
`,
  },
  {
    slug: "testimonial-cards",
    title: "Testimonial Cards",
    summary: "Create testimonial cards for a landing page.",
    level: "beginner",
    primarySkillSlug: "css",
    skillSlugs: ["html", "css"],
    roadmapSlug: "frontend-developer",
    roadmapStepSlug: "css",
    estimatedHours: 2,
    exampleImageUrl: "/projects/testimonial-cards.jpg",
    checklist: [
      "At least three testimonial cards",
      "Avatar, name, role, and quote on each card",
      "Responsive card grid",
      "Consistent card elevation or border treatment",
      "Readable quote typography",
    ],
    body: `## Goal

Build a small testimonials section you could drop into a marketing page.

## Requirements

- Card layout with quote, person, and role
- Grid that stacks on small screens
- Placeholder avatars (images or initials)
- HTML + CSS only
`,
  },
  {
    slug: "accessible-form-ui",
    title: "Accessible Form UI",
    summary: "Create an accessible HTML form with labels and validation hints.",
    level: "beginner",
    primarySkillSlug: "accessibility",
    skillSlugs: ["html", "css", "accessibility"],
    roadmapSlug: "frontend-developer",
    roadmapStepSlug: "accessibility-polish",
    estimatedHours: 3,
    exampleImageUrl: "/projects/accessible-form-ui.jpg",
    checklist: [
      "Every control has an associated label",
      "Required fields are announced accessibly",
      "Error messages linked with aria-describedby",
      "Visible focus styles",
      "Works with keyboard only",
    ],
    body: `## Goal

Build a contact or signup form that meets basic accessibility expectations.

## Requirements

- Name, email, and message fields (plus one more of your choice)
- Explicit labels, not placeholder-only labeling
- Inline error messaging pattern (static demo is fine)
- Focus-visible styles
- Semantic form structure
`,
  },
  {
    slug: "rest-notes-api",
    title: "REST Notes API",
    summary: "Build a small notes API with create, list, and delete endpoints.",
    level: "intermediate",
    primarySkillSlug: "apis",
    skillSlugs: ["node", "apis", "javascript"],
    roadmapSlug: "node-backend",
    roadmapStepSlug: "apis",
    estimatedHours: 5,
    exampleImageUrl: "/projects/rest-notes-api.jpg",
    checklist: [
      "POST /notes creates a note",
      "GET /notes lists notes",
      "DELETE /notes/:id removes a note",
      "JSON request and response bodies",
      "README with run instructions",
    ],
    body: `## Goal

Implement a tiny Notes API with Node.js.

## Requirements

- In-memory or file-based storage is fine for v1
- Validate required fields and return useful status codes
- Include a README with setup and example curl commands
- Keep the surface small — quality over features
`,
  },
  {
    slug: "auth-session-api",
    title: "Session Auth API",
    summary: "Add register, login, and logout with cookie sessions.",
    level: "intermediate",
    primarySkillSlug: "auth",
    skillSlugs: ["node", "auth", "apis"],
    roadmapSlug: "node-backend",
    roadmapStepSlug: "auth",
    estimatedHours: 6,
    exampleImageUrl: "/projects/auth-session-api.jpg",
    checklist: [
      "Register and login endpoints",
      "HttpOnly session cookie",
      "Protected route that requires a session",
      "Logout clears the session",
      "Passwords are hashed (not stored plain)",
    ],
    body: `## Goal

Add cookie-based session auth to a small API.

## Requirements

- Register, login, logout, and one protected \`/me\` route
- Hash passwords before storing them
- Use secure cookie defaults appropriate for local development
- Document how to test the flow
`,
  },
];

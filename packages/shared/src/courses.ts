import type { ExperienceLevel } from "./onboarding.js";

export const LESSON_PROGRESS_STATUSES = ["completed", "skipped"] as const;
export type LessonProgressStatus = (typeof LESSON_PROGRESS_STATUSES)[number];

export function isLessonProgressStatus(
  value: unknown,
): value is LessonProgressStatus {
  return (
    typeof value === "string" &&
    (LESSON_PROGRESS_STATUSES as readonly string[]).includes(value)
  );
}

export const LESSON_COMPLETE_POINTS = 8;
export const COURSE_COMPLETE_POINTS = 30;

export function courseProgressPercent(doneCount: number, totalCount: number): number {
  if (totalCount <= 0) return 0;
  return Math.min(100, Math.round((doneCount / totalCount) * 100));
}

export type CourseLessonSeed = {
  slug: string;
  title: string;
  summary: string;
  estimatedMinutes: number;
  content: string;
};

export type CourseModuleSeed = {
  slug: string;
  title: string;
  summary: string;
  lessons: readonly CourseLessonSeed[];
};

export type StarterCourse = {
  slug: string;
  title: string;
  level: ExperienceLevel;
  summary: string;
  estimatedHours: number;
  /** Accent used when generating the R2 thumbnail SVG. */
  accent: string;
  skillSlugs: readonly string[];
  modules: readonly CourseModuleSeed[];
};

function lesson(partial: CourseLessonSeed): CourseLessonSeed {
  return partial;
}

function module(partial: CourseModuleSeed): CourseModuleSeed {
  return partial;
}

export const STARTER_COURSES: readonly StarterCourse[] = [
  {
    slug: "html-css-foundations",
    title: "HTML & CSS Foundations",
    level: "beginner",
    summary:
      "Build clean page structure and layout with semantic HTML and modern CSS, the base every frontend path needs.",
    estimatedHours: 12,
    accent: "#004CC8",
    skillSlugs: ["html", "css"],
    modules: [
      module({
        slug: "html-basics",
        title: "HTML basics",
        summary: "Documents, elements, links, images, and lists you can read and maintain.",
        lessons: [
          lesson({
            slug: "documents",
            title: "Documents and the DOM shape",
            summary: "What an HTML document is and how browsers turn markup into a tree.",
            estimatedMinutes: 40,
            content: `# Documents and the DOM shape

HTML describes **structure**, not appearance. The browser reads your file, builds a tree of nodes (the DOM), then paints the page.

## What each part does

| Piece | Role |
| --- | --- |
| \`<!DOCTYPE html>\` | Tells the browser to use modern HTML mode |
| \`<html lang="en">\` | Root element; \`lang\` helps screen readers and search |
| \`<head>\` | Metadata: charset, title, stylesheets, icons |
| \`<body>\` | Everything the user sees |

## Minimum page

\`\`\`html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Hello, Coddle</title>
  </head>
  <body>
    <h1>Hello, Coddle</h1>
    <p>This is my first structured page.</p>
  </body>
</html>
\`\`\`

Save it as \`index.html\` and open it in a browser. View source and confirm every tag you wrote is there.

## Head vs body

Put **machine-facing** info in \`<head>\` (charset, title, CSS links). Put **human-facing** content in \`<body>\`.

Common \`<head>\` tags:

\`\`\`html
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Ahiakwo John · Learning profile</title>
<link rel="stylesheet" href="styles.css" />
\`\`\`

The viewport meta tag matters on phones. Without it, mobile browsers may zoom the page as if it were a wide desktop layout.

## Block vs inline (quick mental model)

- **Block** elements (like \`<p>\`, \`<h1>\`, \`<div>\`) usually start on a new line and take full width.
- **Inline** elements (like \`<a>\`, \`<strong>\`, \`<span>\`) sit inside a line of text.

You will style these with CSS later. For now, pick elements for meaning, not for layout tricks.

## Nesting rules

Elements must open and close in order. This is wrong:

\`\`\`html
<p>Welcome to <strong>Coddle</p></strong>
\`\`\`

This is correct:

\`\`\`html
<p>Welcome to <strong>Coddle</strong></p>
\`\`\`

## Practice

Create \`index.html\` with:

1. A correct doctype, \`lang\`, charset, viewport, and title
2. An \`<h1>\` with your name
3. A short bio paragraph
4. An unordered list of 4 skills you want to learn

Open the file locally and check the heading outline in your browser's accessibility or inspector tools.
`,
          }),
          lesson({
            slug: "text-and-lists",
            title: "Text, lists, and emphasis",
            summary: "Write readable content with headings, paragraphs, and lists.",
            estimatedMinutes: 35,
            content: `# Text, lists, and emphasis

Most pages are mostly text. Good HTML keeps that text scannable.

## Headings form an outline

Use one \`<h1>\` for the page topic. Nest \`<h2>\` and \`<h3>\` under it like chapters.

\`\`\`html
<h1>Frontend foundations</h1>
<h2>HTML</h2>
<p>Structure first.</p>
<h2>CSS</h2>
<p>Presentation second.</p>
\`\`\`

Do not skip levels just to get a size you like (for example \`h1\` then \`h4\`). Size is a CSS job.

## Paragraphs and line breaks

- Use \`<p>\` for paragraphs.
- Prefer separate paragraphs over lots of \`<br>\` tags.
- Use \`<br>\` only for true line breaks inside the same unit (like a postal address).

## Emphasis

\`\`\`html
<p>
  Learn <strong>structure</strong> before polish.
  The deadline is <em>Friday</em>.
</p>
\`\`\`

- \`<strong>\` means importance
- \`<em>\` means stress or emphasis
- \`<b>\` and \`<i>\` are presentational; prefer the semantic tags unless you have a clear reason

## Lists

Unordered (bullets):

\`\`\`html
<ul>
  <li>HTML</li>
  <li>CSS</li>
  <li>JavaScript</li>
</ul>
\`\`\`

Ordered (steps):

\`\`\`html
<ol>
  <li>Write the markup</li>
  <li>Add CSS</li>
  <li>Test on a phone</li>
</ol>
\`\`\`

Description lists work well for terms and definitions:

\`\`\`html
<dl>
  <dt>DOM</dt>
  <dd>The tree of nodes the browser builds from your HTML.</dd>
  <dt>Semantic HTML</dt>
  <dd>Markup that tags meaning, not only boxes.</dd>
</dl>
\`\`\`

## Quotes and code in text

\`\`\`html
<blockquote>
  <p>Content is king, but structure is the throne.</p>
</blockquote>

<p>Use the <code>&lt;title&gt;</code> tag in every page.</p>

<pre><code>&lt;h1&gt;Hello&lt;/h1&gt;</code></pre>
\`\`\`
`,
          }),
          lesson({
            slug: "links-and-images",
            title: "Links and images",
            summary: "Connect pages and add media with accessible attributes.",
            estimatedMinutes: 40,
            content: `# Links and images

Links and images make a page feel like a real site. They also create common accessibility bugs if you rush them.

## Anchors

\`\`\`html
<a href="https://developer.mozilla.org/">MDN Web Docs</a>
<a href="/about.html">About</a>
<a href="#skills">Jump to skills</a>
<a href="mailto:hello@example.com">Email me</a>
\`\`\`

Rules of thumb:

- The link text should make sense out of context. Avoid "click here".
- Use absolute URLs for external sites and relative paths for your own files.
- \`target="_blank"\` should include \`rel="noreferrer noopener"\` when you use it.

\`\`\`html
<a href="https://www.coddle.dev" target="_blank" rel="noreferrer noopener">
  Coddle
</a>
\`\`\`

## Images

\`\`\`html
<img
  src="images/avatar.jpg"
  alt="Portrait of Ahiakwo John smiling"
  width="160"
  height="160"
/>
\`\`\`

- \`src\` is required
- \`alt\` describes the image for screen readers and when the file fails to load
- Decorative images can use \`alt=""\`
- Width and height help the browser reserve space and reduce layout jump

## Figures

When an image has a caption, wrap it:

\`\`\`html
<figure>
  <img src="images/layout-sketch.png" alt="Wireframe of a two-column profile page" />
  <figcaption>First sketch of the profile layout.</figcaption>
</figure>
\`\`\`

## Favicon (optional but nice)

\`\`\`html
<link rel="icon" href="/favicon.ico" />
\`\`\`

## Practice

On your profile page:

1. Add a profile photo (or a placeholder) with meaningful \`alt\` text
2. Link to MDN's HTML guide in a "Resources" section
3. Add an in-page link from the top to your skills list using an \`id\`
4. Open the page, click every link, and confirm none are broken
`,
          }),
          lesson({
            slug: "semantic-html",
            title: "Semantic HTML",
            summary: "Choose elements that communicate meaning to browsers and assistive tech.",
            estimatedMinutes: 45,
            content: `# Semantic HTML

Semantic HTML means picking elements for **what the content is**, not how you want it to look.

## Landmark elements

| Element | Use it for |
| --- | --- |
| \`<header>\` | Intro for the page or a section (logo, title, nav) |
| \`<nav>\` | Primary navigation links |
| \`<main>\` | The unique main content of the page (one per page) |
| \`<section>\` | A themed group of content with a heading |
| \`<article>\` | A self-contained piece (blog post, card that could stand alone) |
| \`<aside>\` | Side notes, related links, callouts |
| \`<footer>\` | Footer for the page or a section |

## A solid page skeleton

\`\`\`html
<body>
  <header>
    <p>Coddle Learn</p>
    <nav aria-label="Primary">
      <a href="/">Home</a>
      <a href="/courses.html">Courses</a>
    </nav>
  </header>

  <main>
    <article>
      <h1>HTML and CSS Foundations</h1>
      <p>A beginner path into structured pages.</p>

      <section>
        <h2>What you will build</h2>
        <p>A personal profile page with clean layout.</p>
      </section>
    </article>
  </main>

  <footer>
    <p>Built while learning on Coddle Learn.</p>
  </footer>
</body>
\`\`\`

## Div and span still matter

\`\`\`html
<div class="card">...</div>
<span class="badge">New</span>
\`\`\`

Use \`<div>\` and \`<span>\` when **no semantic element fits**. Do not wrap every paragraph in a div "just in case".

## Headings stay hierarchical

Inside each section, keep a clear heading tree. Screen reader users often navigate by headings.

Bad:

\`\`\`html
<div class="title">My course</div>
<div class="subtitle">Module 1</div>
\`\`\`

Better:

\`\`\`html
<h1>My course</h1>
<h2>Module 1</h2>
\`\`\`

## Why it matters

- Screen readers can jump by landmarks and headings
- Search engines understand the outline better
- Your future CSS and JavaScript have clearer hooks
- The HTML stays readable without class names
`,
          }),
        ],
      }),
      module({
        slug: "forms-and-tables",
        title: "Forms and tables",
        summary: "Collect input accessibly and present tabular data clearly.",
        lessons: [
          lesson({
            slug: "forms-basics",
            title: "Forms and labels",
            summary: "Build forms that people and browsers can both understand.",
            estimatedMinutes: 45,
            content: `# Forms and labels

Forms are how users send information. Accessible forms start with labels, not styling.

## Anatomy

\`\`\`html
<form action="/subscribe" method="post">
  <label for="email">Email</label>
  <input id="email" name="email" type="email" required autocomplete="email" />

  <label for="level">Experience level</label>
  <select id="level" name="level">
    <option value="beginner">Beginner</option>
    <option value="intermediate">Intermediate</option>
    <option value="advanced">Advanced</option>
  </select>

  <label for="goal">Learning goal</label>
  <textarea id="goal" name="goal" rows="4"></textarea>

  <button type="submit">Save preferences</button>
</form>
\`\`\`

## Label every control

Every input needs a connected label:

- \`for\` on the label matches \`id\` on the control, or
- Wrap the control inside the \`<label>\`

Placeholders are not labels. Placeholders disappear when the user types.

## Useful input types

| Type | Helps with |
| --- | --- |
| \`text\` | General short text |
| \`email\` | Email keyboards and basic validation |
| \`url\` | Website fields |
| \`password\` | Masked text |
| \`number\` | Numeric entry |
| \`checkbox\` | On/off choices |
| \`radio\` | One choice in a group |
| \`file\` | Uploads |

## Group related controls

\`\`\`html
<fieldset>
  <legend>Practice days</legend>
  <label><input type="checkbox" name="days" value="mon" /> Monday</label>
  <label><input type="checkbox" name="days" value="wed" /> Wednesday</label>
  <label><input type="checkbox" name="days" value="fri" /> Friday</label>
</fieldset>
\`\`\`

## Buttons

- \`type="submit"\` sends the form
- \`type="button"\` does nothing by itself (use with JavaScript later)
- \`type="reset"\` clears fields (use rarely; it surprises people)
`,
          }),
          lesson({
            slug: "tables-basics",
            title: "Tables for data",
            summary: "Use tables for data grids, not for page layout.",
            estimatedMinutes: 30,
            content: `# Tables for data

Use tables when you have rows and columns of **data**. Do not use tables to position a whole page layout.

## Basic table

\`\`\`html
<table>
  <caption>Weekly practice plan</caption>
  <thead>
    <tr>
      <th scope="col">Day</th>
      <th scope="col">Focus</th>
      <th scope="col">Minutes</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th scope="row">Monday</th>
      <td>HTML structure</td>
      <td>45</td>
    </tr>
    <tr>
      <th scope="row">Wednesday</th>
      <td>CSS box model</td>
      <td>40</td>
    </tr>
    <tr>
      <th scope="row">Friday</th>
      <td>Flexbox navbar</td>
      <td>50</td>
    </tr>
  </tbody>
</table>
\`\`\`

## Why scope and caption help

- \`<caption>\` names the table
- \`scope="col"\` and \`scope="row"\` tell assistive tech which header belongs to which cell

## When not to use a table

Page chrome (header, sidebar, footer) belongs in landmarks and CSS layout, not in \`<table>\`.
`,
          }),
        ],
      }),
      module({
        slug: "css-fundamentals",
        title: "CSS fundamentals",
        summary: "Selectors, the cascade, colors, typography, and the box model.",
        lessons: [
          lesson({
            slug: "css-selectors",
            title: "Selectors and the cascade",
            summary: "Target elements and understand which rule wins.",
            estimatedMinutes: 45,
            content: `# Selectors and the cascade

CSS attaches style rules to elements. The browser decides the winner with **cascade**, **specificity**, and **source order**.

## Link a stylesheet

\`\`\`html
<link rel="stylesheet" href="styles.css" />
\`\`\`

Keep CSS in a file early. Inline styles get hard to maintain.

## Core selectors

\`\`\`css
/* element */
p { line-height: 1.6; }

/* class (reuse often) */
.card { padding: 1rem; }

/* id (use sparingly) */
#main-nav { position: sticky; top: 0; }

/* descendant */
nav a { text-decoration: none; }

/* grouped */
h1, h2, h3 { font-family: Georgia, serif; }
\`\`\`

## Specificity in plain language

From lower to higher power (simplified):

1. Element selectors (\`p\`)
2. Classes, attributes, pseudo-classes (\`.card\`, \`:hover\`)
3. IDs (\`#hero\`)
4. Inline styles

When specificity ties, the **later** rule wins.

## Cascade layers you will feel

Author styles beat browser defaults. Your class usually beats an element rule. \`!important\` exists, but treat it as a last resort.

## Useful starter reset

\`\`\`css
*,
*::before,
*::after {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: system-ui, sans-serif;
  line-height: 1.5;
  color: #14213d;
  background: #f7f8fb;
}
\`\`\`

## Practice

Create \`styles.css\` and:

1. Set a readable body font and background
2. Style \`h1\` larger than \`h2\`
3. Add a \`.card\` class with padding and a border
4. Style links in \`nav\` differently from links in \`main\`
`,
          }),
          lesson({
            slug: "color-and-type",
            title: "Color and typography",
            summary: "Set a simple visual system with color, type, and spacing.",
            estimatedMinutes: 40,
            content: `# Color and typography

A small system beats one-off values. Pick a few tokens and reuse them.

## Custom properties

\`\`\`css
:root {
  --ink: #14213d;
  --muted: #5c6b8a;
  --brand: #004cc8;
  --surface: #ffffff;
  --border: #d7deea;
  --radius: 12px;
  --space: 1rem;
}

body {
  color: var(--ink);
  background: #f7f8fb;
}

a {
  color: var(--brand);
}
\`\`\`

## Color tips

- Body text needs strong contrast against the background
- Muted gray is for secondary text, not primary paragraphs
- Brand color works well for links and primary buttons
- Test dark text on light surfaces first; fancy gradients can wait

## Typography

\`\`\`css
h1, h2, h3 {
  line-height: 1.2;
  letter-spacing: -0.02em;
}

p {
  max-width: 65ch;
  color: var(--muted);
}

small {
  font-size: 0.875rem;
}
\`\`\`

\`max-width: 65ch\` keeps lines comfortable to read.

## Spacing rhythm

Prefer a small scale: \`0.5rem\`, \`1rem\`, \`1.5rem\`, \`2rem\`. Consistent gaps make a page feel intentional.

\`\`\`css
.stack > * + * {
  margin-top: var(--space);
}
\`\`\`
`,
          }),
          lesson({
            slug: "box-model",
            title: "The box model",
            summary: "Margin, border, padding, and content sizing without surprises.",
            estimatedMinutes: 45,
            content: `# The box model

Every element is a box. From inside out:

**content → padding → border → margin**

## content-box vs border-box

By default (\`content-box\`), \`width\` applies only to content. Padding and border add extra size.

With \`border-box\`, \`width\` includes padding and border. Layout math gets easier.

\`\`\`css
*,
*::before,
*::after {
  box-sizing: border-box;
}
\`\`\`

## Worked example

\`\`\`css
.card {
  width: 320px;
  padding: 16px;
  border: 2px solid var(--border);
  margin: 16px auto;
  background: var(--surface);
}
\`\`\`

With \`border-box\`, the card stays 320px wide including padding and border.

## Margin collapse

Vertical margins between sibling block elements can collapse into one gap. If spacing feels smaller than you expected, that is often why. Padding and borders do not collapse the same way.

## Display quick hits

- \`block\`: full-width boxes stacked vertically
- \`inline\`: sits in text flow; width/height usually ignored
- \`inline-block\`: sits in flow but accepts width/height
- \`none\`: removed from layout

## Debugging tip

Temporarily outline boxes while you learn:

\`\`\`css
* {
  outline: 1px solid rgb(0 76 200 / 0.25);
}
\`\`\`

Remove it when you finish.
`,
          }),
        ],
      }),
      module({
        slug: "css-layout",
        title: "CSS layout",
        summary: "Flexbox, responsive basics, and a small page you can ship.",
        lessons: [
          lesson({
            slug: "flexbox",
            title: "Flexbox layouts",
            summary: "Align and distribute items on one axis with confidence.",
            estimatedMinutes: 50,
            content: `# Flexbox layouts

Flexbox is ideal for rows and columns of related items: navbars, toolbars, card headers, button groups.

## Enable flex

\`\`\`css
.row {
  display: flex;
  gap: 1rem;
  align-items: center;
  justify-content: space-between;
}
\`\`\`

## Main axis vs cross axis

In a default row:

- **Main axis** runs left to right (\`justify-content\`)
- **Cross axis** runs top to bottom (\`align-items\`)

With \`flex-direction: column\`, those axes swap.

## Properties you will use constantly

| Property | Common values | Purpose |
| --- | --- | --- |
| \`justify-content\` | \`flex-start\`, \`center\`, \`space-between\` | Place items on the main axis |
| \`align-items\` | \`stretch\`, \`center\`, \`flex-start\` | Align on the cross axis |
| \`gap\` | \`0.5rem\`, \`1rem\` | Space between items |
| \`flex-wrap\` | \`wrap\` | Allow items onto new lines |
| \`flex\` | \`1\`, \`0 0 auto\` | Grow, shrink, and basis for a child |

## Navbar pattern

\`\`\`html
<header class="site-header">
  <p class="logo">Coddle Learn</p>
  <nav>
    <a href="#about">About</a>
    <a href="#skills">Skills</a>
    <a href="#plan">Plan</a>
  </nav>
</header>
\`\`\`

\`\`\`css
.site-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 1.25rem;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
}

.site-header nav {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}
\`\`\`

## Card header pattern

\`\`\`css
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}
\`\`\`
`,
          }),
          lesson({
            slug: "responsive-basics",
            title: "Responsive basics",
            summary: "Make layouts adapt with fluid widths and media queries.",
            estimatedMinutes: 40,
            content: `# Responsive basics

Responsive design means the page stays usable from phone to desktop without a separate mobile site.

## Fluid foundations

Prefer relative widths over fixed desktop pixels for page shells:

\`\`\`css
.container {
  width: min(100% - 2rem, 720px);
  margin-inline: auto;
}

img {
  max-width: 100%;
  height: auto;
  display: block;
}
\`\`\`

## Media queries

\`\`\`css
.skills {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

@media (min-width: 640px) {
  .skills {
    flex-direction: row;
    flex-wrap: wrap;
  }
}
\`\`\`

Mobile-first means you write the simple single-column rules first, then add enhancements for wider screens.

## Touch-friendly targets

Buttons and nav links should be easy to tap. Rough target: at least about 40px tall with enough spacing.

## Viewport reminder

Keep this in \`<head>\` or phones will scale incorrectly:

\`\`\`html
<meta name="viewport" content="width=device-width, initial-scale=1" />
\`\`\`

## Practice

1. Wrap your page content in a \`.container\`
2. Make images fluid
3. Stack the navbar links under the logo on small screens, then switch to a horizontal row from 640px up
4. Resize the browser from narrow to wide and fix anything that overflows
`,
          }),
          lesson({
            slug: "profile-page-project",
            title: "Project: profile page",
            summary: "Ship a small personal page that uses everything from this course.",
            estimatedMinutes: 60,
            content: `# Project: profile page

Build one page that proves you can structure content and lay it out cleanly.

## Goal

A personal learning profile with:

- Semantic landmarks
- About text, skills list, and weekly plan table
- A contact form
- CSS variables, card styling, and a flex header
- A layout that works on a phone-sized window

## Suggested structure

\`\`\`html
<header>…logo + nav…</header>
<main>
  <section id="about">…</section>
  <section id="skills">…</section>
  <section id="plan">…table…</section>
  <section id="contact">…form…</section>
</main>
<footer>…</footer>
\`\`\`

## Stretch goals

- Add a resources list with external links
- Style the submit button with a hover state
- Add a subtle card shadow **or** border (pick one, keep it calm)

The acceptance checklist is in the exercise below. Submit your page there when every item passes.
`,
          }),
        ],
      }),
    ],
  },
  {
    slug: "javascript-essentials",
    title: "JavaScript Essentials",
    level: "beginner",
    summary:
      "Values, functions, arrays, and the DOM: enough JS to make pages interactive and reason about bugs.",
    estimatedHours: 8,
    accent: "#0F766E",
    skillSlugs: ["javascript"],
    modules: [
      module({
        slug: "language-core",
        title: "Language core",
        summary: "Variables, types, and control flow you will use daily.",
        lessons: [
          lesson({
            slug: "values-and-types",
            title: "Values & types",
            summary: "Primitives, objects, and how equality works.",
            estimatedMinutes: 30,
            content: `# Values & types

JavaScript has primitives (\`string\`, \`number\`, \`boolean\`, \`null\`, \`undefined\`, \`bigint\`, \`symbol\`) and objects.

## Prefer modern bindings

\`\`\`js
const name = "Coddle";
let count = 0;
\`\`\`

## Practice

Write a function that accepts a user object and returns a greeting string. Handle a missing name safely.
`,
          }),
          lesson({
            slug: "functions",
            title: "Functions",
            summary: "Declare, call, and return values clearly.",
            estimatedMinutes: 35,
            content: `# Functions

Functions package reusable behavior.

\`\`\`js
function add(a, b) {
  return a + b;
}

const double = (n) => n * 2;
\`\`\`
`,
          }),
        ],
      }),
      module({
        slug: "dom-basics",
        title: "Talking to the page",
        summary: "Select elements, listen for events, update the UI.",
        lessons: [
          lesson({
            slug: "select-and-update",
            title: "Select & update the DOM",
            summary: "Find nodes and change text or classes.",
            estimatedMinutes: 35,
            content: `# Select & update the DOM

\`\`\`js
const button = document.querySelector("#save");
button?.addEventListener("click", () => {
  button.textContent = "Saved";
});
\`\`\`
`,
          }),
          lesson({
            slug: "arrays-and-lists",
            title: "Arrays & rendering lists",
            summary: "Map data into UI without hard-coding every item.",
            estimatedMinutes: 40,
            content: `# Arrays & rendering lists

\`\`\`js
const skills = ["HTML", "CSS", "JavaScript"];
const list = document.querySelector("#skills");

for (const skill of skills) {
  const li = document.createElement("li");
  li.textContent = skill;
  list?.append(li);
}
\`\`\`
`,
          }),
        ],
      }),
    ],
  },
  {
    slug: "react-fundamentals",
    title: "React Fundamentals",
    level: "intermediate",
    summary:
      "Components, props, state, and effects: build interactive UIs the way modern Learn surfaces are structured.",
    estimatedHours: 10,
    accent: "#B45309",
    skillSlugs: ["javascript", "typescript", "react"],
    modules: [
      module({
        slug: "components",
        title: "Components & props",
        summary: "Compose UI from small, reusable pieces.",
        lessons: [
          lesson({
            slug: "first-component",
            title: "Your first component",
            summary: "JSX, props, and one-way data flow.",
            estimatedMinutes: 35,
            content: `# Your first component

\`\`\`tsx
type BadgeProps = { label: string };

export function Badge({ label }: BadgeProps) {
  return <span className="badge">{label}</span>;
}
\`\`\`

Components receive **props** and return UI. Parents pass data down; children should not mutate that data.
`,
          }),
          lesson({
            slug: "lists-keys",
            title: "Lists & keys",
            summary: "Render collections safely.",
            estimatedMinutes: 30,
            content: `# Lists & keys

\`\`\`tsx
{modules.map((module) => (
  <ModuleRow key={module.slug} module={module} />
))}
\`\`\`

Keys should be stable identifiers (slug or id), not the array index when order can change.

## Practice

Render a module list from seed-like data with a unique key per row.
`,
          }),
        ],
      }),
      module({
        slug: "state-effects",
        title: "State & effects",
        summary: "Local state and synchronizing with the outside world.",
        lessons: [
          lesson({
            slug: "use-state",
            title: "useState",
            summary: "Remember values across renders.",
            estimatedMinutes: 40,
            content: `# useState

\`\`\`tsx
const [open, setOpen] = useState(false);
\`\`\`

Updating state schedules a re-render. Keep state as close as possible to the components that need it.

## Practice

Build a lesson panel that toggles open/closed and shows the selected lesson title.
`,
          }),
          lesson({
            slug: "use-effect",
            title: "useEffect basics",
            summary: "Run side effects after paint.",
            estimatedMinutes: 40,
            content: `# useEffect basics

Use effects for syncing with something outside React (document title, subscriptions, fetching).

\`\`\`tsx
useEffect(() => {
  document.title = lessonTitle;
}, [lessonTitle]);
\`\`\`

## Practice

When the selected lesson changes, update \`document.title\` to that lesson's title. Clean up nothing extra; keep the effect focused.
`,
          }),
        ],
      }),
    ],
  },
];

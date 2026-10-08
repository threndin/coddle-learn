import type { CourseExerciseSeed } from "./exercises.js";

/** Keyed by `courseSlug/moduleSlug/lessonSlug`. Every starter lesson has at least one. */
export const STARTER_EXERCISES: Readonly<Record<string, readonly CourseExerciseSeed[]>> = {
  "html-css-foundations/html-basics/documents": [
    {
      kind: "quiz",
      title: "Check: document anatomy",
      instructions: "Three quick questions on how an HTML document is put together.",
      estimatedMinutes: 5,
      questions: [
        {
          id: "head",
          prompt: "Which element holds metadata like the page title and character set?",
          options: [
            { id: "body", text: "<body>" },
            { id: "head", text: "<head>" },
            { id: "header", text: "<header>" },
          ],
          correctOptionId: "head",
          explanation:
            "<head> is for machine-facing info. <header> is a visible landmark inside <body>.",
        },
        {
          id: "viewport",
          prompt: "What does the viewport meta tag fix?",
          options: [
            { id: "zoom", text: "Phones rendering the page as a zoomed-out desktop layout" },
            { id: "fonts", text: "Fonts not loading on slow connections" },
            { id: "seo", text: "Search engines ignoring the page title" },
          ],
          correctOptionId: "zoom",
          explanation:
            "Without it, mobile browsers assume a wide desktop viewport and shrink the page to fit.",
        },
        {
          id: "nesting",
          prompt: "Which snippet is nested correctly?",
          options: [
            { id: "wrong", text: "<p>Welcome to <strong>Coddle</p></strong>" },
            { id: "right", text: "<p>Welcome to <strong>Coddle</strong></p>" },
          ],
          correctOptionId: "right",
          explanation: "Elements close in the reverse order they opened.",
        },
      ],
    },
  ],
  "html-css-foundations/html-basics/text-and-lists": [
    {
      kind: "task",
      title: "Give your profile page an outline",
      instructions: `Expand your profile page with headings, lists, and emphasis.

1. Add an \`<h2>\` for "About" and another for "Skills"
2. Put your bio under About as one or more paragraphs
3. Turn your skills into a \`<ul>\`
4. Add an ordered list called "This week" with three learning steps
5. Mark one important phrase with \`<strong>\``,
      estimatedMinutes: 20,
      hint: "Check the heading outline in DevTools (Accessibility panel) or a headings browser extension. Levels should go h1 → h2 without skipping.",
      requirements: [
        "The page has one h1, with About and Skills as h2s",
        "Skills are an unordered list",
        "\"This week\" is an ordered list with three items",
        "One phrase uses strong, not b",
        "No heading levels are skipped",
      ],
      solution: `\`\`\`html
<h1>Ada Learner</h1>

<h2>About</h2>
<p>I'm learning frontend development, <strong>one small project at a time</strong>.</p>

<h2>Skills</h2>
<ul>
  <li>HTML</li>
  <li>CSS</li>
</ul>

<h3>This week</h3>
<ol>
  <li>Finish the text and lists lesson</li>
  <li>Add links and images</li>
  <li>Start semantic HTML</li>
</ol>
\`\`\``,
    },
  ],
  "html-css-foundations/html-basics/links-and-images": [
    {
      kind: "quiz",
      title: "Check: links and images",
      instructions: "Three questions on writing links and images that work for everyone.",
      estimatedMinutes: 5,
      questions: [
        {
          id: "link-text",
          prompt: "Which link text is best for a link to MDN's HTML guide?",
          options: [
            { id: "click", text: "Click here" },
            { id: "descriptive", text: "MDN's HTML guide" },
            { id: "url", text: "https://developer.mozilla.org/en-US/docs/Web/HTML" },
          ],
          correctOptionId: "descriptive",
          explanation:
            "Screen reader users often jump between links out of context. The text alone should say where the link goes.",
        },
        {
          id: "decorative",
          prompt: "An image is purely decorative, a swirl behind a heading. What should its alt be?",
          options: [
            { id: "empty", text: "An empty alt attribute (alt=\"\")" },
            { id: "missing", text: "Leave the alt attribute off" },
            { id: "describe", text: "alt=\"Decorative swirl image\"" },
          ],
          correctOptionId: "empty",
          explanation:
            "Empty alt tells assistive tech to skip the image. A missing alt makes some screen readers read the file name instead.",
        },
        {
          id: "dimensions",
          prompt: "Why set width and height on an img?",
          options: [
            { id: "space", text: "The browser can reserve space, so the layout doesn't jump when the image loads" },
            { id: "quality", text: "It makes the image sharper" },
            { id: "required", text: "The image won't display without them" },
          ],
          correctOptionId: "space",
          explanation: "Known dimensions let the browser lay out the page before the image file arrives.",
        },
      ],
    },
  ],
  "html-css-foundations/html-basics/semantic-html": [
    {
      kind: "task",
      title: "Turn div soup into landmarks",
      instructions: `Rewrite a div-only page so its structure carries meaning.

1. Start from a page that only uses \`<div>\` (write one if you need to)
2. Replace the outer shell with \`header\`, \`nav\`, \`main\`, and \`footer\`
3. Group related content into \`section\` or \`article\`, each with a heading
4. Keep the visual look the same for now. CSS comes next.`,
      estimatedMinutes: 25,
      hint: "Ask of each `div`: is this the page intro, navigation, the main content, a self-contained piece, or the footer? If none fit, it can stay a `div`.",
      requirements: [
        "The page uses header, nav, main, and footer",
        "There is exactly one main element",
        "Every section or article starts with a heading",
        "The landmarks show up in the DevTools accessibility tree",
      ],
      solution: `\`\`\`html
<body>
  <header>
    <p>Coddle Learn</p>
    <nav aria-label="Primary">
      <a href="#about">About</a>
      <a href="#skills">Skills</a>
    </nav>
  </header>
  <main>
    <section id="about">
      <h2>About</h2>
      <p>…</p>
    </section>
    <section id="skills">
      <h2>Skills</h2>
      <ul>…</ul>
    </section>
  </main>
  <footer>
    <p>Built while learning on Coddle Learn.</p>
  </footer>
</body>
\`\`\``,
    },
  ],
  "html-css-foundations/forms-and-tables/forms-basics": [
    {
      kind: "link",
      title: "Share your learning profile form",
      instructions: `Build a **Learning profile** form, push it to GitHub (or a CodePen), and submit the link.

The form should collect:

1. Name (text)
2. Email (email, required)
3. Experience level (select)
4. Bio (textarea)
5. Practice days (checkboxes)
6. A submit button`,
      estimatedMinutes: 30,
      hint: "Click each label in the browser. If the matching control doesn't get focus, the `for` and `id` don't match.",
      requirements: [
        "Every control has a connected label",
        "The email field uses type=\"email\" and is required",
        "The practice-day checkboxes sit in a fieldset with a legend",
        "The submit button uses type=\"submit\"",
      ],
    },
  ],
  "html-css-foundations/forms-and-tables/tables-basics": [
    {
      kind: "task",
      title: "Add a practice log table",
      instructions: `Add a table to your profile page that logs three practice sessions.

Each row needs the day, the topic, and the minutes spent. Give the table a caption and real header cells so it reads well with a screen reader.`,
      estimatedMinutes: 15,
      hint: "Use `th scope=\"col\"` for the column headings and `th scope=\"row\"` for the day at the start of each row.",
      requirements: [
        "The table has a caption",
        "Column headings sit in thead and use th with scope=\"col\"",
        "Each row starts with a th using scope=\"row\"",
        "There are three practice sessions in tbody",
        "The table holds data only, not page layout",
      ],
      solution: `\`\`\`html
<table>
  <caption>Practice log</caption>
  <thead>
    <tr>
      <th scope="col">Day</th>
      <th scope="col">Topic</th>
      <th scope="col">Minutes</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th scope="row">Monday</th>
      <td>Forms</td>
      <td>30</td>
    </tr>
    <tr>
      <th scope="row">Wednesday</th>
      <td>Tables</td>
      <td>25</td>
    </tr>
    <tr>
      <th scope="row">Friday</th>
      <td>Review</td>
      <td>20</td>
    </tr>
  </tbody>
</table>
\`\`\``,
    },
  ],
  "html-css-foundations/css-fundamentals/css-selectors": [
    {
      kind: "quiz",
      title: "Check: which rule wins?",
      instructions: "Predict the winner before you pick. Specificity first, then source order.",
      estimatedMinutes: 5,
      questions: [
        {
          id: "class-vs-element",
          prompt:
            'p { color: gray; } and .intro { color: navy; } both match <p class="intro">. Which color wins?',
          options: [
            { id: "navy", text: "navy" },
            { id: "gray", text: "gray" },
            { id: "order", text: "Whichever rule is written last" },
          ],
          correctOptionId: "navy",
          explanation: "A class selector is more specific than an element selector, so order doesn't matter here.",
        },
        {
          id: "tie",
          prompt: "Two rules have exactly the same specificity. Which one applies?",
          options: [
            { id: "later", text: "The one that appears later in the CSS" },
            { id: "earlier", text: "The one that appears first" },
            { id: "shorter", text: "The one with fewer declarations" },
          ],
          correctOptionId: "later",
          explanation: "When specificity ties, source order decides and the later rule wins.",
        },
        {
          id: "most-specific",
          prompt: "Which selector is the most specific?",
          options: [
            { id: "descendant", text: "nav a" },
            { id: "class", text: ".card" },
            { id: "id", text: "#hero" },
          ],
          correctOptionId: "id",
          explanation: "IDs outrank classes, and classes outrank element selectors.",
        },
      ],
    },
  ],
  "html-css-foundations/css-fundamentals/color-and-type": [
    {
      kind: "link",
      title: "Share your design tokens",
      instructions: `Give your stylesheet a small visual system, then submit a link to it (GitHub repo, gist, or CodePen).

1. Define CSS variables on \`:root\` for ink, muted, brand, surface, and border
2. Style a \`.button\` class with the brand background and white text
3. Limit paragraph width using \`ch\`
4. Give \`.card\` a surface, border, radius, and padding that all come from your tokens`,
      estimatedMinutes: 25,
      hint: "If you catch yourself typing a hex color outside `:root`, turn it into a variable first.",
      requirements: [
        "Colors are defined once as custom properties on :root",
        ".button uses var(--brand) for its background",
        "Paragraphs have a max-width in ch",
        ".card takes its colors and radius from variables",
        "Body text has strong contrast against the background",
      ],
    },
  ],
  "html-css-foundations/css-fundamentals/box-model": [
    {
      kind: "task",
      title: "Build a profile card",
      instructions: `Build a profile card using the box model on purpose.

Set \`box-sizing: border-box\` globally first, then style a \`.card\` and confirm its size in DevTools.`,
      estimatedMinutes: 20,
      hint: "In DevTools, select the card and open the Computed panel. The box diagram shows content, padding, border, and margin separately.",
      requirements: [
        "The card's max width is around 360px",
        "The card has 1.25rem of padding",
        "The card has a 1px border and rounded corners",
        "The card is centered horizontally with margin",
        "The total width is confirmed in the DevTools Computed panel",
      ],
      solution: `\`\`\`css
*,
*::before,
*::after {
  box-sizing: border-box;
}

.card {
  max-width: 360px;
  margin: 2rem auto;
  padding: 1.25rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
}
\`\`\``,
    },
  ],
  "html-css-foundations/css-layout/flexbox": [
    {
      kind: "link",
      title: "Share your flexbox navbar",
      instructions: `Build a site header with flexbox and submit a link to it (GitHub repo, gist, or CodePen).

The logo sits on the left and the links on the right, all vertically centered. When the window gets narrow, the links should wrap instead of overflowing.`,
      estimatedMinutes: 25,
      hint: "Two flex containers: the header (logo vs nav, `justify-content: space-between`) and the nav itself (`flex-wrap: wrap` with a `gap`).",
      requirements: [
        "The header uses display: flex",
        "The logo is on the left and the links on the right",
        "Items are vertically centered with align-items",
        "Links are spaced with gap, not margins on each link",
        "Links wrap on a narrow window instead of overflowing",
      ],
    },
  ],
  "html-css-foundations/css-layout/responsive-basics": [
    {
      kind: "quiz",
      title: "Check: responsive basics",
      instructions: "Three questions on making layouts work from phone to desktop.",
      estimatedMinutes: 5,
      questions: [
        {
          id: "mobile-first",
          prompt: "What does mobile-first CSS mean?",
          options: [
            {
              id: "base",
              text: "Write the simple single-column styles first, then add min-width media queries for wider screens",
            },
            { id: "separate", text: "Build a separate mobile site and redirect phones to it" },
            { id: "max", text: "Write desktop styles first, then override them with max-width queries" },
          ],
          correctOptionId: "base",
          explanation:
            "Small screens get the lean base styles, and wider screens add layout on top as space allows.",
        },
        {
          id: "fluid-image",
          prompt: "Which rule stops images from overflowing a narrow container?",
          options: [
            { id: "max-width", text: "img { max-width: 100%; height: auto; }" },
            { id: "width", text: "img { width: 800px; }" },
            { id: "overflow", text: "body { overflow: hidden; }" },
          ],
          correctOptionId: "max-width",
          explanation:
            "max-width: 100% lets an image shrink with its container, and height: auto keeps its proportions.",
        },
        {
          id: "viewport",
          prompt: "Your media queries never fire on a real phone, but they work when you resize the desktop browser. What's the likely cause?",
          options: [
            { id: "meta", text: "The viewport meta tag is missing from the head" },
            { id: "order", text: "The media queries come before the base styles" },
            { id: "units", text: "The breakpoints use px instead of em" },
          ],
          correctOptionId: "meta",
          explanation:
            "Without the viewport tag, phones pretend to be about 980px wide, so small-screen breakpoints never match.",
        },
      ],
    },
  ],
  "html-css-foundations/css-layout/profile-page-project": [
    {
      kind: "link",
      title: "Submit your profile page",
      instructions: `Ship the profile page and submit a link to it. A GitHub repo works; a live URL (GitHub Pages, Netlify, Vercel) is even better.

Walk the requirements out loud before you submit. If one fails, fix that one thing before adding new decoration.`,
      estimatedMinutes: 90,
      requirements: [
        "Valid landmark structure (header, nav, main, footer)",
        "One h1 and logical h2 sections",
        "Every form control has a label",
        "Images have useful alt text (or empty alt if decorative)",
        "CSS lives in an external file with variables",
        "The box model uses border-box",
        "The header uses flexbox",
        "The page is readable at about 360px wide",
        "No layout tables",
      ],
    },
  ],
  "javascript-essentials/language-core/values-and-types": [
    {
      kind: "text",
      title: "Explain == vs ===",
      instructions: `In your own words, explain the difference between \`==\` and \`===\` in JavaScript.

Include:

- What each operator checks
- One example where they give different results
- Which one you'll default to, and why`,
      estimatedMinutes: 10,
      hint: "Try `0 == \"\"` and `0 === \"\"` in your browser console.",
      solution: `\`===\` (strict equality) compares value **and** type without converting anything. \`==\` (loose equality) converts the operands to a common type first.

\`\`\`js
0 == "";   // true: "" becomes 0
0 === "";  // false: number vs string
\`\`\`

Default to \`===\`. The conversion rules behind \`==\` are easy to get wrong, and strict checks make intent obvious.`,
    },
  ],
  "javascript-essentials/language-core/functions": [
    {
      kind: "text",
      title: "Write formatMinutes",
      instructions: `Write a function \`formatMinutes(total)\` that turns a number of minutes into a short label, then paste your code below.

\`\`\`js
formatMinutes(80);  // "1h 20m"
formatMinutes(45);  // "45m"
formatMinutes(120); // "2h"
\`\`\`

Under the code, add one sentence on how you handled the cases where there are no hours or no leftover minutes.`,
      estimatedMinutes: 15,
      hint: "`Math.floor(total / 60)` gives the hours and `total % 60` gives the leftover minutes.",
      solution: `\`\`\`js
function formatMinutes(total) {
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  if (hours === 0) return \`\${minutes}m\`;
  if (minutes === 0) return \`\${hours}h\`;
  return \`\${hours}h \${minutes}m\`;
}
\`\`\`

Return early for the two edge cases so the main path stays simple.`,
    },
  ],
  "javascript-essentials/dom-basics/select-and-update": [
    {
      kind: "link",
      title: "Share your counter",
      instructions: `Build a counter and submit a link to it (GitHub repo, gist, or CodePen).

Show a number with two buttons: one adds 1 and the other subtracts 1. Keep the count in a variable and update the page from it.`,
      estimatedMinutes: 20,
      hint: "Select the elements once at the top with `document.querySelector`, then write a small `render()` function that sets `textContent` from your count.",
      requirements: [
        "The count is stored in a JavaScript variable",
        "Both buttons use addEventListener, not inline onclick",
        "The displayed number updates with textContent",
        "The page doesn't reload when a button is clicked",
      ],
    },
  ],
  "javascript-essentials/dom-basics/arrays-and-lists": [
    {
      kind: "link",
      title: "Share your todo list",
      instructions: `Build a small todo list and submit a link (GitHub repo, gist, or CodePen).

1. Render the starting todos from an array
2. Add a form with a text input and an Add button
3. When the form submits, push the new item and render it`,
      estimatedMinutes: 30,
      hint: "Call `event.preventDefault()` in the submit handler, or the page reloads and your new item disappears.",
      requirements: [
        "Todos render from an array, not hard-coded HTML",
        "Submitting the form adds a new item without reloading the page",
        "Empty input is ignored",
      ],
    },
  ],
  "react-fundamentals/components/first-component": [
    {
      kind: "task",
      title: "Build a CourseCard component",
      instructions: `Build a \`CourseCard\` component that takes \`title\`, \`level\`, and \`summary\` props and renders them.

Render it at least twice from a parent with different data, so you can see the same component show different content.`,
      estimatedMinutes: 20,
      hint: "Type the props first (`type CourseCardProps = { … }`), then destructure them in the function signature.",
      requirements: [
        "CourseCard has typed props for title, level, and summary",
        "The component returns JSX and doesn't change its props",
        "A parent renders at least two CourseCards with different data",
      ],
      solution: `\`\`\`tsx
type CourseCardProps = {
  title: string;
  level: "beginner" | "intermediate" | "advanced";
  summary: string;
};

export function CourseCard({ title, level, summary }: CourseCardProps) {
  return (
    <article className="card">
      <p className="badge">{level}</p>
      <h3>{title}</h3>
      <p>{summary}</p>
    </article>
  );
}

export function Catalog() {
  return (
    <>
      <CourseCard title="HTML & CSS Foundations" level="beginner" summary="Structure and style." />
      <CourseCard title="React Fundamentals" level="intermediate" summary="Components and state." />
    </>
  );
}
\`\`\``,
    },
  ],
  "react-fundamentals/components/lists-keys": [
    {
      kind: "quiz",
      title: "Check: keys",
      instructions: "Keys are small but easy to get wrong. Two questions.",
      estimatedMinutes: 5,
      questions: [
        {
          id: "best-key",
          prompt: "You render a list of modules that learners can reorder. What's the best key?",
          options: [
            { id: "slug", text: "module.slug" },
            { id: "index", text: "The array index" },
            { id: "random", text: "Math.random()" },
          ],
          correctOptionId: "slug",
          explanation:
            "A stable id keeps React matching the same item across renders. Indexes shift when order changes; random keys change every render.",
        },
        {
          id: "purpose",
          prompt: "What do keys help React do?",
          options: [
            { id: "identify", text: "Match list items between renders so state stays with the right item" },
            { id: "style", text: "Apply CSS to each item" },
            { id: "sort", text: "Sort the list automatically" },
          ],
          correctOptionId: "identify",
          explanation:
            "Without a stable key, React can reuse the wrong component for an item and its local state follows the position instead of the data.",
        },
      ],
    },
  ],
  "react-fundamentals/state-effects/use-state": [
    {
      kind: "quiz",
      title: "Check: useState",
      instructions: "Three questions on how state updates and re-renders behave.",
      estimatedMinutes: 5,
      questions: [
        {
          id: "rerender",
          prompt: "What happens when you call a state setter like setOpen(true)?",
          options: [
            { id: "schedule", text: "React schedules a re-render with the new value" },
            { id: "immediate", text: "The open variable changes immediately on the next line" },
            { id: "nothing", text: "Nothing, until the page is refreshed" },
          ],
          correctOptionId: "schedule",
          explanation:
            "The variable keeps its old value for the rest of this render. The new value appears on the next render.",
        },
        {
          id: "updater",
          prompt: "You call setCount(count + 1) twice in one click handler, starting from 0. What is count after the re-render?",
          options: [
            { id: "one", text: "1" },
            { id: "two", text: "2" },
            { id: "zero", text: "0" },
          ],
          correctOptionId: "one",
          explanation:
            "Both calls read the same count (0) from this render. Use setCount((c) => c + 1) when the next value depends on the previous one.",
        },
        {
          id: "placement",
          prompt: "Two sibling components both need the selected lesson. Where should that state live?",
          options: [
            { id: "parent", text: "In their closest common parent, passed down as props" },
            { id: "both", text: "In each sibling, kept in sync with effects" },
            { id: "global", text: "In a global variable outside React" },
          ],
          correctOptionId: "parent",
          explanation: "Lift state to the nearest shared parent so there is one source of truth.",
        },
      ],
    },
  ],
  "react-fundamentals/state-effects/use-effect": [
    {
      kind: "text",
      title: "When do you need an effect?",
      instructions: `Describe, in a few sentences, when \`useEffect\` is the right tool and when it isn't.

Give one example of each.`,
      estimatedMinutes: 10,
      hint: "Effects are for syncing with something outside React. If you could compute it during render, you probably don't need an effect.",
      solution: `Use an effect to sync with something **outside** React: updating \`document.title\`, subscribing to a websocket, or starting a timer.

Skip it for values you can compute while rendering. For example, a filtered list should be derived directly from state and props, not stored in extra state and updated in an effect.`,
    },
  ],
};

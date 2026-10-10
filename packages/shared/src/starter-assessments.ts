import type { AssessmentSeed } from "./assessments.js";

/** Keyed by course slug. Every starter course gets a final assessment. */
export const STARTER_ASSESSMENTS: Readonly<Record<string, AssessmentSeed>> = {
  "html-css-foundations": {
    title: "HTML & CSS Foundations — final assessment",
    summary:
      "Prove you can structure pages, style them with modern CSS, and make layouts that hold up on different screen sizes.",
    passPercent: 80,
    timeLimitMinutes: 30,
    questions: [
      {
        kind: "multiple_choice",
        prompt: "Which element is the correct place for the page title shown in a browser tab?",
        options: [
          { id: "h1", text: "<h1>" },
          { id: "title", text: "<title> inside <head>" },
          { id: "header", text: "<header>" },
          { id: "caption", text: "<caption>" },
        ],
        correctOptionId: "title",
        explanation: "The document title lives in <head>. <h1> is the visible page heading.",
      },
      {
        kind: "true_false",
        prompt: "Skipping heading levels (for example h1 → h3) is fine if the visual size looks right.",
        correctOptionId: "false",
        explanation: "Heading levels should reflect document structure, not font size alone.",
      },
      {
        kind: "multiple_choice",
        prompt: "What does `box-sizing: border-box` change?",
        options: [
          { id: "margin", text: "Margins are included in width calculations" },
          { id: "padding", text: "Padding and border are included inside the declared width" },
          { id: "flex", text: "Flex items stop shrinking" },
          { id: "float", text: "Floats are disabled" },
        ],
        correctOptionId: "padding",
        explanation: "With border-box, width includes padding and border, which makes layouts easier to reason about.",
      },
      {
        kind: "short_answer",
        prompt: "Which CSS display value turns an element into a flex container? (one word)",
        acceptedAnswers: ["flex"],
        explanation: "`display: flex` creates a flex formatting context for its children.",
      },
      {
        kind: "multiple_choice",
        prompt: "Which media-query idea best matches “styles for narrower viewports”?",
        options: [
          { id: "min", text: "min-width breakpoints that add styles as the screen grows" },
          { id: "max", text: "Only max-height queries" },
          { id: "print", text: "print media only" },
          { id: "hover", text: "hover media only" },
        ],
        correctOptionId: "min",
        explanation: "Mobile-first CSS usually starts simple, then uses min-width to layer on layout for larger screens.",
      },
      {
        kind: "true_false",
        prompt: "Alt text should describe the purpose of an image when the image carries meaning.",
        correctOptionId: "true",
        explanation: "Meaningful images need alt text; decorative images can use empty alt.",
      },
    ],
  },
  "javascript-essentials": {
    title: "JavaScript Essentials — final assessment",
    summary: "Check that you can work with values, functions, arrays, and basic DOM updates.",
    passPercent: 80,
    timeLimitMinutes: 25,
    questions: [
      {
        kind: "multiple_choice",
        prompt: "Which binding should you prefer for a value that will not be reassigned?",
        options: [
          { id: "var", text: "var" },
          { id: "let", text: "let" },
          { id: "const", text: "const" },
          { id: "static", text: "static" },
        ],
        correctOptionId: "const",
        explanation: "`const` prevents reassignment and makes intent clearer. Use `let` when the binding must change.",
      },
      {
        kind: "true_false",
        prompt: "`===` compares values without type coercion.",
        correctOptionId: "true",
        explanation: "Strict equality avoids the surprising conversions that `==` performs.",
      },
      {
        kind: "short_answer",
        prompt: "What method adds one or more elements to the end of an array? (method name only)",
        acceptedAnswers: ["push"],
        explanation: "`array.push(item)` appends and returns the new length.",
      },
      {
        kind: "multiple_choice",
        prompt: "Which call selects the first element matching a CSS selector?",
        options: [
          { id: "all", text: "document.querySelectorAll(...)" },
          { id: "one", text: "document.querySelector(...)" },
          { id: "id", text: "document.getElementsByClassName(...)" },
          { id: "tag", text: "document.write(...)" },
        ],
        correctOptionId: "one",
        explanation: "`querySelector` returns the first match; `querySelectorAll` returns a list.",
      },
      {
        kind: "true_false",
        prompt: "Arrow functions always create their own `this` binding.",
        correctOptionId: "false",
        explanation: "Arrow functions inherit `this` from the surrounding scope.",
      },
    ],
  },
  "react-fundamentals": {
    title: "React Fundamentals — final assessment",
    summary: "Confirm you understand components, lists, state, and effects at a beginner level.",
    passPercent: 80,
    timeLimitMinutes: 25,
    questions: [
      {
        kind: "multiple_choice",
        prompt: "What must be unique among siblings when rendering a list?",
        options: [
          { id: "key", text: "The `key` prop" },
          { id: "ref", text: "The `ref` prop" },
          { id: "id", text: "An HTML id on every node" },
          { id: "index", text: "Nothing — array index is always enough" },
        ],
        correctOptionId: "key",
        explanation: "Stable keys help React match items across renders. Index keys are a last resort.",
      },
      {
        kind: "true_false",
        prompt: "`useState` lets a component remember values across renders.",
        correctOptionId: "true",
        explanation: "State survives re-renders; ordinary variables reset each render.",
      },
      {
        kind: "short_answer",
        prompt: "Which Hook runs side effects after paint? (name only, like useSomething)",
        acceptedAnswers: ["useEffect", "useeffect"],
        explanation: "`useEffect` is the Hook for synchronizing with external systems.",
      },
      {
        kind: "multiple_choice",
        prompt: "Why should you avoid mutating state objects directly?",
        options: [
          { id: "speed", text: "Mutation is slower than copying" },
          { id: "detect", text: "React may not detect the change and skip a re-render" },
          { id: "jsx", text: "JSX forbids object values" },
          { id: "hooks", text: "Hooks cannot return objects" },
        ],
        correctOptionId: "detect",
        explanation: "React compares state by identity. Mutating in place can hide updates.",
      },
      {
        kind: "true_false",
        prompt: "A component function should return one React element tree (or null).",
        correctOptionId: "true",
        explanation: "Components render UI by returning elements. Fragments let you group siblings.",
      },
    ],
  },
};

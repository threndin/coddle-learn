import { EditorSelection, type ChangeSpec } from "@codemirror/state";
import type { EditorView } from "@codemirror/view";

/** Wrap each selection in markers, or unwrap if it is already wrapped. */
export function toggleWrap(view: EditorView, before: string, after = before, placeholder = "text") {
  const { state } = view;
  const tr = state.changeByRange((range) => {
    const outerFrom = range.from - before.length;
    const outerTo = range.to + after.length;
    const wrapped =
      outerFrom >= 0 &&
      state.sliceDoc(outerFrom, range.from) === before &&
      state.sliceDoc(range.to, outerTo) === after;
    if (wrapped) {
      return {
        changes: [
          { from: outerFrom, to: range.from, insert: "" },
          { from: range.to, to: outerTo, insert: "" },
        ],
        range: EditorSelection.range(outerFrom, range.to - before.length),
      };
    }
    const text = state.sliceDoc(range.from, range.to) || placeholder;
    return {
      changes: { from: range.from, to: range.to, insert: `${before}${text}${after}` },
      range: EditorSelection.range(
        range.from + before.length,
        range.from + before.length + text.length,
      ),
    };
  });
  view.dispatch(state.update(tr, { scrollIntoView: true, userEvent: "input.format" }));
  view.focus();
  return true;
}

const LIST_PREFIX = /^(\s*)(?:[-*+]\s+\[[ xX]\]\s+|[-*+]\s+|\d+[.)]\s+)/;
const HEADING_PREFIX = /^#{1,6}\s+/;
const QUOTE_PREFIX = /^>\s?/;

type LineKind = "h2" | "h3" | "quote" | "bullet" | "ordered" | "task";

function prefixFor(kind: LineKind, index: number) {
  switch (kind) {
    case "h2":
      return "## ";
    case "h3":
      return "### ";
    case "quote":
      return "> ";
    case "bullet":
      return "- ";
    case "ordered":
      return `${index + 1}. `;
    case "task":
      return "- [ ] ";
  }
}

function matcherFor(kind: LineKind): RegExp {
  switch (kind) {
    case "h2":
      return /^##\s+/;
    case "h3":
      return /^###\s+/;
    case "quote":
      return QUOTE_PREFIX;
    case "bullet":
      return /^(\s*)[-*+]\s+(?!\[[ xX]\])/;
    case "ordered":
      return /^(\s*)\d+[.)]\s+/;
    case "task":
      return /^(\s*)[-*+]\s+\[[ xX]\]\s+/;
  }
}

/** Toggle a line-level format across every line touched by the selection. */
export function toggleLines(view: EditorView, kind: LineKind) {
  const { state } = view;
  const lines = new Map<number, { from: number; text: string }>();
  for (const range of state.selection.ranges) {
    const first = state.doc.lineAt(range.from).number;
    const last = state.doc.lineAt(range.to).number;
    for (let n = first; n <= last; n += 1) {
      const line = state.doc.line(n);
      lines.set(n, { from: line.from, text: line.text });
    }
  }
  const sorted = [...lines.values()].sort((a, b) => a.from - b.from);
  const matcher = matcherFor(kind);
  const allMatch = sorted.every((line) => matcher.test(line.text));
  const strip = kind === "h2" || kind === "h3" ? HEADING_PREFIX : kind === "quote" ? QUOTE_PREFIX : LIST_PREFIX;

  const changes: ChangeSpec[] = [];
  sorted.forEach((line, index) => {
    const existing = line.text.match(strip)?.[0] ?? "";
    const indent = kind === "h2" || kind === "h3" || kind === "quote" ? "" : (line.text.match(/^\s*/)?.[0] ?? "");
    const insert = allMatch ? indent : `${indent}${prefixFor(kind, index)}`;
    const removeLength = existing.length || (kind === "quote" ? 0 : indent.length);
    changes.push({ from: line.from, to: line.from + removeLength, insert });
  });

  view.dispatch({ changes, scrollIntoView: true, userEvent: "input.format" });
  view.focus();
  return true;
}

/** Insert a standalone block, padded with blank lines so markdown parses it. */
export function insertBlock(view: EditorView, block: string, selectWithin?: string) {
  const { state } = view;
  const range = state.selection.main;
  const line = state.doc.lineAt(range.from);
  const atLineStart = range.from === line.from && line.text.trim() === "";
  const before = state.sliceDoc(Math.max(0, range.from - 2), range.from);
  const lead = range.from === 0 || before === "\n\n" ? "" : atLineStart ? "\n" : "\n\n";
  const after = state.sliceDoc(range.to, range.to + 1);
  const trail = after === "" || after === "\n" ? "\n" : "\n\n";
  const insert = `${lead}${block}${trail}`;

  let anchor = range.from + insert.length - trail.length;
  let head = anchor;
  if (selectWithin) {
    const idx = insert.indexOf(selectWithin);
    if (idx >= 0) {
      anchor = range.from + idx;
      head = anchor + selectWithin.length;
    }
  }
  view.dispatch({
    changes: { from: range.from, to: range.to, insert },
    selection: EditorSelection.single(anchor, head),
    scrollIntoView: true,
    userEvent: "input.format",
  });
  view.focus();
  return true;
}

export function insertCodeBlock(view: EditorView) {
  const selected = view.state.sliceDoc(view.state.selection.main.from, view.state.selection.main.to);
  return insertBlock(view, `\`\`\`js\n${selected || "// code"}\n\`\`\``, selected ? "js" : "// code");
}

export function insertTable(view: EditorView) {
  return insertBlock(
    view,
    "| Column | Column |\n| --- | --- |\n| Cell | Cell |\n| Cell | Cell |",
    "Column",
  );
}

export function insertDivider(view: EditorView) {
  return insertBlock(view, "---");
}

export function insertLink(view: EditorView) {
  const { state } = view;
  const range = state.selection.main;
  const text = state.sliceDoc(range.from, range.to);
  const looksLikeUrl = /^https?:\/\/\S+$/.test(text);
  const label = looksLikeUrl ? "link text" : text || "link text";
  const url = looksLikeUrl ? text : "https://";
  const insert = `[${label}](${url})`;
  const selectFrom = looksLikeUrl || !text ? range.from + 1 : range.from + label.length + 3;
  const selectTo = looksLikeUrl || !text ? selectFrom + label.length : selectFrom + url.length;
  view.dispatch({
    changes: { from: range.from, to: range.to, insert },
    selection: EditorSelection.single(selectFrom, selectTo),
    scrollIntoView: true,
    userEvent: "input.format",
  });
  view.focus();
  return true;
}

export function insertImageMarkdown(view: EditorView, alt = "Describe the image", url = "https://") {
  const range = view.state.selection.main;
  const insert = `![${alt}](${url})`;
  view.dispatch({
    changes: { from: range.from, to: range.to, insert },
    selection: EditorSelection.single(range.from + 2, range.from + 2 + alt.length),
    scrollIntoView: true,
    userEvent: "input.format",
  });
  view.focus();
  return true;
}

/** Replace an exact placeholder string, if it is still in the document. */
export function replacePlaceholder(view: EditorView, placeholder: string, insert: string) {
  const text = view.state.doc.toString();
  const index = text.indexOf(placeholder);
  if (index < 0) return false;
  view.dispatch({
    changes: { from: index, to: index + placeholder.length, insert },
    userEvent: "input.upload",
  });
  return true;
}

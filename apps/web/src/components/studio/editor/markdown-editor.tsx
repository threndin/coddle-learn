"use client";

import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { HighlightStyle, syntaxHighlighting, syntaxTree } from "@codemirror/language";
import { languages } from "@codemirror/language-data";
import { highlightSelectionMatches, searchKeymap } from "@codemirror/search";
import { Compartment, EditorState, RangeSetBuilder } from "@codemirror/state";
import {
  Decoration,
  EditorView,
  ViewPlugin,
  drawSelection,
  dropCursor,
  highlightActiveLine,
  keymap,
  placeholder as placeholderExtension,
  type DecorationSet,
  type ViewUpdate,
} from "@codemirror/view";
import { tags } from "@lezer/highlight";
import { markdownWordCount } from "@coddle/shared";
import { LessonMarkdown } from "@/components/courses/lesson-markdown";
import { Icon, type IconName } from "@/components/ui/icon";
import {
  insertCodeBlock,
  insertDivider,
  insertImageMarkdown,
  insertLink,
  insertTable,
  replacePlaceholder,
  toggleLines,
  toggleWrap,
} from "./markdown-commands";

export type EditorMode = "write" | "split" | "preview";

const MODE_KEY = "learn_studio_editor_mode";

const modeListeners = new Set<() => void>();
let memoryMode: EditorMode = "write";

function isEditorMode(value: unknown): value is EditorMode {
  return value === "write" || value === "split" || value === "preview";
}

function readMode(): EditorMode {
  try {
    const saved = localStorage.getItem(MODE_KEY);
    if (isEditorMode(saved)) return saved;
  } catch {
    /* storage unavailable */
  }
  return memoryMode;
}

function writeMode(next: EditorMode) {
  memoryMode = next;
  try {
    localStorage.setItem(MODE_KEY, next);
  } catch {
    /* storage unavailable */
  }
  modeListeners.forEach((listener) => listener());
}

function subscribeMode(listener: () => void) {
  modeListeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    modeListeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function uploadToken(fileName: string) {
  return `![Uploading ${fileName || "image"}…](${Math.random().toString(36).slice(2, 8)})`;
}

const highlightStyle = HighlightStyle.define([
  { tag: tags.heading1, fontSize: "1.45em", fontWeight: "800", color: "var(--ink)" },
  { tag: tags.heading2, fontSize: "1.25em", fontWeight: "800", color: "var(--ink)" },
  { tag: tags.heading3, fontSize: "1.1em", fontWeight: "700", color: "var(--ink)" },
  { tag: [tags.heading4, tags.heading5, tags.heading6], fontWeight: "700", color: "var(--ink)" },
  { tag: tags.strong, fontWeight: "700", color: "var(--ink)" },
  { tag: tags.emphasis, fontStyle: "italic" },
  { tag: tags.strikethrough, textDecoration: "line-through" },
  { tag: tags.link, color: "var(--brand)", textDecoration: "underline" },
  { tag: tags.url, color: "var(--ink-muted)" },
  { tag: tags.monospace, color: "var(--code-inline)" },
  { tag: tags.quote, color: "var(--ink-muted)", fontStyle: "italic" },
  { tag: [tags.processingInstruction, tags.meta, tags.contentSeparator], color: "var(--ink-muted)" },
  { tag: tags.list, color: "var(--ink)" },
  { tag: [tags.keyword, tags.controlKeyword, tags.modifier], color: "var(--code-keyword)" },
  { tag: [tags.string, tags.special(tags.string), tags.regexp], color: "var(--code-string)" },
  { tag: [tags.number, tags.bool, tags.null, tags.atom], color: "var(--code-number)" },
  { tag: [tags.comment, tags.lineComment, tags.blockComment], color: "var(--code-comment)", fontStyle: "italic" },
  { tag: [tags.function(tags.variableName), tags.function(tags.propertyName)], color: "var(--code-function)" },
  { tag: [tags.typeName, tags.className, tags.tagName], color: "var(--code-type)" },
  { tag: [tags.propertyName, tags.attributeName], color: "var(--code-property)" },
]);

const editorTheme = EditorView.theme({
  "&": {
    color: "var(--ink)",
    backgroundColor: "transparent",
    fontSize: "14px",
    height: "100%",
  },
  ".cm-scroller": {
    fontFamily: "var(--font-geist-mono), ui-monospace, SFMono-Regular, monospace",
    lineHeight: "1.75",
    overflow: "auto",
  },
  ".cm-content": {
    caretColor: "var(--brand)",
    padding: "20px 0 120px",
  },
  ".cm-line": { padding: "0 24px" },
  "&.cm-focused": { outline: "none" },
  ".cm-cursor, .cm-dropCursor": { borderLeftColor: "var(--brand)", borderLeftWidth: "2px" },
  "&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection":
    { backgroundColor: "color-mix(in srgb, var(--brand) 20%, transparent) !important" },
  ".cm-activeLine": { backgroundColor: "color-mix(in srgb, var(--brand) 4%, transparent)" },
  ".cm-placeholder": { color: "var(--ink-muted)", fontStyle: "normal" },
  ".cm-selectionMatch": { backgroundColor: "color-mix(in srgb, var(--brand) 10%, transparent)" },
});

const codeBlockLine = Decoration.line({ class: "cm-codeblock-line" });

function codeBlockDecorations(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  let lastLine = -1;
  for (const { from, to } of view.visibleRanges) {
    syntaxTree(view.state).iterate({
      from,
      to,
      enter(node) {
        if (node.name !== "FencedCode") return;
        let pos = node.from;
        while (pos <= node.to) {
          const line = view.state.doc.lineAt(pos);
          if (line.from > lastLine) {
            builder.add(line.from, line.from, codeBlockLine);
            lastLine = line.from;
          }
          pos = line.to + 1;
        }
        return false;
      },
    });
  }
  return builder.finish();
}

const codeBlocks = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = codeBlockDecorations(view);
    }
    update(update: ViewUpdate) {
      if (
        update.docChanged ||
        update.viewportChanged ||
        syntaxTree(update.startState) !== syntaxTree(update.state)
      ) {
        this.decorations = codeBlockDecorations(update.view);
      }
    }
  },
  { decorations: (plugin) => plugin.decorations },
);

const formattingKeymap = [
  { key: "Mod-b", run: (view: EditorView) => toggleWrap(view, "**", "**", "bold text") },
  { key: "Mod-i", run: (view: EditorView) => toggleWrap(view, "_", "_", "italic text") },
  { key: "Mod-e", run: (view: EditorView) => toggleWrap(view, "`", "`", "code") },
  { key: "Mod-k", run: insertLink },
  { key: "Mod-Shift-x", run: (view: EditorView) => toggleWrap(view, "~~", "~~", "text") },
  { key: "Mod-Alt-2", run: (view: EditorView) => toggleLines(view, "h2") },
  { key: "Mod-Alt-3", run: (view: EditorView) => toggleLines(view, "h3") },
  { key: "Mod-Shift-8", run: (view: EditorView) => toggleLines(view, "bullet") },
  { key: "Mod-Shift-7", run: (view: EditorView) => toggleLines(view, "ordered") },
  { key: "Mod-Shift-9", run: (view: EditorView) => toggleLines(view, "task") },
  { key: "Mod-Shift-c", run: insertCodeBlock },
];

function imageFiles(list: DataTransfer | null): File[] {
  if (!list) return [];
  return Array.from(list.files).filter((file) => file.type.startsWith("image/"));
}

type ToolbarAction = {
  id: string;
  icon: IconName;
  label: string;
  shortcut?: string;
  run: (view: EditorView) => boolean;
};

const ACTIONS: (ToolbarAction | "sep")[] = [
  { id: "h2", icon: "heading", label: "Heading", shortcut: "⌘⌥2", run: (v) => toggleLines(v, "h2") },
  {
    id: "h3",
    icon: "heading",
    label: "Subheading",
    shortcut: "⌘⌥3",
    run: (v) => toggleLines(v, "h3"),
  },
  "sep",
  { id: "bold", icon: "bold", label: "Bold", shortcut: "⌘B", run: (v) => toggleWrap(v, "**", "**", "bold text") },
  { id: "italic", icon: "italic", label: "Italic", shortcut: "⌘I", run: (v) => toggleWrap(v, "_", "_", "italic text") },
  { id: "strike", icon: "strike", label: "Strikethrough", shortcut: "⌘⇧X", run: (v) => toggleWrap(v, "~~", "~~", "text") },
  { id: "code", icon: "code", label: "Inline code", shortcut: "⌘E", run: (v) => toggleWrap(v, "`", "`", "code") },
  "sep",
  { id: "bullet", icon: "listBullet", label: "Bulleted list", shortcut: "⌘⇧8", run: (v) => toggleLines(v, "bullet") },
  { id: "ordered", icon: "listOrdered", label: "Numbered list", shortcut: "⌘⇧7", run: (v) => toggleLines(v, "ordered") },
  { id: "task", icon: "listTask", label: "Checklist", shortcut: "⌘⇧9", run: (v) => toggleLines(v, "task") },
  { id: "quote", icon: "quote", label: "Quote", run: (v) => toggleLines(v, "quote") },
  "sep",
  { id: "link", icon: "link", label: "Link", shortcut: "⌘K", run: insertLink },
  { id: "codeBlock", icon: "codeBlock", label: "Code block", shortcut: "⌘⇧C", run: insertCodeBlock },
  { id: "table", icon: "table", label: "Table", run: insertTable },
  { id: "divider", icon: "divider", label: "Divider", run: insertDivider },
];

export function MarkdownEditor({
  initialValue,
  onChange,
  readOnly = false,
  onUploadImage,
  onError,
  placeholder = "Start writing…",
  emptyAction,
}: {
  initialValue: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  onUploadImage?: (file: File) => Promise<string>;
  onError?: (message: string) => void;
  placeholder?: string;
  emptyAction?: { label: string; content: string };
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const readOnlyCompartment = useRef(new Compartment());
  const callbacks = useRef({ onChange, onUploadImage, onError });
  useLayoutEffect(() => {
    callbacks.current = { onChange, onUploadImage, onError };
  });

  const [value, setValue] = useState(initialValue);
  const mode = useSyncExternalStore(subscribeMode, readMode, () => "write" as const);
  const [focusMode, setFocusMode] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [uploading, setUploading] = useState(0);

  function changeMode(next: EditorMode) {
    writeMode(next);
    if (next !== "preview") requestAnimationFrame(() => viewRef.current?.focus());
  }

  async function uploadInto(view: EditorView, file: File, at?: number) {
    const upload = callbacks.current.onUploadImage;
    if (!upload) return;
    const token = uploadToken(file.name);
    const pos = at ?? view.state.selection.main.from;
    view.dispatch({ changes: { from: pos, insert: token }, userEvent: "input.upload" });
    setUploading((count) => count + 1);
    try {
      const url = await upload(file);
      const alt = (file.name || "image").replace(/\.[a-z0-9]+$/i, "").replace(/[-_]+/g, " ");
      replacePlaceholder(view, token, `![${alt}](${url})`);
    } catch (error) {
      replacePlaceholder(view, token, "");
      callbacks.current.onError?.(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading((count) => count - 1);
    }
  }

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const view = new EditorView({
      parent: host,
      state: EditorState.create({
        doc: initialValue,
        extensions: [
          history(),
          drawSelection(),
          dropCursor(),
          highlightActiveLine(),
          highlightSelectionMatches(),
          EditorView.lineWrapping,
          placeholderExtension(placeholder),
          markdown({ base: markdownLanguage, codeLanguages: languages }),
          syntaxHighlighting(highlightStyle),
          codeBlocks,
          editorTheme,
          keymap.of([...formattingKeymap, ...defaultKeymap, ...historyKeymap, ...searchKeymap, indentWithTab]),
          readOnlyCompartment.current.of([EditorState.readOnly.of(readOnly), EditorView.editable.of(!readOnly)]),
          EditorView.updateListener.of((update) => {
            if (!update.docChanged) return;
            const next = update.state.doc.toString();
            setValue(next);
            callbacks.current.onChange(next);
          }),
          EditorView.domEventHandlers({
            paste(event, view) {
              const files = imageFiles(event.clipboardData);
              if (files.length === 0 || !callbacks.current.onUploadImage) return false;
              event.preventDefault();
              for (const file of files) void uploadInto(view, file);
              return true;
            },
            drop(event, view) {
              const files = imageFiles(event.dataTransfer);
              if (files.length === 0 || !callbacks.current.onUploadImage) return false;
              event.preventDefault();
              const pos = view.posAtCoords({ x: event.clientX, y: event.clientY }) ?? undefined;
              for (const file of files) void uploadInto(view, file, pos);
              return true;
            },
          }),
        ],
      }),
    });
    viewRef.current = view;
    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // The editor is uncontrolled; parents remount it (via `key`) to load another doc.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    viewRef.current?.dispatch({
      effects: readOnlyCompartment.current.reconfigure([
        EditorState.readOnly.of(readOnly),
        EditorView.editable.of(!readOnly),
      ]),
    });
  }, [readOnly]);

  useEffect(() => {
    if (!focusMode) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setFocusMode(false);
    }
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => viewRef.current?.focus());
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [focusMode]);

  function run(action: ToolbarAction) {
    const view = viewRef.current;
    if (!view || readOnly) return;
    if (mode === "preview") changeMode("write");
    action.run(view);
  }

  function pickImage() {
    const view = viewRef.current;
    if (!view || readOnly) return;
    if (mode === "preview") changeMode("write");
    if (onUploadImage) fileRef.current?.click();
    else insertImageMarkdown(view);
  }

  function applyTemplate() {
    const view = viewRef.current;
    if (!view || !emptyAction) return;
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: emptyAction.content },
      selection: { anchor: emptyAction.content.length },
    });
    view.focus();
  }

  const words = markdownWordCount(value);
  const readMinutes = Math.max(1, Math.round(words / 200));
  const showEditor = mode !== "preview";
  const showPreview = mode !== "write";

  return (
    <div
      className={[
        "flex min-h-0 flex-col overflow-hidden border-border bg-surface",
        focusMode ? "fixed inset-0 z-[80]" : "h-full rounded-2xl border",
      ].join(" ")}
    >
      <div className="flex shrink-0 items-center gap-1 border-b border-border bg-surface px-2 py-1.5">
        <div
          className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto [scrollbar-width:none] sm:flex-wrap [&::-webkit-scrollbar]:hidden"
          role="toolbar"
          aria-label="Formatting"
        >
          {ACTIONS.map((action, index) =>
            action === "sep" ? (
              <span key={`sep-${index}`} className="mx-1 h-5 w-px shrink-0 bg-border" aria-hidden />
            ) : (
              <ToolbarButton
                key={action.id}
                icon={action.icon}
                label={action.shortcut ? `${action.label} (${action.shortcut})` : action.label}
                badge={action.id === "h2" ? "2" : action.id === "h3" ? "3" : undefined}
                disabled={readOnly}
                onClick={() => run(action)}
              />
            ),
          )}
          <ToolbarButton
            icon="image"
            label={onUploadImage ? "Upload image (or paste / drop)" : "Image"}
            disabled={readOnly}
            onClick={pickImage}
          />
          {uploading > 0 ? (
            <span className="ml-1 inline-flex items-center gap-1.5 rounded-md bg-brand-soft px-2 py-1 text-[11px] font-semibold text-brand">
              <span className="h-2 w-2 animate-spin rounded-full border border-brand border-t-transparent" />
              Uploading
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-1">
          <div className="flex rounded-lg bg-surface-subtle p-0.5" role="tablist" aria-label="Editor view">
            {(
              [
                ["write", "Write"],
                ["split", "Split"],
                ["preview", "Preview"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={mode === id}
                onClick={() => changeMode(id)}
                className={[
                  "rounded-md px-2.5 py-1 text-xs font-semibold transition",
                  id === "split" ? "hidden lg:block" : "",
                  mode === id ? "bg-surface text-ink shadow-sm" : "text-ink-muted hover:text-ink",
                ].join(" ")}
              >
                {label}
              </button>
            ))}
          </div>
          <ToolbarButton
            icon={focusMode ? "minimize" : "maximize"}
            label={focusMode ? "Exit focus mode (Esc)" : "Focus mode"}
            onClick={() => setFocusMode((prev) => !prev)}
          />
        </div>
      </div>

      <div
        className={[
          "grid min-h-0 flex-1",
          showEditor && showPreview ? "lg:grid-cols-2" : "grid-cols-1",
        ].join(" ")}
      >
        <div
          className={[
            "relative min-h-0",
            showEditor ? "" : "hidden",
            showEditor && showPreview ? "border-r border-border max-lg:hidden" : "",
          ].join(" ")}
        >
          <div
            ref={hostRef}
            className={["h-full", focusMode ? "mx-auto max-w-4xl" : ""].join(" ")}
          />
          {value.trim() === "" && emptyAction && !readOnly ? (
            <div className="pointer-events-none absolute inset-x-0 bottom-6 flex justify-center">
              <button
                type="button"
                onClick={applyTemplate}
                className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-xs font-semibold text-ink shadow-lg shadow-ink/5 transition hover:border-brand hover:text-brand"
              >
                <Icon name="sparkle" className="h-3.5 w-3.5 text-brand" />
                {emptyAction.label}
              </button>
            </div>
          ) : null}
        </div>
        {showPreview ? (
          <div className="min-h-0 overflow-y-auto bg-surface">
            <div className={["px-6 py-5 sm:px-8", focusMode ? "mx-auto max-w-3xl" : ""].join(" ")}>
              {value.trim() ? (
                <LessonMarkdown content={value} />
              ) : (
                <p className="text-sm text-ink-muted">Nothing to preview yet.</p>
              )}
            </div>
          </div>
        ) : null}
      </div>

      <div className="relative flex shrink-0 items-center justify-between gap-3 border-t border-border bg-surface-subtle px-4 py-1.5 text-[11px] text-ink-muted">
        <div className="flex items-center gap-3 tabular-nums">
          <span>{words.toLocaleString()} words</span>
          <span aria-hidden>·</span>
          <span>~{readMinutes} min read</span>
          {readOnly ? (
            <>
              <span aria-hidden>·</span>
              <span className="font-semibold">Read only</span>
            </>
          ) : null}
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline">Markdown · GitHub flavored</span>
          <button
            type="button"
            onClick={() => setShowShortcuts((prev) => !prev)}
            className="inline-flex items-center gap-1 font-semibold transition hover:text-ink"
            aria-expanded={showShortcuts}
          >
            <Icon name="keyboard" className="h-3.5 w-3.5" />
            Shortcuts
          </button>
        </div>
        {showShortcuts ? (
          <div className="absolute bottom-full right-3 z-10 mb-2 w-72 rounded-xl border border-border bg-surface p-3 text-xs shadow-xl shadow-ink/10">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-ink">Keyboard shortcuts</p>
              <button
                type="button"
                aria-label="Close shortcuts"
                onClick={() => setShowShortcuts(false)}
                className="rounded p-0.5 text-ink-muted hover:text-ink"
              >
                <Icon name="x" className="h-3.5 w-3.5" />
              </button>
            </div>
            <dl className="mt-2 grid grid-cols-[1fr_auto] gap-x-4 gap-y-1.5">
              {[
                ...ACTIONS.filter(
                  (action): action is ToolbarAction => action !== "sep" && Boolean(action.shortcut),
                ).map((action) => [action.label, action.shortcut!] as const),
                ["Find & replace", "⌘F"] as const,
                ["Undo / redo", "⌘Z / ⌘⇧Z"] as const,
                ["Indent list", "Tab"] as const,
              ].map(([label, keys]) => (
                <div key={label} className="contents">
                  <dt className="text-ink-muted">{label}</dt>
                  <dd className="font-mono text-ink">{keys}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 border-t border-border pt-2 text-ink-muted">
              Lists continue on Enter. Paste or drop images to upload them.
            </p>
          </div>
        ) : null}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file && viewRef.current) void uploadInto(viewRef.current, file);
        }}
      />
    </div>
  );
}

function ToolbarButton({
  icon,
  label,
  onClick,
  disabled,
  badge,
}: {
  icon: IconName;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  badge?: string;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className="relative inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-muted transition hover:bg-surface-subtle hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
    >
      <Icon name={icon} className="h-4 w-4" />
      {badge ? (
        <span className="absolute bottom-1 right-1 font-mono text-[8px] font-bold leading-none">
          {badge}
        </span>
      ) : null}
    </button>
  );
}

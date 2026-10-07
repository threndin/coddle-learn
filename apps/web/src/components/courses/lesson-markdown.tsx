"use client";

import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function LessonMarkdown({ content }: { content: string }) {
  return (
    <div className="lesson-md text-sm leading-relaxed text-ink">
      <Markdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="mt-2 font-display text-2xl font-extrabold tracking-tight text-ink first:mt-0">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="mt-7 font-display text-lg font-bold tracking-tight text-ink first:mt-0">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mt-5 font-display text-base font-bold text-ink first:mt-0">{children}</h3>
          ),
          h4: ({ children }) => (
            <h4 className="mt-4 text-sm font-bold text-ink first:mt-0">{children}</h4>
          ),
          p: ({ children }) => <p className="mt-3 text-ink-muted first:mt-0">{children}</p>,
          ul: ({ children, className }) => (
            <ul
              className={[
                "mt-3 space-y-1.5 text-ink-muted",
                className?.includes("contains-task-list") ? "list-none pl-1" : "list-disc pl-5",
              ].join(" ")}
            >
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-ink-muted">{children}</ol>
          ),
          li: ({ children, className }) => (
            <li
              className={[
                "leading-relaxed",
                className?.includes("task-list-item") ? "flex items-start gap-2" : "",
              ].join(" ")}
            >
              {children}
            </li>
          ),
          input: ({ checked, type }) =>
            type === "checkbox" ? (
              <input
                type="checkbox"
                checked={Boolean(checked)}
                readOnly
                disabled
                className="mt-1 h-3.5 w-3.5 shrink-0 accent-[var(--brand)]"
              />
            ) : null,
          strong: ({ children }) => (
            <strong className="font-semibold text-ink">{children}</strong>
          ),
          del: ({ children }) => <del className="text-ink-muted/80">{children}</del>,
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-brand underline-offset-2 hover:underline"
            >
              {children}
            </a>
          ),
          blockquote: ({ children }) => (
            <blockquote className="mt-4 rounded-r-xl border-l-4 border-brand/40 bg-brand-soft/40 px-4 py-2 [&>p]:mt-1.5 [&>p:first-child]:mt-0">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-6 border-border" />,
          img: ({ src, alt }) =>
            typeof src === "string" && src ? (
              <span className="mt-4 block">
                {/* Lesson images are contributor-provided URLs (R2 or external). */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt={alt ?? ""}
                  loading="lazy"
                  className="max-h-[480px] max-w-full rounded-xl border border-border"
                />
                {alt ? <span className="mt-1.5 block text-xs text-ink-muted">{alt}</span> : null}
              </span>
            ) : null,
          table: ({ children }) => (
            <div className="mt-4 overflow-x-auto rounded-xl border border-border">
              <table className="w-full border-collapse text-left text-[13px]">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-surface-subtle">{children}</thead>,
          th: ({ children }) => (
            <th className="border-b border-border px-3 py-2 font-semibold text-ink">{children}</th>
          ),
          td: ({ children }) => (
            <td className="border-b border-border px-3 py-2 align-top text-ink-muted [tr:last-child_&]:border-b-0">
              {children}
            </td>
          ),
          code: ({ className, children }) => {
            const isBlock = Boolean(className?.includes("language-"));
            if (isBlock) {
              return (
                <code className="block overflow-x-auto whitespace-pre font-mono text-[12px] leading-relaxed text-ink">
                  {children}
                </code>
              );
            }
            return (
              <code className="rounded bg-surface-subtle px-1.5 py-0.5 font-mono text-[12px] text-[var(--code-inline)]">
                {children}
              </code>
            );
          },
          pre: ({ children }) => (
            <pre className="mt-4 overflow-x-auto rounded-xl border border-border bg-[var(--code-bg)] p-4">
              {children}
            </pre>
          ),
        }}
      >
        {content}
      </Markdown>
    </div>
  );
}

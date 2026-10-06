"use client";

import Markdown from "react-markdown";

export function LessonMarkdown({ content }: { content: string }) {
  return (
    <div className="lesson-md text-sm leading-relaxed text-ink">
      <Markdown
        components={{
          h1: ({ children }) => (
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="mt-6 font-display text-lg font-bold tracking-tight text-ink">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mt-5 font-display text-base font-bold text-ink">{children}</h3>
          ),
          p: ({ children }) => <p className="mt-3 text-ink-muted">{children}</p>,
          ul: ({ children }) => (
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-ink-muted">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-ink-muted">{children}</ol>
          ),
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          strong: ({ children }) => (
            <strong className="font-semibold text-ink">{children}</strong>
          ),
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
              <code className="rounded bg-surface-subtle px-1.5 py-0.5 font-mono text-[12px] text-ink">
                {children}
              </code>
            );
          },
          pre: ({ children }) => (
            <pre className="mt-4 overflow-x-auto rounded-xl border border-border bg-surface-subtle p-4">
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

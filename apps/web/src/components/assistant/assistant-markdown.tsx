"use client";

import Link from "next/link";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { isSafeAssistantHref } from "@coddle/shared";

function safeHref(href: string | undefined): string | null {
  if (!href || !isSafeAssistantHref(href)) return null;
  return href.trim();
}

export function AssistantMarkdown({ content }: { content: string }) {
  return (
    <div className="text-[15px] leading-relaxed text-ink">
      <Markdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h2 className="mt-4 font-display text-xl font-bold tracking-tight text-ink first:mt-0">
              {children}
            </h2>
          ),
          h2: ({ children }) => (
            <h2 className="mt-4 font-display text-lg font-bold tracking-tight text-ink first:mt-0">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mt-4 font-display text-base font-bold text-ink first:mt-0">{children}</h3>
          ),
          p: ({ children }) => <p className="mt-2.5 text-ink first:mt-0">{children}</p>,
          ul: ({ children }) => (
            <ul className="mt-2 list-disc space-y-1.5 pl-5 text-ink">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-ink">{children}</ol>
          ),
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          strong: ({ children }) => (
            <strong className="font-semibold text-ink">{children}</strong>
          ),
          em: ({ children }) => <em>{children}</em>,
          a: ({ href, children }) => {
            const safe = safeHref(href);
            if (!safe) return <span>{children}</span>;
            if (safe.startsWith("/")) {
              return (
                <Link
                  href={safe}
                  className="font-semibold text-brand underline-offset-2 hover:text-brand-deep hover:underline"
                >
                  {children}
                </Link>
              );
            }
            return (
              <a
                href={safe}
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-brand underline-offset-2 hover:text-brand-deep hover:underline"
              >
                {children}
              </a>
            );
          },
          code: ({ children }) => (
            <code className="rounded bg-surface-subtle px-1.5 py-0.5 font-mono text-[13px]">
              {children}
            </code>
          ),
          img: () => null,
          hr: () => <hr className="my-4 border-border" />,
        }}
      >
        {content}
      </Markdown>
    </div>
  );
}

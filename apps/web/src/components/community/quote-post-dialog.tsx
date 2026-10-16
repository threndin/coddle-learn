"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { COMMUNITY_LIMITS } from "@coddle/shared";
import { QuotedPostEmbed } from "@/components/community/quoted-post-embed";
import { FieldLabel, inputClass } from "@/components/studio/course-fields";
import { Icon } from "@/components/ui/icon";
import type { CommunityPostItem, QuotedPostSummary } from "@/lib/community";

export type QuotePostDraft = {
  quotePostId: string;
  title: string;
  body: string;
};

function toQuotedSummary(post: CommunityPostItem): QuotedPostSummary {
  return {
    id: post.id,
    slug: post.slug,
    kind: post.kind,
    title: post.title,
    body: post.body,
    imageUrls: post.imageUrls?.slice(0, 2) ?? [],
    createdAt: post.createdAt,
    isDeleted: false,
    author: post.author,
  };
}

function defaultTitle(post: CommunityPostItem) {
  const prefix = "Re: ";
  const max = COMMUNITY_LIMITS.titleMax - prefix.length;
  const base = post.title.trim();
  return `${prefix}${base.length > max ? `${base.slice(0, max - 1)}…` : base}`;
}

export function QuotePostDialog({
  open,
  post,
  onClose,
  onQueue,
}: {
  open: boolean;
  post: CommunityPostItem | null;
  onClose: () => void;
  onQueue: (draft: QuotePostDraft) => void;
}) {
  const titleId = useId();
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const titleLength = title.trim().length;
  const bodyLength = body.trim().length;
  const ready =
    Boolean(post) &&
    titleLength >= COMMUNITY_LIMITS.titleMin &&
    titleLength <= COMMUNITY_LIMITS.titleMax &&
    bodyLength >= COMMUNITY_LIMITS.quoteBodyMin &&
    bodyLength <= COMMUNITY_LIMITS.bodyMax;

  useEffect(() => {
    if (!open || !post) return;
    setTitle(defaultTitle(post));
    setBody("");
    const previous = document.activeElement;
    const focusTimer = window.setTimeout(() => bodyRef.current?.focus(), 0);
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, [open, post, onClose]);

  if (!open || !post || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto p-4 sm:items-center sm:p-6">
      <button
        type="button"
        aria-label="Close dialog"
        onClick={onClose}
        className="fixed inset-0 bg-ink/40 backdrop-blur-[2px]"
      />
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onSubmit={(event) => {
          event.preventDefault();
          if (!ready) return;
          onQueue({
            quotePostId: post.id,
            title: title.trim(),
            body: body.trim(),
          });
        }}
        className="relative my-auto w-full max-w-xl rounded-2xl border border-border bg-surface shadow-xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-border p-5 sm:p-6">
          <div>
            <h2 id={titleId} className="font-display text-xl font-bold tracking-tight text-ink">
              Quote post
            </h2>
            <p className="mt-1 text-sm text-ink-muted">
              Add your take. The original stays nested like a quote on X.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-ink-muted transition hover:bg-surface-subtle hover:text-ink"
          >
            <Icon name="x" className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 p-5 sm:p-6">
          <QuotedPostEmbed quoted={toQuotedSummary(post)} />

          <div>
            <FieldLabel
              htmlFor="quote-title"
              label="Title"
              count={title.length}
              max={COMMUNITY_LIMITS.titleMax}
            />
            <input
              id="quote-title"
              value={title}
              maxLength={COMMUNITY_LIMITS.titleMax}
              onChange={(event) => setTitle(event.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <FieldLabel
              htmlFor="quote-body"
              label="Your commentary"
              count={body.length}
              max={COMMUNITY_LIMITS.bodyMax}
            />
            <textarea
              id="quote-body"
              ref={bodyRef}
              rows={4}
              value={body}
              maxLength={COMMUNITY_LIMITS.bodyMax}
              onChange={(event) => setBody(event.target.value)}
              placeholder="What do you want to add?"
              className={`${inputClass} resize-y leading-relaxed`}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-border p-5 sm:px-6">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-surface-subtle"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!ready}
            className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Icon name="quote" className="h-4 w-4" />
            Quote
          </button>
        </div>
      </form>
    </div>,
    document.body,
  );
}

"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  COMMUNITY_LIMITS,
  COMMUNITY_TOPICS,
  COMMUNITY_TOPIC_LABELS,
  type CommunityTopic,
} from "@coddle/shared";
import { RelatedPicker } from "@/components/community/related-picker";
import { FieldLabel, inputClass } from "@/components/studio/course-fields";
import { Icon } from "@/components/ui/icon";
import { useToast } from "@/components/app/toast";
import { errorMessage } from "@/lib/api-client";
import {
  updateCommunityPost,
  type CommunityPostItem,
  type RelatedOption,
} from "@/lib/community";

export function EditPostDialog({
  open,
  post,
  onClose,
  onSaved,
}: {
  open: boolean;
  post: CommunityPostItem | null;
  onClose: () => void;
  onSaved: (post: CommunityPostItem) => void;
}) {
  const titleId = useId();
  const titleRef = useRef<HTMLInputElement>(null);
  const { pushToast } = useToast();
  const [topic, setTopic] = useState<CommunityTopic>("general");
  const [related, setRelated] = useState<RelatedOption | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isQuote = Boolean(post?.quotePostId);
  const bodyMin = isQuote ? COMMUNITY_LIMITS.quoteBodyMin : COMMUNITY_LIMITS.bodyMin;
  const titleLength = title.trim().length;
  const bodyLength = body.trim().length;
  const ready =
    titleLength >= COMMUNITY_LIMITS.titleMin &&
    titleLength <= COMMUNITY_LIMITS.titleMax &&
    bodyLength >= bodyMin &&
    bodyLength <= COMMUNITY_LIMITS.bodyMax;

  useEffect(() => {
    if (!open || !post) return;
    setTopic((post.topic as CommunityTopic) || "general");
    setRelated(
      post.relatedSlug
        ? {
            slug: post.relatedSlug,
            title: post.relatedTitle ?? post.relatedSlug,
            subtitle: null,
          }
        : null,
    );
    setTitle(post.title);
    setBody(post.body);
    setError(null);
    setPending(false);
    const focusTimer = window.setTimeout(() => titleRef.current?.focus(), 0);
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !pending) onClose();
    }
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, post, onClose, pending]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!post || !ready || pending) return;
    setPending(true);
    setError(null);
    try {
      const { post: next } = await updateCommunityPost(post.slug, {
        title: title.trim(),
        body: body.trim(),
        topic,
        relatedSlug: topic === "general" ? null : related?.slug ?? null,
      });
      onSaved(next);
      pushToast("Post updated", "success");
      onClose();
    } catch (err) {
      setError(errorMessage(err, "Could not update post"));
    } finally {
      setPending(false);
    }
  }

  if (!open || !post || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto p-4 sm:items-center sm:p-6">
      <button
        type="button"
        aria-label="Close dialog"
        disabled={pending}
        onClick={() => {
          if (!pending) onClose();
        }}
        className="fixed inset-0 bg-ink/40 backdrop-blur-[2px]"
      />
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onSubmit={(event) => void submit(event)}
        className="relative my-auto w-full max-w-2xl rounded-2xl border border-border bg-surface shadow-xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-border p-5 sm:p-6">
          <div>
            <h2 id={titleId} className="font-display text-xl font-bold tracking-tight text-ink">
              Edit post
            </h2>
            <p className="mt-1 text-sm text-ink-muted">Update the title, body, or topic.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            aria-label="Close"
            className="rounded-lg p-1.5 text-ink-muted transition hover:bg-surface-subtle hover:text-ink disabled:opacity-50"
          >
            <Icon name="x" className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-5 p-5 sm:p-6">
          <div>
            <FieldLabel label="About" />
            <div role="radiogroup" aria-label="Topic" className="flex flex-wrap gap-2">
              {COMMUNITY_TOPICS.map((option) => (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={topic === option}
                  onClick={() => {
                    setTopic(option);
                    if (option === "general") setRelated(null);
                  }}
                  className={[
                    "rounded-xl border px-3 py-2 text-sm font-semibold transition",
                    topic === option
                      ? "border-brand bg-brand-soft text-brand ring-4 ring-brand/10"
                      : "border-border bg-surface text-ink-muted hover:border-border-strong hover:text-ink",
                  ].join(" ")}
                >
                  {COMMUNITY_TOPIC_LABELS[option]}
                </button>
              ))}
            </div>
          </div>

          {topic !== "general" ? (
            <div>
              <FieldLabel
                label={`Related ${COMMUNITY_TOPIC_LABELS[topic].toLowerCase()}`}
                hint="Optional."
              />
              <RelatedPicker
                topic={topic}
                value={related}
                onChange={setRelated}
                disabled={pending}
              />
            </div>
          ) : null}

          <div>
            <FieldLabel
              htmlFor="edit-post-title"
              label="Title"
              count={title.length}
              max={COMMUNITY_LIMITS.titleMax}
            />
            <input
              id="edit-post-title"
              ref={titleRef}
              value={title}
              maxLength={COMMUNITY_LIMITS.titleMax}
              onChange={(event) => setTitle(event.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <FieldLabel
              htmlFor="edit-post-body"
              label="Body"
              count={body.length}
              max={COMMUNITY_LIMITS.bodyMax}
            />
            <textarea
              id="edit-post-body"
              rows={5}
              value={body}
              maxLength={COMMUNITY_LIMITS.bodyMax}
              onChange={(event) => setBody(event.target.value)}
              className={`${inputClass} resize-y leading-relaxed`}
            />
          </div>

          {error ? (
            <p className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
              <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </p>
          ) : null}
        </div>

        <div className="flex justify-end gap-3 border-t border-border p-5 sm:px-6">
          <button
            type="button"
            disabled={pending}
            onClick={onClose}
            className="rounded-xl px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-surface-subtle disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!ready || pending}
            className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Icon name="pencil" className="h-4 w-4" />
            {pending ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </div>,
    document.body,
  );
}

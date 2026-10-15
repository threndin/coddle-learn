"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  COMMUNITY_IMAGE_TYPES,
  COMMUNITY_KINDS,
  COMMUNITY_KIND_LABELS,
  COMMUNITY_LIMITS,
  COMMUNITY_TOPICS,
  COMMUNITY_TOPIC_LABELS,
  type CommunityKind,
  type CommunityTopic,
} from "@coddle/shared";
import { RelatedPicker } from "@/components/community/related-picker";
import { FieldLabel, inputClass } from "@/components/studio/course-fields";
import { Icon } from "@/components/ui/icon";
import type { RelatedOption } from "@/lib/community";

const KIND_HINTS: Record<CommunityKind, string> = {
  question: "Ask for help on a concept, course, or roadmap step.",
  discussion: "Start a conversation others can weigh in on.",
  project_share: "Share something you built and what you learned.",
};

export type ComposePostDraft = {
  kind: CommunityKind;
  topic: CommunityTopic;
  relatedSlug?: string;
  title: string;
  body: string;
  images: File[];
};

type LocalImage = { id: string; file: File; previewUrl: string };

export function ComposePostDialog({
  open,
  onClose,
  onQueue,
  initialKind = "question",
}: {
  open: boolean;
  onClose: () => void;
  onQueue: (draft: ComposePostDraft) => void;
  initialKind?: CommunityKind;
}) {
  const titleId = useId();
  const titleRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState<CommunityKind>(initialKind);
  const [topic, setTopic] = useState<CommunityTopic>(
    initialKind === "project_share" ? "project" : "general",
  );
  const [related, setRelated] = useState<RelatedOption | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [images, setImages] = useState<LocalImage[]>([]);
  const [error, setError] = useState<string | null>(null);

  const titleLength = title.trim().length;
  const bodyLength = body.trim().length;
  const ready =
    titleLength >= COMMUNITY_LIMITS.titleMin &&
    titleLength <= COMMUNITY_LIMITS.titleMax &&
    bodyLength >= COMMUNITY_LIMITS.bodyMin &&
    bodyLength <= COMMUNITY_LIMITS.bodyMax;

  const closeRef = useRef({ onClose });
  useEffect(() => {
    closeRef.current = { onClose };
  });

  useEffect(() => {
    if (!open) return;
    setKind(initialKind);
    setTopic(initialKind === "project_share" ? "project" : "general");
    setRelated(null);
    setTitle("");
    setBody("");
    setImages((prev) => {
      for (const image of prev) URL.revokeObjectURL(image.previewUrl);
      return [];
    });
    setError(null);
    const previous = document.activeElement;
    const focusTimer = window.setTimeout(() => titleRef.current?.focus(), 0);
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeRef.current.onClose();
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
  }, [open, initialKind]);

  function selectKind(next: CommunityKind) {
    setKind(next);
    if (next === "project_share" && topic === "general") setTopic("project");
  }

  function selectTopic(next: CommunityTopic) {
    setTopic(next);
    if (next === "general") setRelated(null);
  }

  function addFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const remaining = COMMUNITY_LIMITS.imagesMax - images.length;
    if (remaining <= 0) {
      setError(`You can attach up to ${COMMUNITY_LIMITS.imagesMax} images.`);
      return;
    }

    const next: LocalImage[] = [];
    for (const file of Array.from(fileList).slice(0, remaining)) {
      if (!(COMMUNITY_IMAGE_TYPES as readonly string[]).includes(file.type)) {
        setError("Upload a PNG, JPEG, WebP, or GIF image. Videos are not supported yet.");
        continue;
      }
      if (file.size > COMMUNITY_LIMITS.imageBytesMax) {
        setError(
          `Images must be ${Math.round(COMMUNITY_LIMITS.imageBytesMax / (1024 * 1024))} MB or smaller.`,
        );
        continue;
      }
      next.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        file,
        previewUrl: URL.createObjectURL(file),
      });
    }
    if (next.length > 0) {
      setImages((prev) => [...prev, ...next]);
      setError(null);
    }
    if (fileRef.current) fileRef.current.value = "";
  }

  function removeImage(id: string) {
    setImages((prev) => {
      const target = prev.find((image) => image.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((image) => image.id !== id);
    });
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!ready) return;
    onQueue({
      kind,
      topic,
      relatedSlug: topic === "general" ? undefined : related?.slug,
      title: title.trim(),
      body: body.trim(),
      images: images.map((image) => image.file),
    });
  }

  if (!open || typeof document === "undefined") return null;

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
        onSubmit={submit}
        className="relative my-auto w-full max-w-2xl rounded-2xl border border-border bg-surface shadow-xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-border p-5 sm:p-6">
          <div>
            <h2 id={titleId} className="font-display text-xl font-bold tracking-tight text-ink">
              New community post
            </h2>
            <p className="mt-1 text-sm text-ink-muted">{KIND_HINTS[kind]}</p>
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

        <div className="space-y-5 p-5 sm:p-6">
          <div>
            <FieldLabel label="Type" />
            <div role="radiogroup" aria-label="Post type" className="flex flex-wrap gap-2">
              {COMMUNITY_KINDS.map((option) => (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={kind === option}
                  onClick={() => selectKind(option)}
                  className={[
                    "rounded-xl border px-3 py-2 text-sm font-semibold transition",
                    kind === option
                      ? "border-brand bg-brand-soft text-brand ring-4 ring-brand/10"
                      : "border-border bg-surface text-ink-muted hover:border-border-strong hover:text-ink",
                  ].join(" ")}
                >
                  {COMMUNITY_KIND_LABELS[option]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <FieldLabel label="About" hint="Optional focus for filters and related links." />
            <div role="radiogroup" aria-label="Topic" className="flex flex-wrap gap-2">
              {COMMUNITY_TOPICS.map((option) => (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={topic === option}
                  onClick={() => selectTopic(option)}
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
                hint="Optional. Search and pick from the catalog."
              />
              <RelatedPicker topic={topic} value={related} onChange={setRelated} />
            </div>
          ) : null}

          <div>
            <FieldLabel
              htmlFor="community-title"
              label="Title"
              count={title.length}
              max={COMMUNITY_LIMITS.titleMax}
            />
            <input
              id="community-title"
              ref={titleRef}
              value={title}
              maxLength={COMMUNITY_LIMITS.titleMax}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={
                kind === "project_share"
                  ? "e.g. Shipped a weather dashboard with Open-Meteo"
                  : "e.g. How do you structure API errors in Express?"
              }
              className={inputClass}
            />
          </div>

          <div>
            <FieldLabel
              htmlFor="community-body"
              label={kind === "question" ? "Details" : "Write"}
              hint="Give enough context for someone to help or learn from it."
              count={body.length}
              max={COMMUNITY_LIMITS.bodyMax}
            />
            <textarea
              id="community-body"
              rows={5}
              value={body}
              maxLength={COMMUNITY_LIMITS.bodyMax}
              onChange={(event) => setBody(event.target.value)}
              placeholder={
                kind === "project_share"
                  ? "What you built, what was hard, and what you’d do differently…"
                  : "What you’ve tried, where you’re stuck, and what a good answer looks like…"
              }
              className={`${inputClass} resize-y leading-relaxed`}
            />
          </div>

          <div>
            <FieldLabel
              label="Images"
              hint={`Optional. Up to ${COMMUNITY_LIMITS.imagesMax} images. No videos yet.`}
            />
            <div className="flex flex-wrap gap-3">
              {images.map((image) => (
                <div
                  key={image.id}
                  className="relative h-24 w-24 overflow-hidden rounded-xl border border-border bg-surface-subtle"
                >
                  {/* Local object URLs for pending attachments. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={image.previewUrl} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    aria-label="Remove image"
                    onClick={() => removeImage(image.id)}
                    className="absolute right-1 top-1 rounded-md bg-ink/70 p-1 text-white transition hover:bg-ink"
                  >
                    <Icon name="x" className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {images.length < COMMUNITY_LIMITS.imagesMax ? (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border text-ink-muted transition hover:border-brand hover:text-brand"
                >
                  <Icon name="image" className="h-5 w-5" />
                  <span className="text-[11px] font-semibold">Add</span>
                </button>
              ) : null}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept={COMMUNITY_IMAGE_TYPES.join(",")}
              multiple
              className="hidden"
              onChange={(event) => addFiles(event.target.files)}
            />
          </div>

          {error ? (
            <p className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
              <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </p>
          ) : null}
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
            <Icon name="send" className="h-4 w-4" />
            Publish
          </button>
        </div>
      </form>
    </div>,
    document.body,
  );
}

"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  RESOURCE_LIMITS,
  RESOURCE_TYPES,
  RESOURCE_TYPE_LABELS,
  normalizeResourceUrl,
  resourceHost,
  type ExperienceLevel,
  type ResourceType,
} from "@coddle/shared";
import { FieldLabel, LevelPicker, SkillPicker, inputClass } from "@/components/studio/course-fields";
import { Icon } from "@/components/ui/icon";
import { errorMessage } from "@/lib/api-client";
import { submitResource, type ResourceItem } from "@/lib/resources";

export function SubmitResourceDialog({
  open,
  onClose,
  onSubmitted,
}: {
  open: boolean;
  onClose: () => void;
  onSubmitted: (resource: ResourceItem) => void;
}) {
  const titleId = useId();
  const urlRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<ResourceType>("docs");
  const [level, setLevel] = useState<ExperienceLevel>("beginner");
  const [skillSlugs, setSkillSlugs] = useState<string[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalizedUrl = url.trim() ? normalizeResourceUrl(url) : null;
  const titleLength = title.trim().length;
  const descriptionLength = description.trim().length;
  const ready =
    Boolean(normalizedUrl) &&
    titleLength >= RESOURCE_LIMITS.titleMin &&
    titleLength <= RESOURCE_LIMITS.titleMax &&
    descriptionLength >= RESOURCE_LIMITS.descriptionMin &&
    descriptionLength <= RESOURCE_LIMITS.descriptionMax;

  const closeRef = useRef({ onClose, pending });
  useEffect(() => {
    closeRef.current = { onClose, pending };
  });

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement;
    urlRef.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !closeRef.current.pending) closeRef.current.onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, [open]);

  function reset() {
    setUrl("");
    setTitle("");
    setDescription("");
    setType("docs");
    setLevel("beginner");
    setSkillSlugs([]);
    setError(null);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!ready || pending || !normalizedUrl) return;
    setPending(true);
    setError(null);
    try {
      const { resource } = await submitResource({
        url: normalizedUrl,
        title: title.trim(),
        description: description.trim(),
        type,
        level,
        skillSlugs,
      });
      reset();
      onSubmitted(resource);
    } catch (err) {
      setError(errorMessage(err, "Could not share this resource"));
    } finally {
      setPending(false);
    }
  }

  if (!open || typeof document === "undefined") return null;

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
        onSubmit={submit}
        className="relative my-auto w-full max-w-2xl rounded-2xl border border-border bg-surface shadow-xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-border p-5 sm:p-6">
          <div>
            <h2 id={titleId} className="font-display text-xl font-bold tracking-tight text-ink">
              Share a resource
            </h2>
            <p className="mt-1 text-sm text-ink-muted">
              Docs, articles, videos, courses, or tools that genuinely helped you learn.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            aria-label="Close"
            className="rounded-lg p-1.5 text-ink-muted transition hover:bg-surface-subtle hover:text-ink"
          >
            <Icon name="x" className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-5 p-5 sm:p-6">
          <div>
            <FieldLabel htmlFor="resource-url" label="Link" hint="A public http or https page." />
            <input
              id="resource-url"
              ref={urlRef}
              type="url"
              inputMode="url"
              value={url}
              maxLength={RESOURCE_LIMITS.urlMax}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://developer.mozilla.org/…"
              className={inputClass}
            />
            {url.trim() ? (
              <p
                className={[
                  "mt-1.5 text-xs",
                  normalizedUrl ? "text-ink-muted" : "text-rose-600",
                ].join(" ")}
              >
                {normalizedUrl
                  ? `Links to ${resourceHost(normalizedUrl)}`
                  : "That doesn't look like a public web link."}
              </p>
            ) : null}
          </div>

          <div>
            <FieldLabel
              htmlFor="resource-title"
              label="Title"
              count={title.length}
              max={RESOURCE_LIMITS.titleMax}
            />
            <input
              id="resource-title"
              value={title}
              maxLength={RESOURCE_LIMITS.titleMax}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g. An Interactive Guide to Flexbox"
              className={inputClass}
            />
          </div>

          <div>
            <FieldLabel
              htmlFor="resource-description"
              label="Why it's worth reading"
              hint="What will someone learn, and who is it best for?"
              count={description.length}
              max={RESOURCE_LIMITS.descriptionMax}
            />
            <textarea
              id="resource-description"
              rows={3}
              value={description}
              maxLength={RESOURCE_LIMITS.descriptionMax}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="A visual walkthrough of how flexbox distributes space, with sliders you can play with."
              className={`${inputClass} resize-none leading-relaxed`}
            />
          </div>

          <div>
            <FieldLabel label="Type" />
            <div role="radiogroup" aria-label="Resource type" className="flex flex-wrap gap-2">
              {RESOURCE_TYPES.map((option) => (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={type === option}
                  onClick={() => setType(option)}
                  className={[
                    "rounded-xl border px-3 py-2 text-sm font-semibold transition",
                    type === option
                      ? "border-brand bg-brand-soft text-brand ring-4 ring-brand/10"
                      : "border-border bg-surface text-ink-muted hover:border-border-strong hover:text-ink",
                  ].join(" ")}
                >
                  {RESOURCE_TYPE_LABELS[option]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <FieldLabel label="Level" hint="Who is this resource written for?" />
            <LevelPicker value={level} onChange={(value) => setLevel(value as ExperienceLevel)} />
          </div>

          <div>
            <FieldLabel label="Technologies" hint="Helps learners find it from the filters." />
            <SkillPicker
              value={skillSlugs}
              onChange={setSkillSlugs}
              max={RESOURCE_LIMITS.skillMax}
              footnote="Learners filtering by these technologies will see this resource."
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
            <Icon name="send" className="h-4 w-4" />
            {pending ? "Sharing…" : "Share resource"}
          </button>
        </div>
      </form>
    </div>,
    document.body,
  );
}

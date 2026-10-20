"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  TOOL_CATEGORIES,
  TOOL_CATEGORY_LABELS,
  TOOL_IMAGE_TYPES,
  TOOL_LIMITS,
  TOOL_PLATFORMS,
  TOOL_PLATFORM_LABELS,
  TOOL_PRICING,
  TOOL_PRICING_LABELS,
  normalizeResourceUrl,
  resourceHost,
  type ToolCategory,
  type ToolPlatform,
  type ToolPricing,
} from "@coddle/shared";
import { FieldLabel, SkillPicker, inputClass } from "@/components/studio/course-fields";
import { Icon } from "@/components/ui/icon";
import { errorMessage } from "@/lib/api-client";
import { submitTool, uploadToolImage, type ToolItem } from "@/lib/tools";

export function SubmitToolDialog({
  open,
  onClose,
  onSubmitted,
  uploadsEnabled,
}: {
  open: boolean;
  onClose: () => void;
  onSubmitted: (tool: ToolItem) => void;
  uploadsEnabled: boolean;
}) {
  const titleId = useId();
  const urlRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [category, setCategory] = useState<ToolCategory>("productivity");
  const [pricing, setPricing] = useState<ToolPricing>("freemium");
  const [platforms, setPlatforms] = useState<ToolPlatform[]>(["web"]);
  const [skillSlugs, setSkillSlugs] = useState<string[]>([]);
  const [imageUrl, setImageUrl] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalizedUrl = url.trim() ? normalizeResourceUrl(url) : null;
  const titleLength = title.trim().length;
  const summaryLength = summary.trim().length;
  const hasImage = Boolean(imageUrl.trim() || imagePreview);
  const ready =
    Boolean(normalizedUrl) &&
    hasImage &&
    titleLength >= TOOL_LIMITS.titleMin &&
    titleLength <= TOOL_LIMITS.titleMax &&
    summaryLength >= TOOL_LIMITS.summaryMin &&
    summaryLength <= TOOL_LIMITS.summaryMax &&
    platforms.length > 0;

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
    setSummary("");
    setCategory("productivity");
    setPricing("freemium");
    setPlatforms(["web"]);
    setSkillSlugs([]);
    setImageUrl("");
    setImagePreview(null);
    setError(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function togglePlatform(platform: ToolPlatform) {
    setPlatforms((prev) =>
      prev.includes(platform)
        ? prev.filter((item) => item !== platform)
        : [...prev, platform].slice(0, TOOL_LIMITS.platformMax),
    );
  }

  async function onPickFile(file: File | undefined) {
    if (!file) return;
    if (!(TOOL_IMAGE_TYPES as readonly string[]).includes(file.type)) {
      setError("Upload a PNG, JPEG, WebP, or GIF image.");
      return;
    }
    if (file.size > TOOL_LIMITS.imageBytesMax) {
      setError(`Images must be ${Math.round(TOOL_LIMITS.imageBytesMax / (1024 * 1024))} MB or smaller.`);
      return;
    }
    setError(null);
    setImagePreview(URL.createObjectURL(file));
    if (!uploadsEnabled) {
      setError("File uploads are not configured here. Paste a public image URL instead.");
      return;
    }
    setPending(true);
    try {
      const { url: uploaded } = await uploadToolImage(file);
      setImageUrl(uploaded);
    } catch (err) {
      setImagePreview(null);
      setError(errorMessage(err, "Could not upload that image"));
    } finally {
      setPending(false);
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!ready || pending || !normalizedUrl) return;
    const cover = imageUrl.trim();
    if (!cover) {
      setError("Add a cover image before sharing.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const { tool } = await submitTool({
        url: normalizedUrl,
        title: title.trim(),
        summary: summary.trim(),
        imageUrl: cover,
        category,
        pricing,
        platforms,
        skillSlugs,
      });
      reset();
      onSubmitted(tool);
    } catch (err) {
      setError(errorMessage(err, "Could not share this tool"));
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
              Share a tool
            </h2>
            <p className="mt-1 text-sm text-ink-muted">
              A product that helps developers work faster — editor, API client, host, or anything in
              between. Image and link required.
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
            <FieldLabel htmlFor="tool-url" label="Link" hint="Homepage of the product." />
            <input
              id="tool-url"
              ref={urlRef}
              type="url"
              inputMode="url"
              value={url}
              maxLength={TOOL_LIMITS.urlMax}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://coddle.dev"
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
              htmlFor="tool-title"
              label="Name"
              count={title.length}
              max={TOOL_LIMITS.titleMax}
            />
            <input
              id="tool-title"
              value={title}
              maxLength={TOOL_LIMITS.titleMax}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g. WatchUp"
              className={inputClass}
            />
          </div>

          <div>
            <FieldLabel
              htmlFor="tool-summary"
              label="What it does"
              hint="Who is this for, and why would a developer use it?"
              count={summary.length}
              max={TOOL_LIMITS.summaryMax}
            />
            <textarea
              id="tool-summary"
              rows={3}
              value={summary}
              maxLength={TOOL_LIMITS.summaryMax}
              onChange={(event) => setSummary(event.target.value)}
              placeholder="Watches errors and latency, then sends the stack trace to WhatsApp when something breaks."
              className={`${inputClass} resize-none leading-relaxed`}
            />
          </div>

          <div>
            <FieldLabel label="Cover image" hint="Logo or product screenshot. Required." />
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={pending}
                className="flex aspect-[16/10] w-full items-center justify-center overflow-hidden rounded-xl border border-dashed border-border bg-surface-subtle sm:w-56"
              >
                {imagePreview || imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imagePreview || imageUrl}
                    alt=""
                    className="h-full w-full object-contain p-3"
                  />
                ) : (
                  <span className="inline-flex flex-col items-center gap-1.5 text-xs font-semibold text-ink-muted">
                    <Icon name="upload" className="h-5 w-5" />
                    Upload image
                  </span>
                )}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept={TOOL_IMAGE_TYPES.join(",")}
                className="sr-only"
                onChange={(event) => void onPickFile(event.target.files?.[0])}
              />
              <div className="min-w-0 flex-1">
                <label htmlFor="tool-image-url" className="sr-only">
                  Image URL
                </label>
                <input
                  id="tool-image-url"
                  type="url"
                  value={imageUrl}
                  maxLength={TOOL_LIMITS.imageUrlMax}
                  onChange={(event) => {
                    setImageUrl(event.target.value);
                    setImagePreview(null);
                  }}
                  placeholder="or paste a public image URL"
                  className={inputClass}
                />
                <p className="mt-1.5 text-xs text-ink-muted">
                  PNG, JPEG, WebP, or GIF
                  {uploadsEnabled ? "" : " — paste a URL if uploads are unavailable"}.
                </p>
              </div>
            </div>
          </div>

          <div>
            <FieldLabel label="Category" />
            <div role="radiogroup" aria-label="Tool category" className="flex flex-wrap gap-2">
              {TOOL_CATEGORIES.map((option) => (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={category === option}
                  onClick={() => setCategory(option)}
                  className={[
                    "rounded-xl border px-3 py-2 text-sm font-semibold transition",
                    category === option
                      ? "border-brand bg-brand-soft text-brand ring-4 ring-brand/10"
                      : "border-border bg-surface text-ink-muted hover:border-border-strong hover:text-ink",
                  ].join(" ")}
                >
                  {TOOL_CATEGORY_LABELS[option]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <FieldLabel label="Pricing" />
            <div role="radiogroup" aria-label="Pricing" className="flex flex-wrap gap-2">
              {TOOL_PRICING.map((option) => (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={pricing === option}
                  onClick={() => setPricing(option)}
                  className={[
                    "rounded-xl border px-3 py-2 text-sm font-semibold transition",
                    pricing === option
                      ? "border-brand bg-brand-soft text-brand ring-4 ring-brand/10"
                      : "border-border bg-surface text-ink-muted hover:border-border-strong hover:text-ink",
                  ].join(" ")}
                >
                  {TOOL_PRICING_LABELS[option]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <FieldLabel label="Platforms" hint="Where can someone use it?" />
            <div className="flex flex-wrap gap-2">
              {TOOL_PLATFORMS.map((option) => {
                const active = platforms.includes(option);
                return (
                  <button
                    key={option}
                    type="button"
                    aria-pressed={active}
                    onClick={() => togglePlatform(option)}
                    className={[
                      "rounded-xl border px-3 py-2 text-sm font-semibold transition",
                      active
                        ? "border-brand bg-brand-soft text-brand"
                        : "border-border bg-surface text-ink-muted hover:border-border-strong hover:text-ink",
                    ].join(" ")}
                  >
                    {TOOL_PLATFORM_LABELS[option]}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <FieldLabel label="Technologies" hint="Helps learners find it from the filters." />
            <SkillPicker
              value={skillSlugs}
              onChange={setSkillSlugs}
              max={TOOL_LIMITS.skillMax}
              footnote="Learners filtering by these technologies will see this tool."
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
            {pending ? "Sharing…" : "Share tool"}
          </button>
        </div>
      </form>
    </div>,
    document.body,
  );
}

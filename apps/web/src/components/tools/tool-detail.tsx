"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  TOOL_CATEGORY_LABELS,
  TOOL_PLATFORM_LABELS,
  TOOL_PRICING_LABELS,
  isToolCategory,
  isToolPlatform,
  isToolPricing,
} from "@coddle/shared";
import { useToast } from "@/components/app/toast";
import { ProfileAvatar } from "@/components/onboarding/profile-avatar";
import { ProfileLink } from "@/components/profile/profile-link";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Icon } from "@/components/ui/icon";
import { errorMessage } from "@/lib/api-client";
import { deleteTool, setToolBookmark, type ToolItem } from "@/lib/tools";

export function ToolDetailView({ initial }: { initial: ToolItem }) {
  const router = useRouter();
  const { pushToast } = useToast();
  const [tool, setTool] = useState(initial);
  const [removeOpen, setRemoveOpen] = useState(false);

  const categoryLabel = isToolCategory(tool.category)
    ? TOOL_CATEGORY_LABELS[tool.category]
    : tool.category;
  const pricingLabel = isToolPricing(tool.pricing)
    ? TOOL_PRICING_LABELS[tool.pricing]
    : tool.pricing;

  async function toggleBookmark() {
    const next = !tool.bookmarked;
    setTool((prev) => ({
      ...prev,
      bookmarked: next,
      bookmarkCount: Math.max(0, prev.bookmarkCount + (next ? 1 : -1)),
    }));
    try {
      const result = await setToolBookmark(tool.id, next);
      setTool((prev) => ({ ...prev, ...result }));
      pushToast(next ? "Saved to your tools" : "Removed from saved", "success");
    } catch (err) {
      setTool((prev) => ({
        ...prev,
        bookmarked: !next,
        bookmarkCount: Math.max(0, prev.bookmarkCount + (next ? -1 : 1)),
      }));
      pushToast(errorMessage(err, "Could not update bookmark"), "error");
    }
  }

  async function confirmRemove() {
    try {
      await deleteTool(tool.id);
      pushToast("Tool removed", "success");
      router.push("/tools?scope=mine");
    } catch (err) {
      pushToast(errorMessage(err, "Could not remove tool"), "error");
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-8">
      <Link
        href="/tools"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-muted transition hover:text-ink"
      >
        <Icon name="arrowLeft" className="h-4 w-4" />
        All tools
      </Link>

      <div className="mt-6 overflow-hidden rounded-3xl border border-border bg-surface">
        <div className="aspect-[16/8] bg-ink">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={tool.imageUrl} alt="" className="h-full w-full object-contain p-10" />
        </div>

        <div className="p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-brand-soft px-2 py-1 text-[11px] font-semibold text-brand">
                  {categoryLabel}
                </span>
                <span className="rounded-md bg-surface-subtle px-2 py-1 text-[11px] font-semibold text-ink-muted">
                  {pricingLabel}
                </span>
                {tool.status !== "published" ? (
                  <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">
                    {tool.status === "pending" ? "Pending review" : "Not approved"}
                  </span>
                ) : null}
              </div>
              <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-ink">
                {tool.title}
              </h1>
              <p className="mt-1 font-mono text-xs text-ink-muted">{tool.host}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void toggleBookmark()}
                aria-pressed={tool.bookmarked}
                className={[
                  "inline-flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition",
                  tool.bookmarked
                    ? "bg-brand text-white"
                    : "border border-border bg-surface text-ink hover:border-brand/40",
                ].join(" ")}
              >
                <Icon name="bookmark" className="h-4 w-4" filled={tool.bookmarked} />
                {tool.bookmarked ? "Saved" : "Save"}
              </button>
              <a
                href={tool.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-brand px-3.5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
              >
                Open tool
                <Icon name="external" className="h-4 w-4" />
              </a>
            </div>
          </div>

          <p className="mt-5 max-w-3xl text-base leading-relaxed text-ink-muted">{tool.summary}</p>

          {tool.platforms.length > 0 ? (
            <div className="mt-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
                Platforms
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {tool.platforms.map((platform) => (
                  <span
                    key={platform}
                    className="rounded-md bg-surface-subtle px-2.5 py-1 text-xs font-medium text-ink"
                  >
                    {isToolPlatform(platform) ? TOOL_PLATFORM_LABELS[platform] : platform}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {tool.skills.length > 0 ? (
            <div className="mt-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
                Technologies
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {tool.skills.map((skill) => (
                  <Link
                    key={skill.slug}
                    href={`/tools?skill=${encodeURIComponent(skill.slug)}`}
                    className="rounded-md bg-surface-subtle px-2.5 py-1 text-xs font-medium text-ink transition hover:bg-brand-soft hover:text-brand"
                  >
                    {skill.name}
                  </Link>
                ))}
              </div>
            </div>
          ) : null}

          {tool.isOwner && tool.status === "rejected" && tool.reviewNote ? (
            <p className="mt-6 rounded-xl bg-surface-subtle p-4 text-sm leading-relaxed text-ink-muted">
              <span className="font-semibold text-ink">Reviewer note: </span>
              {tool.reviewNote}
            </p>
          ) : null}

          <div className="mt-8 flex items-center justify-between gap-3 border-t border-border pt-4">
            <div className="flex min-w-0 items-center gap-2">
              {tool.submittedBy ? (
                <>
                  <ProfileLink user={tool.submittedBy} className="shrink-0">
                    <ProfileAvatar
                      name={tool.submittedBy.name}
                      avatarUrl={tool.submittedBy.avatarUrl}
                      size="sm"
                    />
                  </ProfileLink>
                  <p className="truncate text-sm text-ink-muted">
                    Shared by{" "}
                    {tool.isOwner ? (
                      <span className="font-semibold text-ink">you</span>
                    ) : (
                      <ProfileLink
                        user={tool.submittedBy}
                        className="font-semibold text-ink transition hover:text-brand"
                      >
                        {tool.submittedBy.name}
                      </ProfileLink>
                    )}
                  </p>
                </>
              ) : (
                <p className="text-sm text-ink-muted">
                  Added by <span className="font-semibold text-ink">Coddle</span>
                </p>
              )}
            </div>
            {tool.isOwner ? (
              <button
                type="button"
                onClick={() => setRemoveOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold text-ink-muted transition hover:bg-surface-subtle hover:text-rose-600"
              >
                <Icon name="trash" className="h-4 w-4" />
                Remove
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={removeOpen}
        title="Remove this tool?"
        description={`“${tool.title}” will be removed from the catalog, including anyone's saved list.`}
        confirmLabel="Remove"
        pendingLabel="Removing…"
        tone="danger"
        onConfirm={confirmRemove}
        onClose={() => setRemoveOpen(false)}
      />
    </div>
  );
}

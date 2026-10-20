"use client";

import Link from "next/link";
import {
  TOOL_CATEGORY_LABELS,
  TOOL_PRICING_LABELS,
  isToolCategory,
  isToolPricing,
} from "@coddle/shared";
import { ProfileAvatar } from "@/components/onboarding/profile-avatar";
import { ProfileLink } from "@/components/profile/profile-link";
import { Icon } from "@/components/ui/icon";
import type { ToolItem } from "@/lib/tools";

function StatusBadge({ status }: { status: string }) {
  if (status === "published") return null;
  const pending = status === "pending";
  return (
    <span
      className={[
        "rounded-full px-2.5 py-1 text-[11px] font-semibold",
        pending
          ? "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300"
          : "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
      ].join(" ")}
    >
      {pending ? "Pending review" : "Not approved"}
    </span>
  );
}

export function ToolCard({
  tool,
  onToggleBookmark,
}: {
  tool: ToolItem;
  onToggleBookmark: (tool: ToolItem) => void;
}) {
  const categoryLabel = isToolCategory(tool.category)
    ? TOOL_CATEGORY_LABELS[tool.category]
    : tool.category;
  const pricingLabel = isToolPricing(tool.pricing)
    ? TOOL_PRICING_LABELS[tool.pricing]
    : tool.pricing;

  return (
    <article className="group/card flex flex-col overflow-hidden rounded-2xl border border-border bg-surface transition hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-md hover:shadow-brand/5">
      <Link href={`/tools/${tool.slug}`} className="relative block aspect-[16/10] bg-ink">
        {/* Seeded covers are local; community covers may be any HTTPS host. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={tool.imageUrl}
          alt=""
          className="h-full w-full object-contain p-8 transition duration-300 group-hover/card:scale-[1.02]"
        />
        <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-md bg-surface/90 px-2 py-1 text-[11px] font-semibold text-ink backdrop-blur-sm">
          {categoryLabel}
        </span>
        <span className="absolute right-3 top-3">
          <StatusBadge status={tool.status} />
        </span>
      </Link>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link href={`/tools/${tool.slug}`}>
              <h2 className="font-display text-lg font-bold leading-snug tracking-tight text-ink transition group-hover/card:text-brand">
                {tool.title}
              </h2>
            </Link>
            <p className="mt-1 truncate font-mono text-[11px] text-ink-muted">{tool.host}</p>
          </div>
          <button
            type="button"
            onClick={() => onToggleBookmark(tool)}
            aria-pressed={tool.bookmarked}
            aria-label={tool.bookmarked ? `Remove ${tool.title} from saved` : `Save ${tool.title}`}
            className={[
              "inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold transition",
              tool.bookmarked
                ? "bg-brand text-white"
                : "bg-surface-subtle text-ink-muted hover:text-brand",
            ].join(" ")}
          >
            <Icon name="bookmark" className="h-3.5 w-3.5" filled={tool.bookmarked} />
            {tool.bookmarked ? "Saved" : "Save"}
          </button>
        </div>

        <p className="mt-3 line-clamp-3 flex-1 text-sm leading-relaxed text-ink-muted">
          {tool.summary}
        </p>

        <div className="mt-3 flex flex-wrap gap-1.5">
          <span className="rounded-md bg-surface-subtle px-2 py-1 text-[11px] font-medium text-ink-muted">
            {pricingLabel}
          </span>
          {tool.skills.map((skill) => (
            <span
              key={skill.slug}
              className="rounded-md bg-surface-subtle px-2 py-1 text-[11px] font-medium text-ink-muted"
            >
              {skill.name}
            </span>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 border-t border-border/70 pt-3">
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
                <p className="truncate text-xs text-ink-muted">
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
              <p className="text-xs text-ink-muted">
                Added by <span className="font-semibold text-ink">Coddle</span>
              </p>
            )}
          </div>
          {tool.bookmarkCount > 0 ? (
            <span className="inline-flex items-center gap-1 text-xs tabular-nums text-ink-muted">
              <Icon name="bookmark" className="h-3 w-3" />
              {tool.bookmarkCount}
            </span>
          ) : null}
        </div>
      </div>
    </article>
  );
}

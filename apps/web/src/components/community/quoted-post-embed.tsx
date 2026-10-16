"use client";

import Link from "next/link";
import { ProfileAvatar } from "@/components/onboarding/profile-avatar";
import { communityPostPath, type QuotedPostSummary } from "@/lib/community";
import { timeAgo } from "@/lib/format";

/** X-style nested card for a quoted community post. */
export function QuotedPostEmbed({
  quoted,
  className = "",
}: {
  quoted: QuotedPostSummary;
  className?: string;
}) {
  if (quoted.isDeleted) {
    return (
      <div
        className={[
          "rounded-2xl border border-dashed border-border bg-surface-subtle/60 px-4 py-3 text-sm text-ink-muted",
          className,
        ].join(" ")}
      >
        This post is unavailable.
      </div>
    );
  }

  const previewImage = quoted.imageUrls[0] ?? null;

  return (
    <Link
      href={communityPostPath(quoted)}
      className={[
        "block overflow-hidden rounded-2xl border border-border bg-surface transition hover:border-border-strong hover:bg-surface-subtle/40",
        className,
      ].join(" ")}
      onClick={(event) => event.stopPropagation()}
    >
      <div className="flex items-center gap-2.5 px-3.5 pt-3">
        <ProfileAvatar name={quoted.author.name} avatarUrl={quoted.author.avatarUrl} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink">{quoted.author.name}</p>
          <p className="text-[11px] text-ink-muted">{timeAgo(quoted.createdAt)}</p>
        </div>
      </div>
      <div className="px-3.5 pb-3.5 pt-2">
        <p className="line-clamp-2 text-sm font-semibold text-ink">{quoted.title}</p>
        <p className="mt-1 line-clamp-3 text-sm leading-relaxed text-ink-muted">{quoted.body}</p>
        {previewImage ? (
          // Quoted post media may come from R2 or static seed paths.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewImage}
            alt=""
            className="mt-3 h-36 w-full rounded-xl object-cover ring-1 ring-border"
          />
        ) : null}
      </div>
    </Link>
  );
}

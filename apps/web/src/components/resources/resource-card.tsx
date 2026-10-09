"use client";

import Link from "next/link";
import { RESOURCE_TYPE_LABELS, isResourceType, levelById, type ResourceType } from "@coddle/shared";
import { ProfileAvatar } from "@/components/onboarding/profile-avatar";
import { Icon, type IconName } from "@/components/ui/icon";
import type { ResourceItem } from "@/lib/resources";

const TYPE_ICONS: Record<ResourceType, IconName> = {
  docs: "book",
  article: "file",
  video: "play",
  course: "layers",
  tool: "code",
};

const USED_IN_PREVIEW = 2;

export function ResourceTypeBadge({ type }: { type: string }) {
  const known = isResourceType(type);
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-brand-soft px-2 py-1 text-[11px] font-semibold text-brand transition group-hover/card:bg-surface">
      <Icon name={known ? TYPE_ICONS[type] : "link"} className="h-3.5 w-3.5" />
      {known ? RESOURCE_TYPE_LABELS[type] : type}
    </span>
  );
}

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

export function ResourceCard({
  resource,
  onToggleBookmark,
  onRemove,
}: {
  resource: ResourceItem;
  onToggleBookmark: (resource: ResourceItem) => void;
  onRemove?: (resource: ResourceItem) => void;
}) {
  const levelLabel = levelById(String(resource.level))?.label ?? resource.level;
  const previewUses = resource.usedIn.slice(0, USED_IN_PREVIEW);
  const extraUses = resource.usedIn.length - previewUses.length;

  return (
    <article className="group/card flex cursor-pointer flex-col rounded-2xl border border-border bg-surface p-5 transition hover:-translate-y-0.5 hover:border-brand/40 hover:bg-brand-soft">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <ResourceTypeBadge type={resource.type} />
            <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
              {levelLabel}
            </span>
            <StatusBadge status={resource.status} />
          </div>
          <a
            href={resource.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 block"
          >
            <h2 className="font-display text-lg font-bold leading-snug tracking-tight text-ink transition group-hover/card:text-brand">
              {resource.title}
              <Icon
                name="external"
                className="ml-1.5 inline h-3.5 w-3.5 -translate-y-px text-ink-muted transition group-hover/card:text-brand"
              />
            </h2>
            <p className="mt-1 truncate font-mono text-[11px] text-ink-muted">{resource.host}</p>
          </a>
        </div>
        <button
          type="button"
          onClick={() => onToggleBookmark(resource)}
          aria-pressed={resource.bookmarked}
          aria-label={resource.bookmarked ? `Remove ${resource.title} from saved` : `Save ${resource.title}`}
          className={[
            "inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold transition",
            resource.bookmarked
              ? "bg-brand text-white"
              : "bg-surface-subtle text-ink-muted hover:text-brand group-hover/card:bg-surface",
          ].join(" ")}
        >
          <Icon name="bookmark" className="h-3.5 w-3.5" filled={resource.bookmarked} />
          {resource.bookmarked ? "Saved" : "Save"}
        </button>
      </div>

      <p className="mt-3 line-clamp-3 flex-1 text-sm leading-relaxed text-ink-muted">
        {resource.description}
      </p>

      {resource.skills.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {resource.skills.map((skill) => (
            <span
              key={skill.slug}
              className="rounded-md bg-surface-subtle px-2 py-1 text-[11px] font-medium text-ink-muted transition group-hover/card:bg-surface"
            >
              {skill.name}
            </span>
          ))}
        </div>
      ) : null}

      {previewUses.length > 0 ? (
        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
              <Icon name="layers" className="h-3.5 w-3.5 text-brand" />
              On roadmaps
            </p>
            {resource.usedIn.length > 1 ? (
              <span className="text-[11px] tabular-nums text-ink-muted">
                {resource.usedIn.length} steps
              </span>
            ) : null}
          </div>
          <ul className="space-y-1.5">
            {previewUses.map((use) => (
              <li key={`${use.roadmapSlug}/${use.stepSlug}`}>
                <Link
                  href={`/roadmaps/${use.roadmapSlug}?step=${encodeURIComponent(use.stepSlug)}`}
                  className="group/use flex items-center gap-2.5 rounded-xl border border-transparent bg-surface-subtle/80 px-2.5 py-2 transition group-hover/card:bg-surface hover:border-brand/25 hover:bg-surface"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand ring-1 ring-brand/10 transition group-hover/card:bg-brand group-hover/card:text-white group-hover/card:ring-transparent">
                    <Icon name="target" className="h-3.5 w-3.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-semibold text-ink transition group-hover/use:text-brand">
                      {use.roadmapName}
                    </span>
                    <span className="mt-0.5 block truncate text-[11px] text-ink-muted">
                      {use.stepTitle}
                    </span>
                  </span>
                  <Icon
                    name="chevronRight"
                    className="h-3.5 w-3.5 shrink-0 text-ink-muted transition group-hover/use:translate-x-0.5 group-hover/use:text-brand"
                  />
                </Link>
              </li>
            ))}
          </ul>
          {extraUses > 0 ? (
            <p className="mt-1.5 pl-1 text-[11px] text-ink-muted">
              +{extraUses} more {extraUses === 1 ? "step" : "steps"}
            </p>
          ) : null}
        </div>
      ) : null}

      {resource.isOwner && resource.status === "rejected" && resource.reviewNote ? (
        <p className="mt-3 rounded-xl bg-surface-subtle p-3 text-xs leading-relaxed text-ink-muted">
          <span className="font-semibold text-ink">Reviewer note: </span>
          {resource.reviewNote}
        </p>
      ) : null}

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-border/70 pt-3">
        <div className="flex min-w-0 items-center gap-2">
          {resource.submittedBy ? (
            <>
              <ProfileAvatar
                name={resource.submittedBy.name}
                avatarUrl={resource.submittedBy.avatarUrl}
                size="sm"
              />
              <p className="truncate text-xs text-ink-muted">
                Shared by{" "}
                <span className="font-semibold text-ink">
                  {resource.isOwner ? "you" : resource.submittedBy.name}
                </span>
              </p>
            </>
          ) : (
            <p className="text-xs text-ink-muted">
              Added by <span className="font-semibold text-ink">Coddle</span>
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-3 text-xs text-ink-muted">
          {resource.bookmarkCount > 0 ? (
            <span className="inline-flex items-center gap-1 tabular-nums">
              <Icon name="bookmark" className="h-3 w-3" />
              {resource.bookmarkCount}
            </span>
          ) : null}
          {onRemove && resource.isOwner && resource.usedIn.length === 0 ? (
            <button
              type="button"
              onClick={() => onRemove(resource)}
              aria-label={`Remove ${resource.title}`}
              className="rounded-lg p-1.5 text-ink-muted transition hover:bg-surface-subtle hover:text-rose-600"
            >
              <Icon name="trash" className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}

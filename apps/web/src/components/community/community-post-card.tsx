"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  COMMUNITY_KIND_LABELS,
  COMMUNITY_REACTION_EMOJIS,
  COMMUNITY_TOPIC_LABELS,
  type CommunityKind,
  type CommunityReactionEmoji,
  type CommunityTopic,
} from "@coddle/shared";
import { ProfileAvatar } from "@/components/onboarding/profile-avatar";
import { Icon, type IconName } from "@/components/ui/icon";
import { Menu, type MenuItem } from "@/components/ui/menu";
import { useToast } from "@/components/app/toast";
import { errorMessage } from "@/lib/api-client";
import {
  deleteCommunityPost,
  recordCommunityImpression,
  setCommunityReaction,
  type CommunityPostItem,
} from "@/lib/community";
import { pluralize, timeAgo } from "@/lib/format";

const KIND_ICONS: Record<CommunityKind, IconName> = {
  question: "question",
  discussion: "users",
  project_share: "layers",
};

const LONG_PRESS_MS = 420;

function kindLabel(kind: string) {
  return kind in COMMUNITY_KIND_LABELS
    ? COMMUNITY_KIND_LABELS[kind as CommunityKind]
    : kind;
}

function topicLabel(topic: string) {
  return topic in COMMUNITY_TOPIC_LABELS
    ? COMMUNITY_TOPIC_LABELS[topic as CommunityTopic]
    : topic;
}

function kindIcon(kind: string): IconName {
  return kind in KIND_ICONS ? KIND_ICONS[kind as CommunityKind] : "users";
}

function emptyReactionCounts(): Record<CommunityReactionEmoji, number> {
  return Object.fromEntries(COMMUNITY_REACTION_EMOJIS.map((emoji) => [emoji, 0])) as Record<
    CommunityReactionEmoji,
    number
  >;
}

export function CommunityPostCard({
  post,
  onPatch,
  onDeleted,
}: {
  post: CommunityPostItem;
  onPatch?: (patch: Partial<CommunityPostItem>) => void;
  onDeleted?: (postId: string) => void;
}) {
  const { pushToast } = useToast();
  const rootRef = useRef<HTMLElement>(null);
  const reactionRef = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<number | null>(null);
  const closePickerTimer = useRef<number | null>(null);
  const impressed = useRef(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [pendingEmoji, setPendingEmoji] = useState<CommunityReactionEmoji | null>(null);
  const [reactionError, setReactionError] = useState<string | null>(null);
  const images = post.imageUrls?.slice(0, 2) ?? [];
  const reactionCounts = post.reactionCounts ?? emptyReactionCounts();
  const totalReactions = COMMUNITY_REACTION_EMOJIS.reduce(
    (sum, emoji) => sum + (reactionCounts[emoji] ?? 0),
    0,
  );

  useEffect(() => {
    const node = rootRef.current;
    if (!node || impressed.current) return;
    const postId = post.id;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.some(
          (entry) => entry.isIntersecting && entry.intersectionRatio >= 0.45,
        );
        if (!visible || impressed.current) return;
        impressed.current = true;
        observer.disconnect();
        void recordCommunityImpression(postId)
          .then((result) => {
            if (!result.recorded) return;
            onPatch?.({ impressionCount: result.impressionCount });
          })
          .catch(() => {
            impressed.current = false;
          });
      },
      { threshold: [0.45] },
    );

    observer.observe(node);
    return () => observer.disconnect();
    // Record once per post id when the card enters view.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post.id]);

  useEffect(() => {
    if (!pickerOpen) return;
    function onPointer(event: MouseEvent) {
      if (!reactionRef.current?.contains(event.target as Node)) setPickerOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setPickerOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [pickerOpen]);

  useEffect(() => {
    return () => {
      if (closePickerTimer.current !== null) window.clearTimeout(closePickerTimer.current);
      if (longPressTimer.current !== null) window.clearTimeout(longPressTimer.current);
    };
  }, []);

  function clearLongPress() {
    if (longPressTimer.current !== null) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }

  function startLongPress() {
    clearLongPress();
    longPressTimer.current = window.setTimeout(() => {
      setPickerOpen(true);
      longPressTimer.current = null;
    }, LONG_PRESS_MS);
  }

  async function react(emoji: CommunityReactionEmoji) {
    if (pendingEmoji) return;
    const previous = {
      reactionCounts: { ...reactionCounts },
      myReaction: post.myReaction,
    };
    const nextCounts = { ...reactionCounts };
    if (post.myReaction) {
      nextCounts[post.myReaction] = Math.max(0, (nextCounts[post.myReaction] ?? 0) - 1);
    }
    const nextMine = post.myReaction === emoji ? null : emoji;
    if (nextMine) nextCounts[nextMine] = (nextCounts[nextMine] ?? 0) + 1;
    onPatch?.({ reactionCounts: nextCounts, myReaction: nextMine });
    setPickerOpen(false);

    setPendingEmoji(emoji);
    setReactionError(null);
    try {
      const result = await setCommunityReaction(post.id, emoji);
      onPatch?.({
        reactionCounts: result.reactionCounts,
        myReaction: result.myReaction,
      });
    } catch (err) {
      onPatch?.({
        reactionCounts: previous.reactionCounts,
        myReaction: previous.myReaction,
      });
      setReactionError(errorMessage(err, "Could not save reaction"));
    } finally {
      setPendingEmoji(null);
    }
  }

  async function copyLink() {
    const url = `${window.location.origin}/community?post=${encodeURIComponent(post.id)}`;
    try {
      await navigator.clipboard.writeText(url);
      pushToast("Link copied", "success");
    } catch {
      pushToast("Could not copy link", "error");
    }
  }

  async function removePost() {
    if (!post.isMine || deleting) return;
    setDeleting(true);
    try {
      await deleteCommunityPost(post.id);
      onDeleted?.(post.id);
      pushToast("Post deleted", "success");
    } catch (err) {
      pushToast(errorMessage(err, "Could not delete this post"), "error");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <article
      ref={rootRef}
      className="rounded-2xl border border-border bg-surface p-5 transition hover:border-border-strong sm:p-6"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <ProfileAvatar name={post.author.name} avatarUrl={post.author.avatarUrl} size="sm" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink">{post.author.name}</p>
            <p className="text-xs text-ink-muted">{timeAgo(post.createdAt)}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-start gap-2">
          <div className="hidden flex-wrap items-center justify-end gap-2 sm:flex">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-subtle px-2.5 py-1 text-xs font-semibold text-ink-muted">
              <Icon name={kindIcon(post.kind)} className="h-3.5 w-3.5" />
              {kindLabel(post.kind)}
            </span>
            {post.topic !== "general" ? (
              <span className="inline-flex rounded-full border border-border px-2.5 py-1 text-xs font-semibold text-ink-muted">
                {topicLabel(post.topic)}
              </span>
            ) : null}
          </div>
          <Menu
            label="Post actions"
            align="right"
            triggerClassName="inline-flex h-8 w-8 items-center justify-center text-ink-muted transition hover:text-ink"
            items={
              [
                { label: "Copy link", icon: "link", onSelect: () => void copyLink() },
                {
                  label: "Report",
                  icon: "alert",
                  onSelect: () => pushToast("Reporting comes soon", "info"),
                },
                ...(post.isMine
                  ? ([
                      "divider",
                      {
                        label: deleting ? "Deleting…" : "Delete",
                        icon: "trash",
                        tone: "danger",
                        disabled: deleting,
                        onSelect: () => void removePost(),
                      },
                    ] satisfies MenuItem[])
                  : []),
              ] satisfies MenuItem[]
            }
          />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 sm:hidden">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-subtle px-2.5 py-1 text-xs font-semibold text-ink-muted">
          <Icon name={kindIcon(post.kind)} className="h-3.5 w-3.5" />
          {kindLabel(post.kind)}
        </span>
        {post.topic !== "general" ? (
          <span className="inline-flex rounded-full border border-border px-2.5 py-1 text-xs font-semibold text-ink-muted">
            {topicLabel(post.topic)}
          </span>
        ) : null}
      </div>

      <h2 className="mt-4 font-display text-xl font-bold tracking-tight text-ink">{post.title}</h2>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink-muted">{post.body}</p>

      {images.length > 0 ? (
        <div
          className={[
            "mt-4 grid gap-2",
            images.length === 1 ? "grid-cols-1" : "grid-cols-2",
          ].join(" ")}
        >
          {images.map((url) => (
            // Community image hosts vary with R2 CDN config.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={url}
              src={url}
              alt=""
              className="h-44 w-full rounded-xl object-cover ring-1 ring-border sm:h-52"
            />
          ))}
        </div>
      ) : null}

      {post.relatedHref && (post.relatedTitle || post.relatedSlug) ? (
        <p className="mt-4">
          <Link
            href={post.relatedHref}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand transition hover:underline"
          >
            <Icon name="link" className="h-3.5 w-3.5" />
            {topicLabel(post.topic)} · {post.relatedTitle ?? post.relatedSlug}
          </Link>
        </p>
      ) : null}

      <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-border pt-4">
        <span
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-muted"
          title="Impressions"
        >
          <Icon name="eye" className="h-3.5 w-3.5" />
          {pluralize(post.impressionCount ?? 0, "view")}
        </span>

        <div
          ref={reactionRef}
          className="relative"
          onMouseEnter={() => {
            if (closePickerTimer.current !== null) {
              window.clearTimeout(closePickerTimer.current);
              closePickerTimer.current = null;
            }
            setPickerOpen(true);
          }}
          onMouseLeave={() => {
            closePickerTimer.current = window.setTimeout(() => {
              setPickerOpen(false);
              closePickerTimer.current = null;
            }, 180);
          }}
        >
          {pickerOpen ? (
            <div
              role="menu"
              className="absolute bottom-full left-0 z-20 pb-2"
            >
              <div className="flex items-center gap-1 rounded-full border border-border bg-surface p-1.5 shadow-xl shadow-ink/10">
                {COMMUNITY_REACTION_EMOJIS.map((emoji) => {
                  const count = reactionCounts[emoji] ?? 0;
                  const active = post.myReaction === emoji;
                  return (
                    <button
                      key={emoji}
                      type="button"
                      role="menuitem"
                      disabled={pendingEmoji !== null}
                      aria-pressed={active}
                      aria-label={`React with ${emoji}`}
                      onClick={() => void react(emoji)}
                      className={[
                        "inline-flex min-w-9 flex-col items-center rounded-full px-2 py-1 text-sm transition hover:bg-surface-subtle disabled:opacity-60",
                        active ? "bg-brand-soft ring-1 ring-brand/30" : "",
                      ].join(" ")}
                    >
                      <span aria-hidden>{emoji}</span>
                      {count > 0 ? (
                        <span className="text-[10px] font-semibold text-ink-muted">{count}</span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          <button
            type="button"
            disabled={pendingEmoji !== null}
            aria-haspopup="true"
            aria-expanded={pickerOpen}
            aria-label="React to this post"
            title="Hover or long-press to react"
            onClick={() => setPickerOpen((prev) => !prev)}
            onTouchStart={startLongPress}
            onTouchEnd={clearLongPress}
            onTouchMove={clearLongPress}
            onContextMenu={(event) => {
              event.preventDefault();
              setPickerOpen(true);
            }}
            className={[
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition disabled:opacity-60",
              post.myReaction
                ? "border-brand bg-brand-soft text-ink"
                : "border-border bg-surface text-ink-muted hover:border-border-strong hover:text-ink",
            ].join(" ")}
          >
            <span aria-hidden>{post.myReaction ?? "🙂"}</span>
            <span>{totalReactions > 0 ? totalReactions : "React"}</span>
          </button>
        </div>

        <button
          type="button"
          disabled
          title="Comments come tomorrow"
          className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs font-semibold text-ink-muted opacity-80"
        >
          <Icon name="message" className="h-3.5 w-3.5" />
          {pluralize(post.commentCount ?? 0, "comment")}
        </button>
      </div>

      {reactionError ? (
        <p className="mt-2 text-xs text-rose-600">{reactionError}</p>
      ) : null}
    </article>
  );
}

"use client";

import { useState } from "react";
import {
  COMMUNITY_LIMITS,
  COMMUNITY_REACTION_EMOJIS,
  type CommunityReactionEmoji,
} from "@coddle/shared";
import { ReportDialog } from "@/components/community/report-dialog";
import { ProfileAvatar } from "@/components/onboarding/profile-avatar";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Icon } from "@/components/ui/icon";
import { Menu, type MenuItem } from "@/components/ui/menu";
import { useToast } from "@/components/app/toast";
import { errorMessage } from "@/lib/api-client";
import {
  createCommunityComment,
  deleteCommunityComment,
  setCommunityCommentReaction,
  updateCommunityComment,
  type CommunityCommentItem,
} from "@/lib/community";
import { pluralize, timeAgo } from "@/lib/format";

function emptyReactionCounts(): Record<CommunityReactionEmoji, number> {
  return Object.fromEntries(COMMUNITY_REACTION_EMOJIS.map((emoji) => [emoji, 0])) as Record<
    CommunityReactionEmoji,
    number
  >;
}

export function CommunityComments({
  postId,
  initialComments,
  onCommentCountChange,
}: {
  postId: string;
  initialComments: CommunityCommentItem[];
  onCommentCountChange?: (count: number) => void;
}) {
  const { pushToast } = useToast();
  const [comments, setComments] = useState(initialComments);
  const [draft, setDraft] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [reportTarget, setReportTarget] = useState<CommunityCommentItem | null>(null);

  async function submit() {
    const body = draft.trim();
    if (
      body.length < COMMUNITY_LIMITS.commentBodyMin ||
      body.length > COMMUNITY_LIMITS.commentBodyMax ||
      pending
    ) {
      return;
    }
    setPending(true);
    try {
      const result = await createCommunityComment(postId, {
        body,
        parentId: replyTo ?? undefined,
      });
      const comment = result.comment;
      setComments((prev) => {
        if (!comment.parentId) return [...prev, { ...comment, replies: [] }];
        return prev.map((top) =>
          top.id === comment.parentId
            ? { ...top, replies: [...(top.replies ?? []), { ...comment, replies: [] }] }
            : top,
        );
      });
      onCommentCountChange?.(result.commentCount);
      setDraft("");
      setReplyTo(null);
    } catch (err) {
      pushToast(errorMessage(err, "Could not post comment"), "error");
    } finally {
      setPending(false);
    }
  }

  function patchComment(
    id: string,
    patch: Partial<CommunityCommentItem>,
    parentId: string | null,
  ) {
    setComments((prev) => {
      if (!parentId) {
        return prev.map((item) => (item.id === id ? { ...item, ...patch } : item));
      }
      return prev.map((top) =>
        top.id !== parentId
          ? top
          : {
              ...top,
              replies: (top.replies ?? []).map((reply) =>
                reply.id === id ? { ...reply, ...patch } : reply,
              ),
            },
      );
    });
  }

  function removeComment(id: string, parentId: string | null) {
    setComments((prev) => {
      if (!parentId) return prev.filter((item) => item.id !== id);
      return prev.map((top) =>
        top.id !== parentId
          ? top
          : { ...top, replies: (top.replies ?? []).filter((reply) => reply.id !== id) },
      );
    });
  }

  const replyTarget = replyTo
    ? comments.find((item) => item.id === replyTo)?.author.name
    : null;

  return (
    <section className="mt-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-base font-bold tracking-tight text-ink">
          Comments
          <span className="ml-2 text-xs font-semibold text-ink-muted">
            {pluralize(
              comments.reduce((sum, item) => sum + 1 + (item.replies?.length ?? 0), 0),
              "comment",
            )}
          </span>
        </h2>
        {replyTo ? (
          <button
            type="button"
            onClick={() => setReplyTo(null)}
            className="text-xs font-semibold text-brand hover:underline"
          >
            Cancel reply to {replyTarget}
          </button>
        ) : null}
      </div>

      <div className="mt-2 rounded-2xl border border-border bg-surface">
        <div className="flex items-end gap-2 border-b border-border p-2.5">
          <textarea
            rows={2}
            value={draft}
            maxLength={COMMUNITY_LIMITS.commentBodyMax}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={replyTo ? `Reply to ${replyTarget}…` : "Add a comment…"}
            className="min-h-[2.75rem] flex-1 resize-none border-0 bg-transparent px-1.5 py-1.5 text-sm leading-snug text-ink outline-none placeholder:text-ink-muted"
          />
          <button
            type="button"
            disabled={
              pending ||
              draft.trim().length < COMMUNITY_LIMITS.commentBodyMin ||
              draft.trim().length > COMMUNITY_LIMITS.commentBodyMax
            }
            onClick={() => void submit()}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-xs font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Icon name="send" className="h-3.5 w-3.5" />
            {pending ? "…" : replyTo ? "Reply" : "Post"}
          </button>
        </div>

        {comments.length === 0 ? (
          <p className="px-3 py-5 text-center text-xs text-ink-muted">
            No comments yet. Start the thread.
          </p>
        ) : (
          <ul>
            {comments.map((comment, index) => (
              <li
                key={comment.id}
                className={index < comments.length - 1 ? "border-b border-border" : ""}
              >
                <CommentCard
                  comment={comment}
                  canReply
                  onReply={() => {
                    setReplyTo(comment.id);
                    setDraft("");
                  }}
                  onReport={() => setReportTarget(comment)}
                  onPatch={(patch) => patchComment(comment.id, patch, null)}
                  onDeleted={(count) => {
                    removeComment(comment.id, null);
                    onCommentCountChange?.(count);
                  }}
                />
                {(comment.replies?.length ?? 0) > 0 ? (
                  <ul className="border-t border-border">
                    {comment.replies.map((reply, replyIndex) => (
                      <li
                        key={reply.id}
                        className={[
                          "border-l-2 border-border bg-surface-subtle/40 pl-3 sm:pl-4",
                          replyIndex < comment.replies.length - 1 ? "border-b border-border" : "",
                        ].join(" ")}
                      >
                        <CommentCard
                          comment={reply}
                          canReply={false}
                          onReport={() => setReportTarget(reply)}
                          onPatch={(patch) => patchComment(reply.id, patch, comment.id)}
                          onDeleted={(count) => {
                            removeComment(reply.id, comment.id);
                            onCommentCountChange?.(count);
                          }}
                        />
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      <ReportDialog
        open={reportTarget !== null}
        target={
          reportTarget
            ? {
                type: "comment",
                id: reportTarget.id,
                label: reportTarget.body.slice(0, 120),
              }
            : null
        }
        onClose={() => setReportTarget(null)}
      />
    </section>
  );
}

function CommentCard({
  comment,
  canReply,
  onReply,
  onReport,
  onPatch,
  onDeleted,
}: {
  comment: CommunityCommentItem;
  canReply: boolean;
  onReply?: () => void;
  onReport?: () => void;
  onPatch: (patch: Partial<CommunityCommentItem>) => void;
  onDeleted: (commentCount: number) => void;
}) {
  const { pushToast } = useToast();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pendingEmoji, setPendingEmoji] = useState<CommunityReactionEmoji | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editBody, setEditBody] = useState(comment.body);
  const [savingEdit, setSavingEdit] = useState(false);
  const reactionCounts = comment.reactionCounts ?? emptyReactionCounts();
  const totalReactions = COMMUNITY_REACTION_EMOJIS.reduce(
    (sum, emoji) => sum + (reactionCounts[emoji] ?? 0),
    0,
  );

  async function react(emoji: CommunityReactionEmoji) {
    if (pendingEmoji) return;
    const previous = {
      reactionCounts: { ...reactionCounts },
      myReaction: comment.myReaction,
    };
    const nextCounts = { ...reactionCounts };
    if (comment.myReaction) {
      nextCounts[comment.myReaction] = Math.max(0, (nextCounts[comment.myReaction] ?? 0) - 1);
    }
    const nextMine = comment.myReaction === emoji ? null : emoji;
    if (nextMine) nextCounts[nextMine] = (nextCounts[nextMine] ?? 0) + 1;
    onPatch({ reactionCounts: nextCounts, myReaction: nextMine });
    setPickerOpen(false);
    setPendingEmoji(emoji);
    try {
      const result = await setCommunityCommentReaction(comment.id, emoji);
      onPatch({
        reactionCounts: result.reactionCounts,
        myReaction: result.myReaction,
      });
    } catch (err) {
      onPatch(previous);
      pushToast(errorMessage(err, "Could not save reaction"), "error");
    } finally {
      setPendingEmoji(null);
    }
  }

  async function remove() {
    if (!comment.isMine) return;
    const result = await deleteCommunityComment(comment.id);
    onDeleted(result.commentCount);
    setConfirmDelete(false);
    pushToast("Comment deleted", "success");
  }

  async function saveEdit() {
    if (!comment.isMine || savingEdit) return;
    const next = editBody.trim();
    if (
      next.length < COMMUNITY_LIMITS.commentBodyMin ||
      next.length > COMMUNITY_LIMITS.commentBodyMax
    ) {
      return;
    }
    if (next === comment.body.trim()) {
      setEditing(false);
      return;
    }
    setSavingEdit(true);
    try {
      const { comment: updated } = await updateCommunityComment(comment.id, { body: next });
      onPatch({
        body: updated.body,
        editedAt: updated.editedAt,
        isEdited: updated.isEdited,
        updatedAt: updated.updatedAt,
      });
      setEditing(false);
      pushToast("Comment updated", "success");
    } catch (err) {
      pushToast(errorMessage(err, "Could not update comment"), "error");
    } finally {
      setSavingEdit(false);
    }
  }

  const menuItems: MenuItem[] = [
    ...(!comment.isMine && onReport
      ? ([
          {
            label: "Report",
            icon: "alert",
            onSelect: onReport,
          },
        ] satisfies MenuItem[])
      : []),
    ...(comment.isMine
      ? ([
          {
            label: "Edit",
            icon: "pencil",
            onSelect: () => {
              setEditBody(comment.body);
              setEditing(true);
            },
          },
          "divider",
          {
            label: "Delete",
            icon: "trash",
            tone: "danger",
            onSelect: () => setConfirmDelete(true),
          },
        ] satisfies MenuItem[])
      : []),
  ];

  return (
    <article className="px-3 py-3.5 sm:px-4">
      <div className="flex items-start gap-3">
        <ProfileAvatar
          name={comment.author.name}
          avatarUrl={comment.author.avatarUrl}
          size="sm"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <p className="text-sm font-semibold text-ink">{comment.author.name}</p>
              <p className="text-xs text-ink-muted">
                {timeAgo(comment.createdAt)}
                {comment.isEdited ? (
                  <span className="ml-1.5 font-medium">· edited</span>
                ) : null}
              </p>
            </div>
            {menuItems.length > 0 && !editing ? (
              <Menu
                label="Comment actions"
                align="right"
                triggerClassName="inline-flex h-7 w-7 shrink-0 items-center justify-center text-ink-muted transition hover:text-ink"
                items={menuItems}
              />
            ) : null}
          </div>
          {editing ? (
            <div className="mt-1.5 space-y-2">
              <textarea
                rows={3}
                value={editBody}
                maxLength={COMMUNITY_LIMITS.commentBodyMax}
                onChange={(event) => setEditBody(event.target.value)}
                className="w-full resize-y rounded-xl border border-border bg-surface px-3 py-2 text-sm leading-relaxed text-ink outline-none transition focus:border-brand"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  disabled={savingEdit}
                  onClick={() => {
                    setEditing(false);
                    setEditBody(comment.body);
                  }}
                  className="rounded-lg px-3 py-1.5 text-xs font-semibold text-ink-muted transition hover:bg-surface-subtle hover:text-ink disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={
                    savingEdit ||
                    editBody.trim().length < COMMUNITY_LIMITS.commentBodyMin ||
                    editBody.trim().length > COMMUNITY_LIMITS.commentBodyMax
                  }
                  onClick={() => void saveEdit()}
                  className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {savingEdit ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          ) : (
            <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-ink">
              {comment.body}
            </p>
          )}

          <div className={["mt-2 flex flex-wrap items-center gap-2", editing ? "hidden" : ""].join(" ")}>
            <div className="relative">
              {pickerOpen ? (
                <div className="absolute bottom-full left-0 z-20 pb-2">
                  <div className="flex items-center gap-1 rounded-full border border-border bg-surface p-1.5 shadow-xl shadow-ink/10">
                    {COMMUNITY_REACTION_EMOJIS.map((emoji) => {
                      const count = reactionCounts[emoji] ?? 0;
                      const active = comment.myReaction === emoji;
                      return (
                        <button
                          key={emoji}
                          type="button"
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
                            <span className="text-[10px] font-semibold text-ink-muted">
                              {count}
                            </span>
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
                onClick={() => setPickerOpen((prev) => !prev)}
                className={[
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition disabled:opacity-60",
                  comment.myReaction
                    ? "border-brand bg-brand-soft text-ink"
                    : "border-border bg-surface text-ink-muted hover:border-border-strong hover:text-ink",
                ].join(" ")}
              >
                <span aria-hidden>{comment.myReaction ?? "🙂"}</span>
                <span>{totalReactions > 0 ? totalReactions : "React"}</span>
              </button>
            </div>

            {canReply ? (
              <button
                type="button"
                onClick={onReply}
                className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs font-semibold text-ink-muted transition hover:border-border-strong hover:text-ink"
              >
                <Icon name="message" className="h-3.5 w-3.5" />
                Reply
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this comment?"
        description="It will be removed from the thread. Replies under it are removed too."
        confirmLabel="Delete comment"
        pendingLabel="Deleting…"
        tone="danger"
        onClose={() => setConfirmDelete(false)}
        onConfirm={async () => {
          try {
            await remove();
          } catch (err) {
            pushToast(errorMessage(err, "Could not delete comment"), "error");
            throw err;
          }
        }}
      />
    </article>
  );
}

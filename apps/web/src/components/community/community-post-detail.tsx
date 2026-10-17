"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { COMMUNITY_POST_CREATE_POINTS } from "@coddle/shared";
import { CommunityComments } from "@/components/community/community-comments";
import { CommunityPostCard } from "@/components/community/community-post-card";
import { EditPostDialog } from "@/components/community/edit-post-dialog";
import { QuotePostDialog, type QuotePostDraft } from "@/components/community/quote-post-dialog";
import { ReportDialog } from "@/components/community/report-dialog";
import { useAppUserActions } from "@/components/app/app-user-context";
import { Icon } from "@/components/ui/icon";
import { useToast } from "@/components/app/toast";
import { errorMessage } from "@/lib/api-client";
import {
  createCommunityPost,
  peekCommunitySearchReturn,
  type CommunityCommentItem,
  type CommunityPostItem,
} from "@/lib/community";

export function CommunityPostDetailView({
  initialPost,
  initialComments,
}: {
  initialPost: CommunityPostItem;
  initialComments: CommunityCommentItem[];
}) {
  const router = useRouter();
  const { pushToast, dismissToast } = useToast();
  const { refreshUser } = useAppUserActions();
  const [post, setPost] = useState(initialPost);
  const [quoteTarget, setQuoteTarget] = useState<CommunityPostItem | null>(null);
  const [editTarget, setEditTarget] = useState<CommunityPostItem | null>(null);
  const [reportTarget, setReportTarget] = useState<CommunityPostItem | null>(null);
  const [backHref, setBackHref] = useState("/community");
  const [backLabel, setBackLabel] = useState("Back to community");

  useEffect(() => {
    const returnTo = peekCommunitySearchReturn();
    if (returnTo) {
      setBackHref(returnTo);
      setBackLabel("Back to search");
    }
  }, []);

  function queueQuote(draft: QuotePostDraft) {
    setQuoteTarget(null);
    const creatingId = pushToast("Creating quote…", { tone: "info", sticky: true });
    void createCommunityPost({
      kind: "discussion",
      topic: "general",
      title: draft.title,
      body: draft.body,
      quotePostId: draft.quotePostId,
    })
      .then(({ post: created }) => {
        dismissToast(creatingId);
        void refreshUser();
        pushToast(`Quote published · +${COMMUNITY_POST_CREATE_POINTS} pts`, {
          tone: "success",
          durationMs: 7000,
          action: {
            label: "Show",
            onClick: () => router.push(`/community/${created.slug}`),
          },
        });
      })
      .catch((err: unknown) => {
        dismissToast(creatingId);
        pushToast(errorMessage(err, "Could not publish quote"), "error");
      });
  }

  function goBack() {
    const returnTo = peekCommunitySearchReturn();
    if (returnTo) {
      router.push(returnTo);
      return;
    }
    router.push(backHref);
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-8 sm:py-10">
      <button
        type="button"
        onClick={goBack}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-muted transition hover:text-ink"
      >
        <Icon name="arrowLeft" className="h-4 w-4" />
        {backLabel}
      </button>

      <div className="mt-6">
        <CommunityPostCard
          post={post}
          detail
          onPatch={(patch) => setPost((prev) => ({ ...prev, ...patch }))}
          onDeleted={() => {
            pushToast("Post deleted", "success");
            router.push("/community");
          }}
          onQuote={setQuoteTarget}
          onEdit={setEditTarget}
          onReport={setReportTarget}
        />
      </div>

      <CommunityComments
        postId={post.id}
        initialComments={initialComments}
        onCommentCountChange={(commentCount) =>
          setPost((prev) => ({ ...prev, commentCount }))
        }
      />

      <QuotePostDialog
        open={quoteTarget !== null}
        post={quoteTarget}
        onClose={() => setQuoteTarget(null)}
        onQueue={queueQuote}
      />
      <EditPostDialog
        open={editTarget !== null}
        post={editTarget}
        onClose={() => setEditTarget(null)}
        onSaved={setPost}
      />
      <ReportDialog
        open={reportTarget !== null}
        target={
          reportTarget
            ? { type: "post", id: reportTarget.id, label: reportTarget.title }
            : null
        }
        onClose={() => setReportTarget(null)}
      />
    </div>
  );
}

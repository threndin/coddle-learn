"use client";

import { useState, useTransition } from "react";
import { followProfile, unfollowProfile } from "@/lib/profiles";
import { errorMessage } from "@/lib/api-client";
import { useToast } from "@/components/app/toast";

/** Compact follow / unfollow control for profile discovery surfaces. */
export function FollowButton({
  username,
  initialFollowing = false,
  className = "",
}: {
  username: string;
  initialFollowing?: boolean;
  className?: string;
}) {
  const { pushToast } = useToast();
  const [following, setFollowing] = useState(initialFollowing);
  const [pending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      try {
        const result = following
          ? await unfollowProfile(username)
          : await followProfile(username);
        setFollowing(result.isFollowing);
      } catch (err) {
        pushToast(errorMessage(err, "Could not update follow"), "error");
      }
    });
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => void toggle()}
      className={[
        "shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition disabled:opacity-60",
        following
          ? "border border-border text-ink-muted hover:border-border-strong hover:text-ink"
          : "bg-brand text-white hover:brightness-110",
        className,
      ].join(" ")}
    >
      {pending ? "…" : following ? "Following" : "Follow"}
    </button>
  );
}

"use client";

import Link from "next/link";
import { ProfileAvatar } from "@/components/onboarding/profile-avatar";
import { AvailabilityBadge, ApplicationStatusBadge } from "@/components/mentors/mentor-badges";
import { mentorPath, type MentorCard as MentorCardData } from "@/lib/mentors";

export function MentorCard({ mentor }: { mentor: MentorCardData }) {
  return (
    <article className="group/card flex flex-col rounded-2xl border border-border bg-surface p-5 transition hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-md hover:shadow-brand/5">
      <div className="flex items-start gap-4">
        <Link href={mentorPath(mentor.username)} className="shrink-0">
          <ProfileAvatar name={mentor.name} avatarUrl={mentor.avatarUrl} size="xl" />
        </Link>
        <div className="min-w-0 flex-1">
          <AvailabilityBadge availability={mentor.availability} />
          <Link href={mentorPath(mentor.username)}>
            <h2 className="mt-2 font-display text-lg font-bold leading-snug tracking-tight text-ink transition group-hover/card:text-brand">
              {mentor.name}
            </h2>
          </Link>
          <p className="mt-0.5 font-mono text-[11px] text-ink-muted">@{mentor.username}</p>
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-ink-muted">{mentor.headline}</p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-border/70 pt-3">
        <p className="text-xs text-ink-muted">
          {mentor.openProgramCount === 1
            ? "1 open program"
            : `${mentor.openProgramCount} open programs`}
        </p>
        {mentor.viewerApplication ? (
          <ApplicationStatusBadge status={mentor.viewerApplication.status} />
        ) : (
          <Link
            href={mentorPath(mentor.username)}
            className="text-xs font-semibold text-brand transition hover:text-brand-deep"
          >
            View profile →
          </Link>
        )}
      </div>
    </article>
  );
}

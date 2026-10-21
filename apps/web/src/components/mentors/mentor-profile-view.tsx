"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { MENTOR_TOPIC_BLURBS, isMentorTopic, mentorAcceptsApplications } from "@coddle/shared";
import { useToast } from "@/components/app/toast";
import { ApplyDialog } from "@/components/mentors/apply-dialog";
import {
  ApplicationStatusBadge,
  AvailabilityBadge,
  topicLabel,
} from "@/components/mentors/mentor-badges";
import { ProfileAvatar } from "@/components/onboarding/profile-avatar";
import { ProfileLink } from "@/components/profile/profile-link";
import { Icon } from "@/components/ui/icon";
import { timeAgo } from "@/lib/format";
import type { MentorCard, MentorProgram } from "@/lib/mentors";

export function MentorProfileSkeleton() {
  return (
    <div className="min-h-full bg-surface-subtle" aria-busy aria-label="Loading mentor">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 sm:py-10">
          <Bone className="h-4 w-28" />
          <div className="mt-8 flex flex-col gap-6 sm:flex-row sm:items-end">
            <Bone className="h-28 w-28 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-3">
              <Bone className="h-3 w-16" />
              <Bone className="h-8 w-56" />
              <Bone className="h-4 w-40" />
              <Bone className="h-5 w-full max-w-xl" />
            </div>
            <Bone className="h-10 w-32 rounded-xl" />
          </div>
          <div className="mt-8 grid grid-cols-3 gap-px overflow-hidden rounded-2xl border border-border bg-border">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="bg-surface px-4 py-4">
                <Bone className="h-3 w-16" />
                <Bone className="mt-2 h-6 w-10" />
              </div>
            ))}
          </div>
        </div>
      </header>
      <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8">
        <Bone className="h-6 w-24" />
        <Bone className="mt-3 h-4 w-full max-w-2xl" />
        <Bone className="mt-2 h-4 w-2/3 max-w-xl" />
        <div className="mt-5 flex flex-wrap gap-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <Bone key={index} className="h-7 w-20 rounded-md" />
          ))}
        </div>
        <div className="mt-10 grid gap-4 lg:grid-cols-2">
          <Bone className="h-52 rounded-2xl" />
          <Bone className="h-52 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

function Bone({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-surface-subtle ${className}`} />;
}

export function MentorProfileView({ initial }: { initial: MentorCard }) {
  const { pushToast } = useToast();
  const [mentor, setMentor] = useState(initial);
  const [applyProgram, setApplyProgram] = useState<MentorProgram | null>(null);

  const accepting = mentorAcceptsApplications(mentor.availability);
  const openPrograms = useMemo(
    () => mentor.programs.filter((program) => program.status === "open"),
    [mentor.programs],
  );
  const applyable = openPrograms.filter(
    (program) => accepting && program.seatsLeft !== 0 && !program.viewerApplication && !mentor.isOwner,
  );
  const firstName = mentor.name.trim().split(/\s+/)[0] || mentor.name;

  function handleApplied(programId: string, applicationId: string, status: string) {
    setMentor((prev) => ({
      ...prev,
      viewerApplication: { id: applicationId, status },
      programs: prev.programs.map((program) =>
        program.id === programId
          ? { ...program, viewerApplication: { id: applicationId, status } }
          : program,
      ),
    }));
    setApplyProgram(null);
    pushToast("Application sent. The mentor will review it.", "success");
  }

  return (
    <div className="min-h-full bg-surface-subtle">
      <header className="relative overflow-hidden border-b border-border bg-surface">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute inset-0 grid-bg opacity-60" />
          <div className="absolute inset-0 brand-glow" />
          <div className="absolute -left-32 top-0 h-[28rem] w-[28rem] rounded-full bg-brand/10 blur-3xl" />
          <div className="absolute -right-20 bottom-0 h-72 w-72 rounded-full bg-brand-light/20 blur-3xl" />
        </div>

        <div className="relative mx-auto w-full max-w-6xl px-5 pb-8 pt-8 sm:px-8 sm:pb-10 sm:pt-10">
          <Link
            href="/mentors"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-muted transition hover:text-ink"
          >
            <Icon name="arrowLeft" className="h-4 w-4" />
            All mentors
          </Link>

          <div className="mt-8 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex min-w-0 flex-col gap-5 sm:flex-row sm:items-end">
              <div className="relative shrink-0">
                <div
                  className="absolute -inset-2 rounded-full bg-gradient-to-br from-brand/30 via-brand-light/20 to-transparent blur-md"
                  aria-hidden
                />
                <ProfileAvatar name={mentor.name} avatarUrl={mentor.avatarUrl} size="xl" />
              </div>
              <div className="min-w-0">
                <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-brand">
                  Mentor
                </p>
                <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
                  {mentor.name}
                </h1>
                <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-muted">
                  <ProfileLink
                    user={{ username: mentor.username }}
                    className="font-mono text-ink transition hover:text-brand"
                  >
                    @{mentor.username}
                  </ProfileLink>
                  {mentor.experienceYears != null ? (
                    <>
                      <span className="text-border" aria-hidden>
                        ·
                      </span>
                      <span>{mentor.experienceYears} years</span>
                    </>
                  ) : null}
                  {mentor.timezone ? (
                    <>
                      <span className="text-border" aria-hidden>
                        ·
                      </span>
                      <span>{mentor.timezone}</span>
                    </>
                  ) : null}
                </p>
                <p className="mt-3 max-w-2xl text-base font-medium leading-relaxed text-ink">
                  {mentor.headline}
                </p>
                <div className="mt-3">
                  <AvailabilityBadge availability={mentor.availability} />
                </div>
              </div>
            </div>

            {mentor.isOwner ? (
              <Link
                href="/mentors/me"
                className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand/25 transition hover:brightness-110"
              >
                <Icon name="pencil" className="h-4 w-4" />
                Manage programs
              </Link>
            ) : applyable.length === 1 ? (
              <button
                type="button"
                onClick={() => setApplyProgram(applyable[0]!)}
                className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand/25 transition hover:brightness-110"
              >
                Apply to join
              </button>
            ) : applyable.length > 1 ? (
              <a
                href="#mentor-programs"
                className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand/25 transition hover:brightness-110"
              >
                View programs
              </a>
            ) : null}
          </div>

          <dl className="mt-8 grid grid-cols-3 gap-px overflow-hidden rounded-2xl border border-border bg-border">
            <Metric label="Open programs" value={String(mentor.openProgramCount)} />
            <Metric
              label="Experience"
              value={mentor.experienceYears != null ? `${mentor.experienceYears}y` : "—"}
            />
            <Metric label="Topics" value={String(mentor.topics.length)} />
          </dl>
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8">
        <section>
          <h2 className="font-display text-xl font-bold text-ink">About</h2>
          <p className="mt-3 max-w-3xl whitespace-pre-wrap text-sm leading-relaxed text-ink/90">
            {mentor.about}
          </p>
          <div className="mt-5 flex flex-wrap gap-1.5">
            {mentor.topics.map((topic) => (
              <span
                key={topic}
                className="rounded-md bg-surface px-2.5 py-1 text-xs font-medium text-ink ring-1 ring-border"
              >
                {topicLabel(topic)}
              </span>
            ))}
            {mentor.skills.map((skill) => (
              <span
                key={skill.slug}
                className="rounded-md bg-surface px-2.5 py-1 text-xs font-medium text-ink-muted ring-1 ring-border"
              >
                {skill.name}
              </span>
            ))}
          </div>
        </section>

        <section id="mentor-programs" className="mt-10 scroll-mt-8">
          <h2 className="font-display text-xl font-bold text-ink">Programs</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Apply to a program. {firstName} reviews every request before anyone joins.
          </p>

          {openPrograms.length === 0 ? (
            <p className="mt-4 rounded-2xl border border-dashed border-border bg-surface p-6 text-sm text-ink-muted">
              No open programs right now.
            </p>
          ) : (
            <ul className="mt-5 grid gap-4 lg:grid-cols-2">
              {openPrograms.map((program) => (
                <ProgramCard
                  key={program.id}
                  program={program}
                  accepting={accepting}
                  isOwner={mentor.isOwner}
                  onApply={() => setApplyProgram(program)}
                />
              ))}
            </ul>
          )}
        </section>
      </div>

      <ApplyDialog
        open={Boolean(applyProgram)}
        username={mentor.username}
        mentorName={mentor.name}
        program={applyProgram}
        onClose={() => setApplyProgram(null)}
        onApplied={(application) =>
          handleApplied(application.program.id, application.id, application.status)
        }
      />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface px-4 py-4">
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">{label}</dt>
      <dd className="mt-1 font-display text-xl font-bold tabular-nums text-ink">{value}</dd>
    </div>
  );
}

function ProgramCard({
  program,
  accepting,
  isOwner,
  onApply,
}: {
  program: MentorProgram;
  accepting: boolean;
  isOwner: boolean;
  onApply: () => void;
}) {
  const full = program.seatsLeft === 0;
  const canApply = accepting && !full && !program.viewerApplication && !isOwner;
  const filled =
    program.capacity == null
      ? null
      : Math.min(100, Math.round((program.approvedCount / program.capacity) * 100));
  const blurb = isMentorTopic(program.kind) ? MENTOR_TOPIC_BLURBS[program.kind] : null;

  return (
    <li className="flex flex-col rounded-2xl border border-border bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-brand">
            {topicLabel(program.kind)}
          </p>
          <h3 className="mt-1 font-display text-lg font-bold leading-snug text-ink">
            {program.title}
          </h3>
        </div>
        {program.viewerApplication ? (
          <ApplicationStatusBadge status={program.viewerApplication.status} />
        ) : null}
      </div>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-muted">{program.summary}</p>
      {program.description ? (
        <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-ink/85">{program.description}</p>
      ) : blurb ? (
        <p className="mt-3 text-sm leading-relaxed text-ink-muted">{blurb}</p>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-ink-muted">
        <span className="inline-flex items-center gap-1">
          <Icon name="users" className="h-3.5 w-3.5" />
          {program.capacity == null
            ? `${program.approvedCount} approved`
            : `${program.approvedCount} of ${program.capacity} seats`}
        </span>
        {program.durationWeeks ? (
          <span className="inline-flex items-center gap-1">
            <Icon name="clock" className="h-3.5 w-3.5" />
            {program.durationWeeks} weeks
          </span>
        ) : null}
        <span>Opened {timeAgo(program.createdAt)}</span>
      </div>
      {filled != null ? (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-subtle">
          <div className="h-full rounded-full bg-brand" style={{ width: `${filled}%` }} />
        </div>
      ) : null}

      {canApply ? (
        <button
          type="button"
          onClick={onApply}
          className="mt-4 inline-flex self-start rounded-xl bg-brand px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-brand/90"
        >
          Apply to join
        </button>
      ) : null}
      {!isOwner && !accepting ? (
        <p className="mt-4 text-sm text-ink-muted">Not accepting applications right now.</p>
      ) : null}
      {full && !program.viewerApplication ? (
        <p className="mt-4 text-sm text-ink-muted">This program is full.</p>
      ) : null}
    </li>
  );
}

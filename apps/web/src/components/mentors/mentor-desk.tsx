"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  MENTOR_PROGRAM_STATUS_LABELS,
  isMentorProgramStatus,
  isMentorTopic,
} from "@coddle/shared";
import { useToast } from "@/components/app/toast";
import {
  ApplicationStatusBadge,
  AvailabilityBadge,
  topicLabel,
} from "@/components/mentors/mentor-badges";
import { MentorProfileFormDialog } from "@/components/mentors/mentor-profile-form-dialog";
import { ProgramDialog } from "@/components/mentors/program-dialog";
import { ProfileAvatar } from "@/components/onboarding/profile-avatar";
import { ProfileLink } from "@/components/profile/profile-link";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Icon } from "@/components/ui/icon";
import { errorMessage } from "@/lib/api-client";
import { timeAgo } from "@/lib/format";
import {
  approveMentorshipApplication,
  completeMentorshipApplication,
  declineMentorshipApplication,
  mentorPath,
  withdrawMentorshipApplication,
  type MentorCard,
  type MentorProgram,
  type MentorshipApplication,
  type MentorshipDesk,
} from "@/lib/mentors";

type DeskTab = "inbox" | "programs" | "applied";

export function MentorDesk({ initial }: { initial: MentorshipDesk }) {
  const { pushToast } = useToast();
  const [desk, setDesk] = useState(initial);
  const [tab, setTab] = useState<DeskTab>(
    initial.counts.pendingIncoming > 0 ? "inbox" : initial.profile ? "programs" : "applied",
  );
  const [profileOpen, setProfileOpen] = useState(false);
  const [programOpen, setProgramOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState<MentorProgram | null>(null);
  const [pendingAction, setPendingAction] = useState<{
    kind: "approve" | "decline" | "complete" | "withdraw";
    application: MentorshipApplication;
  } | null>(null);

  const pendingInbox = useMemo(
    () => desk.incoming.filter((row) => row.status === "pending"),
    [desk.incoming],
  );
  const activeInbox = useMemo(
    () => desk.incoming.filter((row) => row.status === "approved"),
    [desk.incoming],
  );
  const pastInbox = useMemo(
    () => desk.incoming.filter((row) => row.status !== "pending" && row.status !== "approved"),
    [desk.incoming],
  );

  function patchApplication(updated: MentorshipApplication) {
    setDesk((prev) => ({
      ...prev,
      incoming: prev.incoming.map((row) => (row.id === updated.id ? updated : row)),
      outgoing: prev.outgoing.map((row) => (row.id === updated.id ? updated : row)),
      counts: {
        pendingIncoming: prev.incoming
          .map((row) => (row.id === updated.id ? updated : row))
          .filter((row) => row.status === "pending").length,
        activeMentees: prev.incoming
          .map((row) => (row.id === updated.id ? updated : row))
          .filter((row) => row.status === "approved").length,
        outgoingPending: prev.outgoing
          .map((row) => (row.id === updated.id ? updated : row))
          .filter((row) => row.status === "pending").length,
      },
    }));
  }

  async function runAction() {
    if (!pendingAction) return;
    const { kind, application } = pendingAction;
    try {
      const { application: updated } =
        kind === "approve"
          ? await approveMentorshipApplication(application.id)
          : kind === "decline"
            ? await declineMentorshipApplication(application.id)
            : kind === "complete"
              ? await completeMentorshipApplication(application.id)
              : await withdrawMentorshipApplication(application.id);
      patchApplication(updated);
      setPendingAction(null);
      pushToast(
        kind === "approve"
          ? "Application approved"
          : kind === "decline"
            ? "Application declined"
            : kind === "complete"
              ? "Mentorship marked complete"
              : "Application withdrawn",
        "success",
      );
    } catch (err) {
      pushToast(errorMessage(err, "Could not update that application"), "error");
      throw err;
    }
  }

  function handleProfileSaved(mentor: MentorCard) {
    setDesk((prev) => ({ ...prev, profile: mentor }));
    setProfileOpen(false);
    setTab("programs");
    pushToast(desk.profile ? "Mentor profile updated" : "You are now listed as a mentor", "success");
  }

  function handleProgramSaved(program: MentorProgram) {
    setDesk((prev) => {
      if (!prev.profile) return prev;
      const exists = prev.profile.programs.some((item) => item.id === program.id);
      const programs = exists
        ? prev.profile.programs.map((item) => (item.id === program.id ? program : item))
        : [...prev.profile.programs, program];
      return {
        ...prev,
        profile: {
          ...prev.profile,
          programs,
          openProgramCount: programs.filter((item) => item.status === "open").length,
        },
      };
    });
    setProgramOpen(false);
    setEditingProgram(null);
    pushToast(editingProgram ? "Program updated" : "Program created", "success");
  }

  const profile = desk.profile;

  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-8">
      <Link
        href="/mentors"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-muted transition hover:text-ink"
      >
        <Icon name="arrowLeft" className="h-4 w-4" />
        Mentors
      </Link>

      <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            Mentor desk
          </h1>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">
            Offer programs, review who applies, and approve the learners you want to work with.
          </p>
        </div>
        {profile ? (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setProfileOpen(true)}
              className="rounded-xl border border-border bg-surface px-3.5 py-2 text-sm font-semibold text-ink"
            >
              Edit profile
            </button>
            <button
              type="button"
              onClick={() => {
                setEditingProgram(null);
                setProgramOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-brand px-3.5 py-2 text-sm font-semibold text-white"
            >
              <Icon name="plus" className="h-4 w-4" />
              New program
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setProfileOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-brand px-3.5 py-2 text-sm font-semibold text-white"
          >
            <Icon name="users" className="h-4 w-4" />
            Become a mentor
          </button>
        )}
      </div>

      {profile ? (
        <div className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-surface p-4">
          <ProfileAvatar name={profile.name} avatarUrl={profile.avatarUrl} size="md" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-ink">{profile.headline}</p>
            <p className="text-sm text-ink-muted">
              {desk.counts.pendingIncoming} pending · {desk.counts.activeMentees} active mentees
            </p>
          </div>
          <AvailabilityBadge availability={profile.availability} />
          <Link
            href={mentorPath(profile.username)}
            className="text-sm font-semibold text-brand"
          >
            Public profile →
          </Link>
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border border-dashed border-border bg-surface p-6">
          <h2 className="font-display text-lg font-bold text-ink">Offer mentorship</h2>
          <p className="mt-2 text-sm text-ink-muted">
            Publish a profile and at least one program. Learners apply; you approve who joins.
          </p>
        </div>
      )}

      <div
        className="mt-6 inline-flex rounded-xl border border-border bg-surface p-0.5"
        role="tablist"
        aria-label="Desk sections"
      >
        {(
          [
            ["inbox", "Inbox", desk.counts.pendingIncoming],
            ["programs", "Programs", profile?.programs.length ?? 0],
            ["applied", "My applications", desk.counts.outgoingPending],
          ] as const
        ).map(([id, label, count]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={[
              "inline-flex items-center gap-1.5 rounded-[10px] px-2.5 py-1.5 text-xs font-semibold transition",
              tab === id ? "bg-brand text-white" : "text-ink-muted hover:text-ink",
            ].join(" ")}
          >
            {label}
            <span className="tabular-nums opacity-80">{count}</span>
          </button>
        ))}
      </div>

      {tab === "inbox" ? (
        <div className="mt-6 space-y-8">
          <ApplicationGroup
            title="Needs a decision"
            empty="No pending applications."
            applications={pendingInbox}
            onApprove={(application) => setPendingAction({ kind: "approve", application })}
            onDecline={(application) => setPendingAction({ kind: "decline", application })}
          />
          <ApplicationGroup
            title="Active mentees"
            empty="No approved mentees yet."
            applications={activeInbox}
            onComplete={(application) => setPendingAction({ kind: "complete", application })}
          />
          {pastInbox.length > 0 ? (
            <ApplicationGroup title="Earlier" applications={pastInbox} />
          ) : null}
        </div>
      ) : null}

      {tab === "programs" ? (
        <div className="mt-6">
          {!profile || profile.programs.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border bg-surface p-6 text-sm text-ink-muted">
              {profile
                ? "Create a program so learners have something to apply to."
                : "Become a mentor first, then open a program."}
            </p>
          ) : (
            <ul className="grid gap-4">
              {profile.programs.map((program) => {
                const statusLabel = isMentorProgramStatus(program.status)
                  ? MENTOR_PROGRAM_STATUS_LABELS[program.status]
                  : program.status;
                return (
                  <li key={program.id} className="rounded-2xl border border-border bg-surface p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                          {topicLabel(program.kind)} · {statusLabel}
                        </p>
                        <h3 className="mt-1 font-display text-lg font-bold text-ink">
                          {program.title}
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingProgram(program);
                          setProgramOpen(true);
                        }}
                        className="rounded-xl border border-border px-3 py-1.5 text-xs font-semibold text-ink"
                      >
                        Edit
                      </button>
                    </div>
                    <p className="mt-2 text-sm text-ink-muted">{program.summary}</p>
                    <p className="mt-3 text-xs text-ink-muted">
                      {program.capacity == null
                        ? `${program.approvedCount} approved`
                        : `${program.approvedCount} of ${program.capacity} seats filled`}
                      {program.durationWeeks ? ` · ${program.durationWeeks} weeks` : ""}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}

      {tab === "applied" ? (
        <div className="mt-6">
          {desk.outgoing.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-surface p-6">
              <p className="text-sm text-ink-muted">You have not applied to a program yet.</p>
              <Link
                href="/mentors"
                className="mt-3 inline-flex text-sm font-semibold text-brand"
              >
                Browse mentors →
              </Link>
            </div>
          ) : (
            <ul className="grid gap-4">
              {desk.outgoing.map((application) => (
                <li key={application.id} className="rounded-2xl border border-border bg-surface p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <Link
                        href={mentorPath(application.mentor.username)}
                        className="font-display text-lg font-bold text-ink hover:text-brand"
                      >
                        {application.program.title}
                      </Link>
                      <p className="mt-1 text-sm text-ink-muted">
                        with {application.mentor.name} · {timeAgo(application.createdAt)}
                      </p>
                    </div>
                    <ApplicationStatusBadge status={application.status} />
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-ink/90">{application.message}</p>
                  {application.mentorNote ? (
                    <p className="mt-3 text-sm text-ink-muted">Mentor note: {application.mentorNote}</p>
                  ) : null}
                  {application.status === "pending" ? (
                    <button
                      type="button"
                      onClick={() => setPendingAction({ kind: "withdraw", application })}
                      className="mt-4 text-sm font-semibold text-ink-muted hover:text-ink"
                    >
                      Withdraw
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      <MentorProfileFormDialog
        open={profileOpen}
        initial={profile}
        onClose={() => setProfileOpen(false)}
        onSaved={handleProfileSaved}
      />
      <ProgramDialog
        open={programOpen}
        initial={editingProgram}
        defaultKind={profile?.topics[0] && isMentorTopic(profile.topics[0]) ? profile.topics[0] : "learning"}
        onClose={() => {
          setProgramOpen(false);
          setEditingProgram(null);
        }}
        onSaved={handleProgramSaved}
      />
      <ConfirmDialog
        open={Boolean(pendingAction)}
        title={
          pendingAction?.kind === "approve"
            ? "Approve this learner?"
            : pendingAction?.kind === "decline"
              ? "Decline this application?"
              : pendingAction?.kind === "complete"
                ? "Mark this mentorship complete?"
                : "Withdraw your application?"
        }
        description={
          pendingAction?.kind === "approve"
            ? `${pendingAction.application.mentee.name} will join ${pendingAction.application.program.title}.`
            : pendingAction?.kind === "complete"
              ? "This awards the Mentor achievement the first time you finish a program."
              : pendingAction?.kind === "decline"
                ? "They will see the declined status on their application."
                : "You can apply again later if the program is still open."
        }
        confirmLabel={
          pendingAction?.kind === "approve"
            ? "Approve"
            : pendingAction?.kind === "decline"
              ? "Decline"
              : pendingAction?.kind === "complete"
                ? "Complete"
                : "Withdraw"
        }
        tone={pendingAction?.kind === "decline" || pendingAction?.kind === "withdraw" ? "danger" : "default"}
        onConfirm={runAction}
        onClose={() => setPendingAction(null)}
      />
    </div>
  );
}

function ApplicationGroup({
  title,
  empty,
  applications,
  onApprove,
  onDecline,
  onComplete,
}: {
  title: string;
  empty?: string;
  applications: MentorshipApplication[];
  onApprove?: (application: MentorshipApplication) => void;
  onDecline?: (application: MentorshipApplication) => void;
  onComplete?: (application: MentorshipApplication) => void;
}) {
  return (
    <section>
      <h2 className="font-display text-lg font-bold text-ink">{title}</h2>
      {applications.length === 0 ? (
        <p className="mt-3 text-sm text-ink-muted">{empty}</p>
      ) : (
        <ul className="mt-3 grid gap-3">
          {applications.map((application) => (
            <li key={application.id} className="rounded-2xl border border-border bg-surface p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <ProfileLink user={application.mentee} className="shrink-0">
                    <ProfileAvatar
                      name={application.mentee.name}
                      avatarUrl={application.mentee.avatarUrl}
                      size="sm"
                    />
                  </ProfileLink>
                  <div className="min-w-0">
                    <p className="font-semibold text-ink">
                      <ProfileLink
                        user={application.mentee}
                        className="transition hover:text-brand"
                      >
                        {application.mentee.name}
                      </ProfileLink>
                    </p>
                    <p className="text-sm text-ink-muted">
                      {application.program.title} · {timeAgo(application.createdAt)}
                    </p>
                  </div>
                </div>
                <ApplicationStatusBadge status={application.status} />
              </div>
              <p className="mt-3 text-sm leading-relaxed text-ink/90">{application.message}</p>
              {application.goals ? (
                <p className="mt-2 text-sm text-ink-muted">Goals: {application.goals}</p>
              ) : null}
              {application.mentorNote ? (
                <p className="mt-2 text-sm text-ink-muted">Note: {application.mentorNote}</p>
              ) : null}
              {onApprove || onDecline || onComplete ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {onApprove ? (
                    <button
                      type="button"
                      onClick={() => onApprove(application)}
                      className="rounded-xl bg-brand px-3 py-1.5 text-sm font-semibold text-white"
                    >
                      Approve
                    </button>
                  ) : null}
                  {onDecline ? (
                    <button
                      type="button"
                      onClick={() => onDecline(application)}
                      className="rounded-xl border border-border px-3 py-1.5 text-sm font-semibold text-ink"
                    >
                      Decline
                    </button>
                  ) : null}
                  {onComplete ? (
                    <button
                      type="button"
                      onClick={() => onComplete(application)}
                      className="rounded-xl border border-border px-3 py-1.5 text-sm font-semibold text-ink"
                    >
                      Mark complete
                    </button>
                  ) : null}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

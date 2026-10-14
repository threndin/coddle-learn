"use client";

import Link from "next/link";
import {
  SKILL_STATUS_LABELS,
  type SkillStatus,
} from "@coddle/shared";
import type { SkillNode } from "@/lib/skills";

const STATUS_HINT: Record<SkillStatus, string> = {
  locked:
    "Not on your graph yet. Start a related course, roadmap, or project — or mark interest in onboarding/profile.",
  interested:
    "You marked interest. Prove it with an assessment pass or project submission — finishing a course alone is not enough.",
  learning:
    "You are actively learning this through a course, roadmap, or started project. Pass an assessment or submit a project to demonstrate it.",
  demonstrated:
    "You proved this skill via a passed assessment or project submission. Credentials tied to that work may elevate it further.",
  credentialed:
    "A verifiable credential backs this skill from an assessment or project.",
};

function StatusBadge({ status }: { status: SkillStatus }) {
  const styles: Record<SkillStatus, string> = {
    locked: "border-dashed border-ink-muted/40 bg-transparent text-ink-muted",
    interested: "border-brand/30 bg-brand-soft/60 text-brand-deep",
    learning: "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-200",
    demonstrated: "border-brand/50 bg-brand/10 text-brand",
    credentialed: "border-teal-500/50 bg-teal-500/10 text-teal-800 dark:text-teal-200",
  };
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-wide ${styles[status]}`}
    >
      {SKILL_STATUS_LABELS[status]}
    </span>
  );
}

function NeighborList({
  title,
  items,
  onSelect,
}: {
  title: string;
  items: SkillNode[];
  onSelect: (slug: string) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
        {title}
      </p>
      <ul className="mt-2 flex flex-wrap gap-2">
        {items.map((item) => (
          <li key={item.slug}>
            <button
              type="button"
              onClick={() => onSelect(item.slug)}
              className="rounded-lg border border-ink/10 bg-surface px-2.5 py-1 text-sm text-ink transition hover:border-brand/40 hover:text-brand"
            >
              {item.name}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function EvidenceRow({ label, value }: { label: string; value: number | boolean }) {
  if (typeof value === "boolean") {
    if (!value) return null;
    return (
      <li className="flex justify-between gap-4 text-sm">
        <span className="text-ink-muted">{label}</span>
        <span className="font-medium text-ink">Yes</span>
      </li>
    );
  }
  if (value <= 0) return null;
  return (
    <li className="flex justify-between gap-4 text-sm">
      <span className="text-ink-muted">{label}</span>
      <span className="font-medium text-ink">{value}</span>
    </li>
  );
}

export function SkillDetailPanel({
  skill,
  prerequisites,
  leadsTo,
  onSelect,
  onClose,
}: {
  skill: SkillNode;
  prerequisites: SkillNode[];
  leadsTo: SkillNode[];
  onSelect: (slug: string) => void;
  onClose: () => void;
}) {
  const { evidence } = skill;
  const hasEvidence =
    evidence.interested ||
    evidence.coursesLearning > 0 ||
    evidence.roadmapsLearning > 0 ||
    evidence.projectsStarted > 0 ||
    evidence.assessmentsPassed > 0 ||
    evidence.projectsSubmitted > 0 ||
    evidence.credentialsIssued > 0;

  return (
    <aside className="flex h-full flex-col bg-[linear-gradient(180deg,var(--surface-subtle),var(--surface))] lg:border-l lg:border-ink/10">
      <div className="flex items-start justify-between gap-3 border-b border-ink/10 px-5 py-4">
        <div>
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
            {skill.category}
          </p>
          <h2 className="mt-1 font-display text-2xl font-bold tracking-tight text-ink">
            {skill.name}
          </h2>
          <div className="mt-2">
            <StatusBadge status={skill.status} />
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1.5 text-ink-muted transition hover:bg-surface hover:text-ink"
          aria-label="Close skill details"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.75">
            <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
        <p className="text-sm leading-relaxed text-ink-muted">{STATUS_HINT[skill.status]}</p>

        <div className="rounded-xl border border-ink/8 bg-surface/80 p-3.5">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
            Evidence
          </p>
          {hasEvidence ? (
            <ul className="mt-2.5 space-y-2">
              <EvidenceRow label="Marked interest" value={evidence.interested} />
              <EvidenceRow label="Courses in progress" value={evidence.coursesLearning} />
              <EvidenceRow label="Active roadmaps" value={evidence.roadmapsLearning} />
              <EvidenceRow label="Projects started" value={evidence.projectsStarted} />
              <EvidenceRow label="Assessments passed" value={evidence.assessmentsPassed} />
              <EvidenceRow label="Projects submitted" value={evidence.projectsSubmitted} />
              <EvidenceRow label="Credentials issued" value={evidence.credentialsIssued} />
            </ul>
          ) : (
            <p className="mt-2 text-sm text-ink-muted">No activity linked yet.</p>
          )}
        </div>

        <NeighborList title="Prerequisites" items={prerequisites} onSelect={onSelect} />
        <NeighborList title="Leads to" items={leadsTo} onSelect={onSelect} />

        <div className="flex flex-wrap gap-2 pt-1">
          <Link
            href="/courses"
            className="rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-white transition hover:brightness-110"
          >
            Find courses
          </Link>
          <Link
            href="/projects"
            className="rounded-lg border border-ink/15 bg-surface px-3 py-1.5 text-sm font-semibold text-ink transition hover:border-brand/40"
          >
            Find projects
          </Link>
          <Link
            href="/assessments"
            className="rounded-lg border border-ink/15 bg-surface px-3 py-1.5 text-sm font-semibold text-ink transition hover:border-brand/40"
          >
            Take assessments
          </Link>
        </div>
      </div>
    </aside>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PROJECT_LIMITS, PROJECT_SUBMIT_POINTS, levelById } from "@coddle/shared";
import { useToast } from "@/components/app/toast";
import { LessonMarkdown } from "@/components/courses/lesson-markdown";
import { Icon } from "@/components/ui/icon";
import { errorMessage } from "@/lib/api-client";
import {
  startProject,
  submitProjectSolution,
  type ProjectDetail as ProjectDetailType,
} from "@/lib/projects";

export function ProjectDetailView({ initial }: { initial: ProjectDetailType }) {
  const router = useRouter();
  const { pushToast } = useToast();
  const [project, setProject] = useState(initial);
  const [pending, setPending] = useState(false);
  const [repoUrl, setRepoUrl] = useState(initial.submission?.repoUrl ?? "");
  const [liveUrl, setLiveUrl] = useState(initial.submission?.liveUrl ?? "");
  const [notes, setNotes] = useState(initial.submission?.notes ?? "");
  const [showSubmit, setShowSubmit] = useState(
    initial.submission?.status === "started" || initial.submission?.status === "submitted",
  );
  const [issuedCredentialId, setIssuedCredentialId] = useState<string | null>(null);

  const level = levelById(project.level);
  const started = Boolean(project.submission);
  const submitted = project.submission?.status === "submitted";

  async function onStart() {
    if (pending) return;
    setPending(true);
    try {
      const { project: next } = await startProject(project.slug);
      setProject(next);
      setShowSubmit(true);
      pushToast("Project started. Build it, then submit your solution.", "success");
      router.refresh();
    } catch (error) {
      pushToast(errorMessage(error), "error");
    } finally {
      setPending(false);
    }
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    try {
      const { project: next, pointsAwarded, credential } = await submitProjectSolution(
        project.slug,
        {
          repoUrl: repoUrl.trim() || null,
          liveUrl: liveUrl.trim() || null,
          notes: notes.trim(),
        },
      );
      setProject(next);
      if (credential) setIssuedCredentialId(credential.id);
      const bits: string[] = [];
      if (pointsAwarded > 0) bits.push(`+${pointsAwarded} pts`);
      if (credential) bits.push("credential earned");
      pushToast(
        bits.length > 0 ? `Solution submitted · ${bits.join(" · ")}` : "Solution updated",
        "success",
      );
      router.refresh();
    } catch (error) {
      pushToast(errorMessage(error), "error");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8">
      <Link
        href="/projects"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-muted transition hover:text-ink"
      >
        <Icon name="arrowLeft" className="h-4 w-4" />
        All projects
      </Link>

      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-amber-900 dark:bg-amber-400/20 dark:text-amber-200">
              {level?.label ?? project.level}
            </span>
            <span className="rounded-full bg-surface-subtle px-2.5 py-1 text-[11px] font-semibold text-ink-muted">
              {project.path.label}
            </span>
            {project.skills.map((skill) => (
              <span
                key={skill.slug}
                className="rounded-full border border-border px-2.5 py-1 text-[11px] font-semibold text-ink-muted"
              >
                {skill.name}
              </span>
            ))}
          </div>

          <h1 className="mt-4 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            {project.title}
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-ink-muted">
            {project.summary}
          </p>

          {project.exampleImageUrl ? (
            <div className="mt-8 aspect-[16/9] overflow-hidden rounded-2xl border border-border bg-surface-subtle">
              {/* eslint-disable-next-line @next/next/no-img-element -- seed/static SVG or arbitrary URL */}
              <img
                src={project.exampleImageUrl}
                alt={`Example for ${project.title}`}
                className="h-full w-full object-cover"
              />
            </div>
          ) : null}

          <section className="mt-8 rounded-2xl border border-border bg-surface p-5 sm:p-6">
            <LessonMarkdown content={project.body} />
          </section>

          <section className="mt-6 rounded-2xl border border-border bg-surface p-5 sm:p-6">
            <h2 className="font-display text-lg font-bold tracking-tight text-ink">
              After completing this project, you will have
            </h2>
            <ul className="mt-4 space-y-2.5">
              {project.checklist.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-ink-muted">
                  <Icon name="checkCircle" className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-border bg-surface p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-muted">
              Your progress
            </p>
            <ol className="mt-4 space-y-3 text-sm">
              <StepRow
                done={started}
                active={!started}
                label="Start working"
              />
              <StepRow
                done={submitted}
                active={started && !submitted}
                label="Submit solution"
              />
              <StepRow done={submitted} active={false} label="Showcase ready" />
            </ol>

            {!started ? (
              <button
                type="button"
                disabled={pending}
                onClick={onStart}
                className="mt-5 w-full rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
              >
                {pending ? "Starting…" : "Start working"}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowSubmit(true)}
                className="mt-5 w-full rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-surface-subtle"
              >
                {submitted ? "Update solution" : "Submit solution"}
              </button>
            )}

            {issuedCredentialId ? (
              <Link
                href={`/credentials/${issuedCredentialId}`}
                className="mt-3 inline-flex text-sm font-semibold text-brand hover:underline"
              >
                View credential
              </Link>
            ) : null}

            <p className="mt-3 text-xs leading-relaxed text-ink-muted">
              First submission earns {PROJECT_SUBMIT_POINTS} points. Add a GitHub repo and/or a
              live URL.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-5 text-sm text-ink-muted">
            <p>
              <span className="font-semibold text-ink">{project.estimatedHours}h</span> estimated
            </p>
            <p className="mt-2">
              <span className="font-semibold text-ink">
                {project.startedCount.toLocaleString()}
              </span>{" "}
              started
            </p>
            {project.course ? (
              <p className="mt-3">
                Related course:{" "}
                <Link
                  href={`/courses/${project.course.slug}`}
                  className="font-semibold text-brand hover:underline"
                >
                  {project.course.title}
                </Link>
              </p>
            ) : null}
            {project.roadmapStep ? (
              <p className="mt-2">
                Roadmap step:{" "}
                <Link
                  href={`/roadmaps/${project.path.roadmapSlug}?step=${encodeURIComponent(project.roadmapStep.slug)}`}
                  className="font-semibold text-brand hover:underline"
                >
                  {project.roadmapStep.title}
                </Link>
              </p>
            ) : (
              <p className="mt-2">
                Path:{" "}
                <Link
                  href={`/roadmaps/${project.path.roadmapSlug}`}
                  className="font-semibold text-brand hover:underline"
                >
                  {project.path.roadmapName}
                </Link>
              </p>
            )}
          </div>

          {showSubmit ? (
            <form
              onSubmit={onSubmit}
              className="rounded-2xl border border-border bg-surface p-5"
            >
              <h3 className="font-display text-base font-bold text-ink">Submit solution</h3>
              <label className="mt-4 block">
                <span className="text-xs font-semibold text-ink-muted">Repository URL</span>
                <input
                  value={repoUrl}
                  onChange={(event) => setRepoUrl(event.target.value)}
                  placeholder="https://github.com/you/project"
                  className="mt-1.5 w-full rounded-xl border border-border bg-canvas px-3 py-2.5 text-sm text-ink focus:border-brand focus:outline-none"
                />
              </label>
              <label className="mt-3 block">
                <span className="text-xs font-semibold text-ink-muted">Live URL</span>
                <input
                  value={liveUrl}
                  onChange={(event) => setLiveUrl(event.target.value)}
                  placeholder="https://your-demo.vercel.app"
                  className="mt-1.5 w-full rounded-xl border border-border bg-canvas px-3 py-2.5 text-sm text-ink focus:border-brand focus:outline-none"
                />
              </label>
              <label className="mt-3 block">
                <span className="text-xs font-semibold text-ink-muted">
                  What you built / learned
                </span>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  maxLength={PROJECT_LIMITS.notesMax}
                  rows={4}
                  placeholder="Challenges faced, decisions you made, what you'd improve next."
                  className="mt-1.5 w-full rounded-xl border border-border bg-canvas px-3 py-2.5 text-sm text-ink focus:border-brand focus:outline-none"
                />
              </label>
              <button
                type="submit"
                disabled={pending}
                className="mt-4 w-full rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
              >
                {pending ? "Saving…" : submitted ? "Update submission" : "Submit solution"}
              </button>
            </form>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

function StepRow({
  done,
  active,
  label,
}: {
  done: boolean;
  active: boolean;
  label: string;
}) {
  return (
    <li className="flex items-center gap-2.5">
      <span
        className={[
          "flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold",
          done
            ? "bg-brand text-white"
            : active
              ? "bg-brand-soft text-brand"
              : "bg-surface-subtle text-ink-muted",
        ].join(" ")}
      >
        {done ? <Icon name="check" className="h-3.5 w-3.5" /> : null}
      </span>
      <span className={done || active ? "font-semibold text-ink" : "text-ink-muted"}>
        {label}
      </span>
    </li>
  );
}

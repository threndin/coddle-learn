"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { COURSE_LIMITS, SKILL_CATALOG, levelById } from "@coddle/shared";
import { useAppUser } from "@/components/app/app-user-context";
import { useToast } from "@/components/app/toast";
import { ProfileAvatar } from "@/components/onboarding/profile-avatar";
import {
  AccentPicker,
  CoverPreview,
  FieldLabel,
  LevelPicker,
  SkillPicker,
  inputClass,
} from "@/components/studio/course-fields";
import { Icon } from "@/components/ui/icon";
import { errorMessage } from "@/lib/api-client";
import { createStudioCourse } from "@/lib/studio";

export function NewCourseForm() {
  const router = useRouter();
  const user = useAppUser();
  const { pushToast } = useToast();
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [level, setLevel] = useState("beginner");
  const [skillSlugs, setSkillSlugs] = useState<string[]>([]);
  const [accent, setAccent] = useState("#004CC8");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const titleOk = title.trim().length >= COURSE_LIMITS.titleMin;
  const skills = SKILL_CATALOG.filter((skill) => skillSlugs.includes(skill.slug));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!titleOk || pending) return;
    setPending(true);
    setError(null);
    try {
      const { course } = await createStudioCourse({
        title: title.trim(),
        summary: summary.trim(),
        level,
        accent,
        skillSlugs,
      });
      pushToast("Draft created. Add your first module.", "success");
      router.push(`/studio/courses/${course.id}`);
    } catch (err) {
      setError(errorMessage(err, "Could not create the course"));
      setPending(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8">
      <Link
        href="/studio/courses"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-muted transition hover:text-ink"
      >
        <Icon name="arrowLeft" className="h-4 w-4" />
        Studio
      </Link>

      <div className="mt-5 max-w-2xl">
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-brand">
          New course
        </p>
        <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
          Start with the basics
        </h1>
        <p className="mt-3 text-base leading-relaxed text-ink-muted">
          You can change all of this later. Once the draft exists you&apos;ll add modules and write
          lessons in the editor.
        </p>
      </div>

      <form onSubmit={submit} className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-7">
          <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
            <div>
              <FieldLabel
                htmlFor="course-title"
                label="Title"
                hint="Specific beats clever: what will learners be able to do?"
                count={title.length}
                max={COURSE_LIMITS.titleMax}
              />
              <input
                id="course-title"
                autoFocus
                value={title}
                maxLength={COURSE_LIMITS.titleMax}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="e.g. Accessible Forms in React"
                className={`${inputClass} text-base font-semibold`}
              />
            </div>
            <div className="mt-5">
              <FieldLabel
                htmlFor="course-summary"
                label="Summary"
                hint="One or two sentences shown on the course card."
                count={summary.length}
                max={COURSE_LIMITS.summaryMax}
              />
              <textarea
                id="course-summary"
                rows={3}
                value={summary}
                maxLength={COURSE_LIMITS.summaryMax}
                onChange={(event) => setSummary(event.target.value)}
                placeholder="Build forms everyone can use: labels, errors, focus, and validation that works with assistive tech."
                className={`${inputClass} resize-none leading-relaxed`}
              />
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
            <FieldLabel label="Level" hint="Who is this course written for?" />
            <LevelPicker value={level} onChange={setLevel} />
            <div className="mt-6">
              <FieldLabel label="Skills" hint="Tag what learners will practice." />
              <SkillPicker value={skillSlugs} onChange={setSkillSlugs} />
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
            <FieldLabel
              label="Cover accent"
              hint="We generate a cover from your title. You can upload your own image later."
            />
            <AccentPicker value={accent} onChange={setAccent} />
          </section>

          {error ? (
            <p className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
              <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={!titleOk || pending}
              className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-brand/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
            >
              {pending ? "Creating draft…" : "Create draft & open editor"}
              {!pending ? <Icon name="chevronRight" className="h-4 w-4" strokeWidth={2.2} /> : null}
            </button>
            <Link
              href="/studio/courses"
              className="rounded-xl px-4 py-3 text-sm font-semibold text-ink-muted transition hover:bg-surface hover:text-ink"
            >
              Cancel
            </Link>
            {!titleOk && title.length > 0 ? (
              <span className="text-xs text-ink-muted">
                Titles need at least {COURSE_LIMITS.titleMin} characters.
              </span>
            ) : null}
          </div>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">
            Catalog preview
          </p>
          <article className="overflow-hidden rounded-2xl border border-border bg-surface shadow-xl shadow-ink/[0.04]">
            <CoverPreview title={title} level={level} accent={accent} className="rounded-none" />
            <div className="p-5">
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
                {levelById(level)?.label ?? level}
              </p>
              <h2 className="mt-2 font-display text-xl font-bold tracking-tight text-ink">
                {title.trim() || "Your course title"}
              </h2>
              <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-ink-muted">
                {summary.trim() || "Your summary will appear here."}
              </p>
              {skills.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {skills.map((skill) => (
                    <span
                      key={skill.slug}
                      className="rounded-md bg-surface-subtle px-2 py-1 text-[11px] font-medium text-ink-muted"
                    >
                      {skill.name}
                    </span>
                  ))}
                </div>
              ) : null}
              <div className="mt-4 flex items-center gap-2.5">
                <ProfileAvatar name={user.name} avatarUrl={user.avatarUrl} size="sm" />
                <div>
                  <p className="text-xs font-semibold text-ink">{user.name}</p>
                  <p className="text-[11px] text-ink-muted">Created by</p>
                </div>
              </div>
            </div>
          </article>

          <div className="mt-4 rounded-2xl border border-border bg-surface p-4">
            <p className="text-sm font-semibold text-ink">What makes a great course</p>
            <ul className="mt-2 space-y-2 text-xs leading-relaxed text-ink-muted">
              {[
                "A clear outcome: one skill, done well.",
                "Short lessons (10–40 min) that end with practice.",
                "Modules that build on each other in order.",
                "Real code examples learners can run.",
              ].map((tip) => (
                <li key={tip} className="flex gap-2">
                  <Icon name="check" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" strokeWidth={2.4} />
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </form>
    </div>
  );
}

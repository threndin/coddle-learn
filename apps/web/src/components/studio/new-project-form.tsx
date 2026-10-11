"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PROJECT_LIMITS, SKILL_CATALOG } from "@coddle/shared";
import { useToast } from "@/components/app/toast";
import {
  FieldLabel,
  LevelPicker,
  SkillPicker,
  inputClass,
} from "@/components/studio/course-fields";
import { Icon } from "@/components/ui/icon";
import { errorMessage } from "@/lib/api-client";
import { createStudioProject, type StudioProjectOptions } from "@/lib/studio-projects";

export function NewProjectForm({ options }: { options: StudioProjectOptions | null }) {
  const router = useRouter();
  const { pushToast } = useToast();
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [level, setLevel] = useState("beginner");
  const [roadmapSlug, setRoadmapSlug] = useState(options?.roadmaps[0]?.slug ?? "");
  const [skillSlugs, setSkillSlugs] = useState<string[]>(["html"]);
  const [primarySkillSlug, setPrimarySkillSlug] = useState("html");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const titleOk = title.trim().length >= PROJECT_LIMITS.titleMin;
  const roadmaps = options?.roadmaps ?? [];

  const skills = useMemo(
    () => SKILL_CATALOG.filter((skill) => skillSlugs.includes(skill.slug)),
    [skillSlugs],
  );

  function onSkillsChange(next: string[]) {
    setSkillSlugs(next);
    if (!next.includes(primarySkillSlug)) {
      setPrimarySkillSlug(next[0] ?? "");
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!titleOk || !roadmapSlug || !primarySkillSlug || pending) return;
    setPending(true);
    setError(null);
    try {
      const { project } = await createStudioProject({
        title: title.trim(),
        summary: summary.trim(),
        level,
        roadmapSlug,
        primarySkillSlug,
        skillSlugs,
      });
      pushToast("Draft created. Finish the project and publish.", "success");
      router.push(`/studio/projects/${project.id}`);
    } catch (err) {
      setError(errorMessage(err, "Could not create the project"));
      setPending(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-8 sm:px-8">
      <Link
        href="/studio/projects"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-muted transition hover:text-ink"
      >
        <Icon name="arrowLeft" className="h-4 w-4" />
        Studio projects
      </Link>

      <div className="mt-5 max-w-2xl">
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-brand">
          New project
        </p>
        <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
          Start with path and goal
        </h1>
        <p className="mt-3 text-base leading-relaxed text-ink-muted">
          You can write requirements and the done checklist in the editor next.
        </p>
      </div>

      {!options ? (
        <p className="mt-8 rounded-2xl border border-border bg-surface p-5 text-sm text-ink-muted">
          Could not load path options. Refresh and try again.
        </p>
      ) : (
        <form onSubmit={submit} className="mt-8 space-y-6">
          <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
            <FieldLabel
              htmlFor="project-title"
              label="Title"
              hint="What will learners build?"
              count={title.length}
              max={PROJECT_LIMITS.titleMax}
            />
            <input
              id="project-title"
              autoFocus
              value={title}
              maxLength={PROJECT_LIMITS.titleMax}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g. Single-Page CV"
              className={`${inputClass} text-base font-semibold`}
            />

            <div className="mt-5">
              <FieldLabel
                htmlFor="project-summary"
                label="Summary"
                hint="One sentence for the catalog card"
                count={summary.length}
                max={PROJECT_LIMITS.summaryMax}
              />
              <textarea
                id="project-summary"
                value={summary}
                maxLength={PROJECT_LIMITS.summaryMax}
                rows={3}
                onChange={(event) => setSummary(event.target.value)}
                placeholder="Create a single-page HTML CV to showcase your career history."
                className={inputClass}
              />
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
            <FieldLabel label="Level" />
            <LevelPicker value={level} onChange={setLevel} />

            <div className="mt-5">
              <FieldLabel htmlFor="project-path" label="Learning path" />
              <select
                id="project-path"
                value={roadmapSlug}
                onChange={(event) => setRoadmapSlug(event.target.value)}
                className={inputClass}
              >
                {roadmaps.map((roadmap) => (
                  <option key={roadmap.slug} value={roadmap.slug}>
                    {roadmap.label} — {roadmap.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-5">
              <FieldLabel label="Skills" hint="Primary skill shows on the catalog card" />
              <SkillPicker value={skillSlugs} onChange={onSkillsChange} />
              {skills.length > 0 ? (
                <label className="mt-3 block">
                  <span className="text-xs font-semibold text-ink-muted">Primary skill</span>
                  <select
                    value={primarySkillSlug}
                    onChange={(event) => setPrimarySkillSlug(event.target.value)}
                    className={`${inputClass} mt-1.5`}
                  >
                    {skills.map((skill) => (
                      <option key={skill.slug} value={skill.slug}>
                        {skill.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
            </div>
          </section>

          {error ? (
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
              {error}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={!titleOk || !roadmapSlug || !primarySkillSlug || pending}
              className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {pending ? "Creating…" : "Create draft"}
            </button>
            <Link
              href="/studio/projects"
              className="inline-flex items-center rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-ink"
            >
              Cancel
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}

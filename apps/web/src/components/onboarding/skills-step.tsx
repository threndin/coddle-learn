import { useMemo, useState } from "react";
import {
  SKILL_CATALOG,
  SKILL_CATEGORIES,
  SKILL_MAX,
  SUGGESTED_SKILL_SLUGS,
  findCatalogSkill,
  slugifySkill,
  type ExperienceLevel,
  type SkillCategory,
} from "@coddle/shared";

type SkillChoice = { slug: string; name: string };

export function SkillsStep({
  skills,
  experienceLevel,
  onChange,
}: {
  skills: SkillChoice[];
  experienceLevel: ExperienceLevel | null;
  onChange: (skills: SkillChoice[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<SkillCategory>("All");
  const selected = useMemo(() => new Set(skills.map((skill) => skill.slug)), [skills]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return SKILL_CATALOG.filter((skill) => {
      if (needle) {
        return skill.name.toLowerCase().includes(needle) || skill.slug.includes(needle);
      }
      if (category !== "All" && skill.category !== category) return false;
      return true;
    });
  }, [category, query]);

  const starterSlugs = experienceLevel ? SUGGESTED_SKILL_SLUGS[experienceLevel] : [];
  const starterRemaining = starterSlugs.filter((slug) => !selected.has(slug)).length;

  function addSkill(skill: SkillChoice) {
    if (selected.has(skill.slug)) {
      setQuery("");
      return;
    }
    if (skills.length >= SKILL_MAX) return;
    onChange([...skills, skill]);
    setQuery("");
  }

  function removeSkill(slug: string) {
    onChange(skills.filter((skill) => skill.slug !== slug));
  }

  function toggle(skill: SkillChoice) {
    if (selected.has(skill.slug)) {
      removeSkill(skill.slug);
      return;
    }
    addSkill(skill);
  }

  function addStarter() {
    const next = [...skills];
    for (const slug of starterSlugs) {
      if (next.length >= SKILL_MAX) break;
      if (next.some((skill) => skill.slug === slug)) continue;
      const catalog = SKILL_CATALOG.find((skill) => skill.slug === slug);
      if (!catalog) continue;
      next.push({ slug: catalog.slug, name: catalog.name });
    }
    onChange(next);
  }

  function commitQuery() {
    const name = query.trim().replace(/\s+/g, " ");
    if (name.length < 2 || name.length > 32) return;
    const catalog = findCatalogSkill(name);
    const slug = catalog?.slug ?? slugifySkill(name);
    const label = catalog?.name ?? name;
    if (slug.length < 2) return;
    addSkill({ slug, name: label });
  }

  const trimmed = query.trim();
  const canAddCustom =
    trimmed.length >= 2 &&
    trimmed.length <= 32 &&
    !findCatalogSkill(trimmed) &&
    !selected.has(slugifySkill(trimmed)) &&
    skills.length < SKILL_MAX;

  return (
    <div>
      <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-brand">
        Skills
      </p>
      <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
        Add the skills you want to grow
      </h1>
      <p className="mt-3 max-w-xl text-base leading-relaxed text-ink-muted">
        Pick from the list or type your own. These shape the roadmap we suggest. You can
        change them later.
      </p>

      <div className="mt-8 rounded-2xl border border-border bg-surface p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-semibold text-ink">
            {skills.length} of {SKILL_MAX} selected
          </p>
          {starterRemaining > 0 ? (
            <button
              type="button"
              onClick={addStarter}
              className="text-sm font-semibold text-brand hover:underline"
            >
              Add a starter set
            </button>
          ) : null}
        </div>

        <div className="mt-3 flex min-h-10 flex-wrap gap-2">
          {skills.length === 0 ? (
            <p className="text-sm text-ink-muted">Nothing selected yet.</p>
          ) : (
            skills.map((skill) => (
              <button
                key={skill.slug}
                type="button"
                onClick={() => removeSkill(skill.slug)}
                className="inline-flex items-center gap-1.5 rounded-full bg-brand px-3 py-1.5 text-sm font-medium text-white transition hover:brightness-110"
              >
                {skill.name}
                <span aria-hidden className="text-white/80">
                  ×
                </span>
                <span className="sr-only">Remove {skill.name}</span>
              </button>
            ))
          )}
        </div>
      </div>

      <label className="mt-5 block">
        <span className="sr-only">Search skills</span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              commitQuery();
            }
          }}
          placeholder="Search or type a skill, then press Enter"
          autoComplete="off"
          className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-ink outline-none ring-brand/20 placeholder:text-ink-muted focus:border-brand focus:ring-4"
        />
      </label>

      {canAddCustom ? (
        <button
          type="button"
          onClick={commitQuery}
          className="mt-3 inline-flex rounded-full border border-dashed border-brand/50 bg-brand-soft px-4 py-2 text-sm font-semibold text-brand"
        >
          Add “{trimmed}”
        </button>
      ) : null}

      <div className="mt-5 flex gap-2 overflow-x-auto pb-1" role="toolbar" aria-label="Skill categories">
        {SKILL_CATEGORIES.map((item) => {
          const active = item === category;
          return (
            <button
              key={item}
              type="button"
              aria-pressed={active}
              onClick={() => setCategory(item)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition ${
                active ? "bg-ink text-white" : "bg-surface text-ink-muted ring-1 ring-border hover:text-ink"
              }`}
            >
              {item}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {visible.length === 0 ? (
          <p className="text-sm text-ink-muted">No skills match that search.</p>
        ) : (
          visible.map((skill) => {
            const isOn = selected.has(skill.slug);
            const blocked = !isOn && skills.length >= SKILL_MAX;
            return (
              <button
                key={skill.slug}
                type="button"
                aria-pressed={isOn}
                disabled={blocked}
                onClick={() => toggle({ slug: skill.slug, name: skill.name })}
                className={`rounded-full border px-3 py-1.5 text-sm font-medium transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 ${
                  isOn
                    ? "border-brand bg-brand text-white"
                    : "border-border bg-surface text-ink hover:border-brand/40 hover:bg-brand-soft"
                }`}
              >
                {skill.name}
              </button>
            );
          })
        )}
      </div>

      {skills.length >= SKILL_MAX ? (
        <p className="mt-4 text-sm text-ink-muted">
          Twelve skills is enough to start. You can edit the list from your profile later.
        </p>
      ) : null}
    </div>
  );
}

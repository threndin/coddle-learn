"use client";

import { useEffect, useMemo, useState } from "react";
import { SKILL_CATEGORIES, SKILL_STATUS_LABELS } from "@coddle/shared";
import { SkillsGraph } from "@/components/skills/skills-graph";
import { fetchSkillGraph, type SkillGraph } from "@/lib/skills";

type Filter = "all" | "active" | "unlocked" | "locked" | (typeof SKILL_CATEGORIES)[number];

export function SkillsCatalog({ initial }: { initial: SkillGraph | null }) {
  const [graph, setGraph] = useState(initial);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(initial === null);

  useEffect(() => {
    if (initial !== null) return;
    let cancelled = false;
    void (async () => {
      try {
        const data = await fetchSkillGraph();
        if (cancelled) return;
        setGraph(data);
        setError(null);
      } catch {
        if (!cancelled) setError("Could not load skill graph");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initial]);

  const filteredGraph = useMemo(() => {
    if (!graph) return null;
    const needle = query.trim().toLowerCase();
    const nodes = graph.nodes.filter((node) => {
      if (filter === "unlocked") {
        if (node.status !== "demonstrated" && node.status !== "credentialed") {
          return false;
        }
      } else if (filter === "active") {
        if (node.status !== "learning" && node.status !== "interested") return false;
      } else if (filter === "locked") {
        if (node.status !== "locked") return false;
      } else if (filter !== "all" && filter !== "All") {
        if (node.category !== filter) return false;
      }

      if (!needle) return true;
      return [node.name, node.category, SKILL_STATUS_LABELS[node.status]]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });

    const slugs = new Set(nodes.map((node) => node.slug));
    const edges = graph.edges.filter(
      (edge) => slugs.has(edge.from) && slugs.has(edge.to),
    );

    return { ...graph, nodes, edges };
  }, [graph, filter, query]);

  const filters: { id: Filter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "unlocked", label: "Proven" },
    { id: "active", label: "In progress" },
    { id: "locked", label: "Not started" },
    ...SKILL_CATEGORIES.filter((category) => category !== "All").map((category) => ({
      id: category,
      label: category,
    })),
  ];

  return (
    <div className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8">
      <div className="max-w-4xl">
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-brand">
          Skill graph
        </p>
        <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
          Skills connected by proof
        </h1>
        <p className="mt-2 text-base leading-relaxed text-ink-muted">
          Relationships like JavaScript → TypeScript → React → Next.js. Skills unlock from
          assessments, projects, and credentials — not from finishing a course alone. Nodes you
          have not started still appear, with a quieter style.
        </p>
      </div>

      {graph && (
        <dl className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Demonstrated", value: graph.demonstratedCount, accent: "bg-brand/10 text-brand" },
            { label: "Learning", value: graph.learningCount, accent: "bg-orange-500/10 text-orange-700 dark:text-orange-300" },
            { label: "Interested", value: graph.interestedCount, accent: "bg-brand-soft text-brand-deep" },
            { label: "Not started", value: graph.lockedCount, accent: "bg-ink/5 text-ink-muted" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-ink/10 bg-surface px-4 py-3 shadow-[0_1px_0_rgba(15,23,42,0.03)]"
            >
              <dt className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
                {stat.label}
              </dt>
              <dd className={`mt-1.5 inline-flex min-w-[2.25rem] items-baseline rounded-lg px-2 py-0.5 font-display text-2xl font-bold ${stat.accent}`}>
                {stat.value}
              </dd>
            </div>
          ))}
        </dl>
      )}

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {filters.map((item) => {
            const active = filter === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setFilter(item.id)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  active
                    ? "bg-brand text-white"
                    : "border border-ink/10 bg-surface text-ink-muted hover:border-brand/30 hover:text-ink"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
        <label className="relative block w-full sm:max-w-xs">
          <span className="sr-only">Search skills</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search skills"
            className="w-full rounded-xl border border-ink/15 bg-surface px-3 py-2 text-sm text-ink outline-none ring-brand/30 placeholder:text-ink-muted focus:ring-2"
          />
        </label>
      </div>

      <div className="mt-6">
        {loading && (
          <p className="py-16 text-center text-sm text-ink-muted">Loading skill graph…</p>
        )}
        {error && !loading && (
          <p className="py-16 text-center text-sm text-red-600">{error}</p>
        )}
        {!loading && !error && filteredGraph && filteredGraph.nodes.length === 0 && (
          <p className="py-16 text-center text-sm text-ink-muted">
            No skills match this filter.
          </p>
        )}
        {!loading && !error && filteredGraph && filteredGraph.nodes.length > 0 && (
          <SkillsGraph graph={filteredGraph} />
        )}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SkillsGraph } from "@/components/skills/skills-graph";
import { fetchSkillGraph, type SkillGraph } from "@/lib/skills";

/**
 * Embeddable skill graph for the public profile (and other surfaces).
 * Full interactive explorer lives at `/skills`.
 */
export function SkillGraphSection({
  initial = null,
  title = "Skill graph",
  showExploreLink = true,
}: {
  initial?: SkillGraph | null;
  title?: string;
  showExploreLink?: boolean;
}) {
  const [graph, setGraph] = useState(initial);
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
      } catch {
        if (!cancelled) setError("Could not load skills");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initial]);

  return (
    <section className="w-full">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-brand">
            Skills
          </p>
          <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-ink">
            {title}
          </h2>
          <p className="mt-1 max-w-xl text-sm text-ink-muted">
            Proven through assessments, projects, and credentials. Unstarted skills stay
            visible with a lighter treatment.
          </p>
        </div>
        {showExploreLink && (
          <Link
            href="/skills"
            className="text-sm font-semibold text-brand transition hover:underline"
          >
            Open full graph
          </Link>
        )}
      </div>

      <div className="mt-5">
        {loading && (
          <p className="py-10 text-center text-sm text-ink-muted">Loading skills…</p>
        )}
        {error && !loading && (
          <p className="py-10 text-center text-sm text-red-600">{error}</p>
        )}
        {graph && !loading && !error && <SkillsGraph graph={graph} compact />}
      </div>
    </section>
  );
}

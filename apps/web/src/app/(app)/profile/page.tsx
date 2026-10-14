import Link from "next/link";
import { SkillGraphSection } from "@/components/skills/skill-graph-section";
import { loadSkillGraph } from "@/lib/skills-server";

export default async function ProfilePage() {
  const graph = await loadSkillGraph();

  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-8">
      <div className="max-w-2xl">
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-brand">
          Profile
        </p>
        <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
          Your learning profile
        </h1>
        <p className="mt-2 text-base leading-relaxed text-ink-muted">
          The public profile page is still coming together. Your skill graph is live
          here and on{" "}
          <Link href="/skills" className="font-semibold text-brand hover:underline">
            /skills
          </Link>
          .
        </p>
      </div>

      <div className="mt-10">
        <SkillGraphSection initial={graph} />
      </div>
    </div>
  );
}

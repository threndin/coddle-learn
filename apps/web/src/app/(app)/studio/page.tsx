import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { StudioReviewersCard } from "@/components/studio/studio-reviewers-card";

export default function StudioPage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-10 sm:px-8">
      <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-brand">
        Studio
      </p>
      <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
        Create & Manage learning content
      </h1>
      <p className="mt-3 max-w-2xl text-base leading-relaxed text-ink-muted">
        Contribute courses and projects. Drafts stay private until you publish them to the catalog.
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/studio/courses"
          className="group rounded-2xl border border-border bg-surface p-6 transition hover:border-brand/40"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand">
            <Icon name="book" className="h-5 w-5" />
          </span>
          <h2 className="mt-4 font-display text-xl font-bold text-ink group-hover:text-brand">
            Courses
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">
            Modules, lessons, exercises, and a final assessment.
          </p>
        </Link>
        <Link
          href="/studio/projects"
          className="group rounded-2xl border border-border bg-surface p-6 transition hover:border-brand/40"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand">
            <Icon name="layers" className="h-5 w-5" />
          </span>
          <h2 className="mt-4 font-display text-xl font-bold text-ink group-hover:text-brand">
            Projects
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">
            Guided projects with requirements, checklists, and example previews.
          </p>
        </Link>
        <StudioReviewersCard />
      </div>
    </div>
  );
}

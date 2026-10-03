"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  formatMinutes,
  levelById,
  practiceDaysLabel,
  roadmapBySlug,
  weeklyPracticeLabel,
} from "@coddle/shared";
import { ThemeToggle } from "@/components/theme-toggle";
import { fetchMe, logout, type PublicUser } from "@/lib/auth";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const me = await fetchMe();
        if (cancelled) return;
        if (!me) {
          router.replace("/login");
          return;
        }
        if (!me.onboardingCompletedAt) {
          router.replace("/onboarding");
          return;
        }
        setUser(me);
      } catch {
        if (!cancelled) router.replace("/login");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function onLogout() {
    await logout();
    router.replace("/");
  }

  if (loading || !user) {
    return (
      <main className="flex min-h-svh items-center justify-center bg-surface-subtle text-ink-muted">
        <p className="font-mono text-sm">Loading…</p>
      </main>
    );
  }

  return (
    <main className="min-h-svh bg-surface-subtle">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-5 sm:px-8">
          <Link href="/">
            <Image
              src="/logo.png"
              alt="Coddle Learn"
              width={140}
              height={34}
              className="h-8 w-auto dark:brightness-0 dark:invert"
            />
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button
              type="button"
              onClick={() => void onLogout()}
              className="text-sm font-medium text-ink-muted transition hover:text-ink"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-5 py-14 sm:px-8">
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-brand">
          Dashboard
        </p>
        <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
          Welcome, {user.name.trim().split(/\s+/)[0] || user.name}.
        </h1>
        <p className="mt-3 max-w-xl text-ink-muted">
          Your plan is set. Courses, progress, and projects will show up here as you learn.
        </p>

        <PlanSummary user={user} />

        <dl className="mt-10 space-y-4 border-t border-border pt-8 text-sm">
          <div className="flex flex-col gap-1 sm:flex-row sm:gap-6">
            <dt className="w-28 shrink-0 font-medium text-ink-muted">Email</dt>
            <dd className="text-ink">{user.email}</dd>
          </div>
        </dl>
      </div>
    </main>
  );
}

function PlanSummary({ user }: { user: PublicUser }) {
  const roadmap = user.startingRoadmapSlug ? roadmapBySlug(user.startingRoadmapSlug) : null;
  const level = user.experienceLevel ? levelById(user.experienceLevel) : null;

  return (
    <section className="mt-10" aria-label="Your plan">
      <h2 className="sr-only">Your plan</h2>
      <div className="grid gap-3 sm:grid-cols-3">
        <article className="rounded-2xl border border-border bg-surface p-5 sm:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-muted">Roadmap</p>
          <p className="mt-2 font-display text-xl font-bold tracking-tight text-ink">
            {roadmap?.name ?? "Your roadmap"}
          </p>
          {roadmap ? <p className="mt-2 text-sm leading-relaxed text-ink-muted">{roadmap.summary}</p> : null}
        </article>
        <article className="rounded-2xl border border-border bg-surface p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-muted">Daily goal</p>
          <p className="mt-2 font-display text-xl font-bold tracking-tight text-ink">
            {user.dailyGoalMinutes ? formatMinutes(user.dailyGoalMinutes) : "Not set"}
          </p>
          {user.dailyGoalMinutes ? (
            <p className="mt-2 text-sm text-ink-muted">
              {practiceDaysLabel(user.practiceDays)} · {weeklyPracticeLabel(user.dailyGoalMinutes, user.practiceDays.length)}
            </p>
          ) : null}
          {level ? <p className="mt-3 text-xs font-semibold text-brand">{level.label}</p> : null}
        </article>
      </div>
      {user.skills.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-2">
          {user.skills.map((skill) => (
            <li
              key={skill.slug}
              className="rounded-full bg-brand-soft px-3 py-1 text-sm font-medium text-ink"
            >
              {skill.name}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

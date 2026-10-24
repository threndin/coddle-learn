"use client";

import { useState } from "react";
import Link from "next/link";
import { challengeRankBonus } from "@coddle/shared";
import { useAppUserActions } from "@/components/app/app-user-context";
import { useToast } from "@/components/app/toast";
import { LessonMarkdown } from "@/components/courses/lesson-markdown";
import { DifficultyBadge, languageLabel } from "@/components/challenges/challenge-meta";
import { ProfileAvatar } from "@/components/onboarding/profile-avatar";
import { errorMessage } from "@/lib/api-client";
import {
  formatChallengeAgo,
  submitChallenge,
  type ChallengeBoardEntry,
  type ChallengeDetail,
  type ChallengeResultView,
  type ChallengeSubmitResult,
} from "@/lib/challenges";

export function ChallengeDetailView({ initial }: { initial: ChallengeDetail }) {
  const { pushToast } = useToast();
  const { patchUser } = useAppUserActions();
  const [detail, setDetail] = useState(initial);
  const [code, setCode] = useState(initial.latest?.code ?? initial.starterCode);
  const [busy, setBusy] = useState(false);
  const [run, setRun] = useState<ChallengeSubmitResult | null>(null);

  const results = run?.results ?? detail.latest?.results ?? [];
  const runtimeError = run?.error ?? (run ? null : detail.latest?.error ?? null);
  const testsPassed = run?.testsPassed ?? detail.latest?.testsPassed ?? 0;
  const testsTotal = run?.testsTotal ?? detail.latest?.testsTotal ?? 0;
  const showingLatest = !run && detail.latest;

  async function handleSubmit() {
    setBusy(true);
    try {
      const data = await submitChallenge(detail.slug, code);
      setRun(data);
      patchUser({ points: data.userPoints });
      setDetail((current) => ({
        ...current,
        solverCount: data.solverCount,
        board: data.board,
        you: {
          solved: data.pointsAwarded > 0 || data.alreadySolved || current.you.solved,
          rank: data.rank ?? current.you.rank,
          pointsAwarded: data.pointsAwarded > 0 ? data.pointsAwarded : current.you.pointsAwarded,
          rankBonus: data.pointsAwarded > 0 ? data.rankBonus : current.you.rankBonus,
          attempts: data.attempts,
        },
      }));
      if (data.pointsAwarded > 0) {
        pushToast(`+${data.pointsAwarded} points · placed #${data.rank}`, "success");
      }
    } catch (error) {
      pushToast(errorMessage(error), "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="w-full max-w-[100vw] overflow-x-hidden px-4 py-6 sm:px-8 sm:py-8 lg:px-10">
      <Link
        href="/challenges"
        className="inline-flex text-sm font-semibold text-brand"
      >
        ← All challenges
      </Link>

      <div className="mt-4 grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-5">
          <header>
            <div className="flex flex-wrap items-center gap-2">
              <DifficultyBadge difficulty={detail.difficulty} />
              <span className="text-xs font-medium text-ink-muted">
                {languageLabel(detail.language)}
              </span>
              <span className="text-xs font-semibold text-ink">{detail.points} pts</span>
              {detail.you.solved && detail.you.rank ? (
                <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                  You placed #{detail.you.rank} · {detail.you.pointsAwarded} pts
                </span>
              ) : challengeRankBonus(detail.solverCount + 1) > 0 ? (
                <span className="rounded-md bg-brand-soft px-2 py-0.5 text-xs font-semibold text-brand">
                  +{challengeRankBonus(detail.solverCount + 1)} rank bonus for the next solve
                </span>
              ) : null}
            </div>
            <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
              {detail.title}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-muted sm:text-base">
              {detail.summary}
            </p>
          </header>

          <section className="rounded-3xl border border-border bg-surface p-5 sm:p-6">
            <LessonMarkdown content={detail.statement} />
            <p className="mt-5 text-sm text-ink-muted">
              The checker calls <span className="font-mono text-ink">{detail.functionName}</span>{" "}
              with the examples below, then with hidden tests.
            </p>
            <ul className="mt-4 space-y-3">
              {detail.examples.map((example) => (
                <li
                  key={example.call}
                  className="rounded-2xl border border-border bg-surface-subtle px-4 py-3"
                >
                  <p className="font-mono text-xs text-ink">{example.call}</p>
                  <p className="mt-1 font-mono text-xs text-ink-muted">
                    returns {example.expectedJson}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-3xl border border-border bg-surface p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display text-lg font-bold tracking-tight text-ink">
                Your solution
              </h2>
              <button
                type="button"
                onClick={() => {
                  setCode(detail.starterCode);
                  setRun(null);
                }}
                className="text-sm font-semibold text-ink-muted transition hover:text-ink"
              >
                Reset starter
              </button>
            </div>
            <label className="mt-4 block">
              <span className="sr-only">Solution code</span>
              <textarea
                value={code}
                spellCheck={false}
                onChange={(event) => setCode(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key !== "Tab") return;
                  event.preventDefault();
                  const target = event.currentTarget;
                  const start = target.selectionStart;
                  const end = target.selectionEnd;
                  const next = `${code.slice(0, start)}  ${code.slice(end)}`;
                  setCode(next);
                  requestAnimationFrame(() => {
                    target.selectionStart = start + 2;
                    target.selectionEnd = start + 2;
                  });
                }}
                className="min-h-72 w-full resize-y rounded-2xl border border-ink bg-ink px-4 py-3 font-mono text-[13px] leading-relaxed text-white outline-none ring-brand focus:ring-2"
              />
            </label>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={busy || !code.trim()}
                onClick={() => void handleSubmit()}
                className="inline-flex rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
              >
                {busy ? "Checking…" : detail.you.solved ? "Run again" : "Submit solution"}
              </button>
              <p className="text-xs text-ink-muted">
                {detail.solverCount === 1 ? "1 solver" : `${detail.solverCount} solvers`}
                {detail.you.attempts ? ` · ${detail.you.attempts} of your attempts` : ""}
              </p>
            </div>
          </section>

          {run?.pointsAwarded ? (
            <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-500/20 dark:bg-emerald-500/10">
              <p className="font-display text-xl font-bold text-emerald-900 dark:text-emerald-200">
                #{run.rank} · +{run.pointsAwarded} points
              </p>
              <p className="mt-1 text-sm text-emerald-800 dark:text-emerald-100">
                {run.basePoints} for solving
                {run.rankBonus ? ` and ${run.rankBonus} for placing #${run.rank}` : ""}.
              </p>
            </section>
          ) : null}

          {run && run.status === "passed" && run.pointsAwarded === 0 ? (
            <section className="rounded-3xl border border-border bg-surface p-5">
              <p className="text-sm font-semibold text-ink">Practice run passed.</p>
              <p className="mt-1 text-sm text-ink-muted">
                {run.alreadySolved
                  ? `Your place stays #${run.rank ?? detail.you.rank} with ${detail.you.pointsAwarded} points.`
                  : "This run did not change the standings."}
              </p>
            </section>
          ) : null}

          {results.length > 0 || runtimeError ? (
            <section className="rounded-3xl border border-border bg-surface p-5 sm:p-6">
              <h2 className="font-display text-lg font-bold tracking-tight text-ink">
                {showingLatest ? "Last run" : "Results"}
                {testsTotal ? ` · ${testsPassed}/${testsTotal}` : ""}
              </h2>
              {runtimeError ? (
                <p className="mt-3 rounded-2xl bg-rose-50 px-4 py-3 font-mono text-xs text-rose-700 dark:bg-rose-500/10 dark:text-rose-200">
                  {runtimeError}
                </p>
              ) : null}
              <ul className="mt-4 space-y-3">
                {results.map((result) => (
                  <ResultRow key={result.label} result={result} />
                ))}
              </ul>
            </section>
          ) : null}
        </div>

        <aside className="rounded-3xl border border-border bg-surface p-5 xl:sticky xl:top-6">
          <h2 className="font-display text-lg font-bold tracking-tight text-ink">
            This challenge
          </h2>
          <p className="mt-1 text-xs text-ink-muted">Earlier solves rank higher and keep their bonus.</p>
          {detail.board.length === 0 ? (
            <p className="mt-4 text-sm leading-relaxed text-ink-muted">
              Nobody has solved this yet. First place earns +{challengeRankBonus(1)} on top of the{" "}
              {detail.points} base points.
            </p>
          ) : (
            <ol className="mt-4 space-y-2">
              {detail.board.map((row) => (
                <BoardRow key={`${row.username}-${row.rank}`} row={row} />
              ))}
            </ol>
          )}
        </aside>
      </div>
    </div>
  );
}

function ResultRow({ result }: { result: ChallengeResultView }) {
  return (
    <li className="rounded-2xl border border-border px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-ink">{result.label}</p>
        <p
          className={[
            "text-xs font-semibold",
            result.passed ? "text-emerald-700 dark:text-emerald-300" : "text-rose-600",
          ].join(" ")}
        >
          {result.passed ? "Passed" : "Failed"}
        </p>
      </div>
      {result.call ? <p className="mt-2 font-mono text-xs text-ink-muted">{result.call}</p> : null}
      {result.error ? <p className="mt-2 text-xs text-rose-600">{result.error}</p> : null}
      {!result.hidden && (result.expectedJson || result.actualJson) ? (
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <p className="rounded-xl bg-surface-subtle px-3 py-2 font-mono text-[11px] text-ink-muted">
            expected {result.expectedJson}
          </p>
          <p className="rounded-xl bg-surface-subtle px-3 py-2 font-mono text-[11px] text-ink">
            actual {result.actualJson ?? "—"}
          </p>
        </div>
      ) : null}
    </li>
  );
}

function BoardRow({ row }: { row: ChallengeBoardEntry }) {
  return (
    <li>
      <Link
        href={`/u/${row.username}`}
        className={[
          "flex items-center gap-3 rounded-2xl px-2 py-2 transition hover:bg-surface-subtle",
          row.you ? "bg-brand-soft" : "",
        ].join(" ")}
      >
        <span className="w-6 shrink-0 text-center font-mono text-xs font-semibold text-ink-muted">
          {row.rank}
        </span>
        <ProfileAvatar name={row.name} avatarUrl={row.avatarUrl} size="sm" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-ink">
            {row.name}
            {row.you ? " · You" : ""}
          </span>
          <span className="block truncate text-xs text-ink-muted">
            {row.attempts} {row.attempts === 1 ? "attempt" : "attempts"} ·{" "}
            {formatChallengeAgo(row.solvedAt)}
          </span>
        </span>
        <span className="shrink-0 text-right">
          <span className="block font-mono text-xs font-semibold text-brand">
            {row.pointsAwarded}
          </span>
          {row.rankBonus ? (
            <span className="block text-[10px] font-semibold text-ink-muted">+{row.rankBonus}</span>
          ) : null}
        </span>
      </Link>
    </li>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CREDENTIAL_KIND_LABELS, isCredentialKind } from "@coddle/shared";
import { useAppUser } from "@/components/app/app-user-context";
import { CredentialCertificate } from "@/components/credentials/credential-certificate";
import { Icon } from "@/components/ui/icon";
import { fetchCredentials, type CredentialSummary } from "@/lib/credentials";

type KindFilter = "all" | "assessment" | "project";

function kindLabel(kind: string) {
  return isCredentialKind(kind) ? CREDENTIAL_KIND_LABELS[kind] : kind;
}

function formatIssued(iso: string) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function EmptyCredentialsArt() {
  return (
    <svg
      viewBox="0 0 200 160"
      className="mx-auto h-auto w-44 text-brand sm:w-52"
      role="img"
      aria-hidden
    >
      <ellipse cx="100" cy="148" rx="56" ry="8" className="fill-brand/10" />
      <rect
        x="42"
        y="28"
        width="116"
        height="92"
        rx="12"
        className="fill-surface stroke-border"
        strokeWidth="2"
      />
      <rect
        x="54"
        y="42"
        width="92"
        height="10"
        rx="5"
        className="fill-brand/25"
      />
      <rect
        x="54"
        y="60"
        width="64"
        height="6"
        rx="3"
        className="fill-ink-muted/25"
      />
      <rect
        x="54"
        y="72"
        width="76"
        height="6"
        rx="3"
        className="fill-ink-muted/20"
      />
      <circle cx="128" cy="98" r="16" className="fill-brand/15 stroke-brand" strokeWidth="2" />
      <path
        d="M121 98.5l4.5 4.5 9.5-10"
        className="fill-none stroke-brand"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect
        x="58"
        y="18"
        width="28"
        height="18"
        rx="4"
        className="fill-brand stroke-brand"
        strokeWidth="1"
      />
      <path
        d="M65 27h14M65 32h10"
        className="stroke-white"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function CredentialsCatalog({
  initialCredentials,
}: {
  initialCredentials: CredentialSummary[] | null;
}) {
  const user = useAppUser();
  const [credentials, setCredentials] = useState(initialCredentials);
  const [kind, setKind] = useState<KindFilter>("all");
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(initialCredentials === null);

  useEffect(() => {
    if (initialCredentials !== null) return;
    let cancelled = false;
    void (async () => {
      try {
        const data = await fetchCredentials();
        if (cancelled) return;
        setCredentials(data.credentials);
        setError(null);
      } catch {
        if (!cancelled) setError("Could not load credentials");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initialCredentials]);

  const filtered = useMemo(() => {
    if (!credentials) return [];
    const needle = query.trim().toLowerCase();
    return credentials.filter((item) => {
      if (kind !== "all" && item.kind !== kind) return false;
      if (!needle) return true;
      const haystack = [item.title, item.summary, kindLabel(item.kind)]
        .join(" ")
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [credentials, kind, query]);

  const emptyCatalog = Boolean(credentials && credentials.length === 0);

  return (
    <div className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8">
      <div className="max-w-3xl">
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-brand">
          Credentials
        </p>
        <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
          Proof you can share
        </h1>
        <p className="mt-1 text-base leading-relaxed text-ink-muted">
          Free credentials from passed assessments and submitted projects, each with a public
          verification link.
        </p>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:mt-4 sm:flex-row sm:flex-wrap sm:items-center">
        <label className="relative w-full flex-1 sm:min-w-56 sm:max-w-sm">
          <span className="sr-only">Search credentials</span>
          <Icon
            name="search"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
          />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by title"
            className="w-full rounded-xl border border-border bg-surface py-2.5 pl-9 pr-3 text-sm text-ink placeholder:text-ink-muted focus:border-brand focus:outline-none"
          />
        </label>
        <div className="flex w-full rounded-xl border border-border bg-surface p-1 sm:w-auto">
          {(
            [
              ["all", "All"],
              ["assessment", "Assessments"],
              ["project", "Projects"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setKind(id)}
              className={[
                "flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition sm:flex-none",
                kind === id ? "bg-brand text-white" : "text-ink-muted hover:text-ink",
              ].join(" ")}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="mt-10 text-sm text-ink-muted">Loading credentials…</p>
      ) : error ? (
        <p className="mt-10 text-sm text-rose-600">{error}</p>
      ) : filtered.length === 0 ? (
        <div className="mt-8 flex flex-col items-center rounded-2xl border border-dashed border-border px-4 py-14 text-center sm:py-16">
          <EmptyCredentialsArt />
          <h2 className="mt-6 font-display text-xl font-bold tracking-tight text-ink sm:text-2xl">
            {emptyCatalog ? "No credentials yet" : "No matches"}
          </h2>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-ink-muted sm:text-base">
            {emptyCatalog
              ? "Pass a course assessment or submit a project to earn free, verifiable proof you can share."
              : "Try a different search or filter."}
          </p>
          {emptyCatalog ? (
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                href="/assessments"
                className="inline-flex rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
              >
                Take an assessment
              </Link>
              <Link
                href="/projects"
                className="inline-flex rounded-xl border border-border bg-surface px-5 py-2.5 text-sm font-semibold text-ink transition hover:border-brand/40"
              >
                Browse projects
              </Link>
            </div>
          ) : null}
        </div>
      ) : (
        <ul className="mt-6 grid gap-4 sm:mt-8 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((item) => (
            <li key={item.id}>
              <Link
                href={`/credentials/${item.id}`}
                className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-surface transition hover:border-brand/40"
              >
                <div className="border-b border-border bg-surface-subtle p-2.5">
                  <CredentialCertificate
                    compact
                    data={{
                      earnerName: user.name,
                      title: item.title,
                      kind: item.kind,
                      issuedAt: item.issuedAt,
                      code: item.code,
                      verifyUrl: item.verifyUrl,
                      assessmentTitle: item.source.assessmentTitle,
                      courseTitle: item.source.courseTitle,
                      projectTitle: item.source.projectTitle,
                      pathLabel: item.source.pathLabel,
                    }}
                  />
                </div>
                <div className="flex flex-1 flex-col p-4 sm:p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">
                    {kindLabel(item.kind)}
                  </p>
                  <h2 className="mt-2 font-display text-lg font-bold tracking-tight text-ink transition group-hover:text-brand">
                    {item.title}
                  </h2>
                  <p className="mt-2 line-clamp-2 flex-1 text-sm leading-relaxed text-ink-muted">
                    {item.summary}
                  </p>
                  <p className="mt-4 text-xs text-ink-muted">
                    Issued {formatIssued(item.issuedAt)}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CREDENTIAL_KIND_LABELS, isCredentialKind } from "@coddle/shared";
import { useToast } from "@/components/app/toast";
import { DownloadableCertificate } from "@/components/credentials/credential-certificate";
import { CredentialNotFound } from "@/components/credentials/credential-not-found";
import { fetchCredential, type CredentialDetail } from "@/lib/credentials";

function kindLabel(kind: string) {
  return isCredentialKind(kind) ? CREDENTIAL_KIND_LABELS[kind] : kind;
}

function formatIssued(iso: string) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function sourceHref(credential: CredentialDetail) {
  if (credential.source.kind === "assessment" && credential.source.assessmentId) {
    return `/assessments/${credential.source.assessmentId}`;
  }
  if (credential.source.kind === "project" && credential.source.projectSlug) {
    return `/projects/${credential.source.projectSlug}`;
  }
  return null;
}

function sourceLabel(credential: CredentialDetail) {
  if (credential.source.kind === "assessment") {
    return credential.source.courseTitle
      ? `View assessment · ${credential.source.courseTitle}`
      : "View assessment";
  }
  if (credential.source.kind === "project") {
    return credential.source.pathLabel
      ? `View project · ${credential.source.pathLabel}`
      : "View project";
  }
  return "View source";
}

export function CredentialDetailView({
  credentialId,
  initialCredential,
}: {
  credentialId: string;
  initialCredential: CredentialDetail | null;
}) {
  const { pushToast } = useToast();
  const [copied, setCopied] = useState(false);
  const [credential, setCredential] = useState(initialCredential);
  const [loading, setLoading] = useState(initialCredential === null);

  useEffect(() => {
    if (initialCredential !== null) return;
    let cancelled = false;
    void (async () => {
      try {
        const data = await fetchCredential(credentialId);
        if (!cancelled) setCredential(data.credential);
      } catch {
        if (!cancelled) setCredential(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [credentialId, initialCredential]);

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-4xl px-5 py-10 sm:px-8">
        <p className="text-sm text-ink-muted">Loading credential…</p>
      </div>
    );
  }

  if (!credential) {
    return (
      <div className="mx-auto w-full max-w-4xl px-5 py-10 sm:px-8">
        <CredentialNotFound context="detail" />
      </div>
    );
  }

  // Local binding so nested handlers keep the non-null narrowing.
  const detail = credential;
  const href = sourceHref(detail);

  async function copyVerifyUrl() {
    try {
      await navigator.clipboard.writeText(detail.verifyUrl);
      setCopied(true);
      pushToast("Verification link copied", "success");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      pushToast("Could not copy the link", "error");
    }
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-5 py-10 sm:px-8">
      <Link
        href="/credentials"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-muted transition hover:text-ink"
      >
        ← All credentials
      </Link>

      <DownloadableCertificate
        className="mt-8"
        data={{
          earnerName: detail.earner.name,
          title: detail.title,
          kind: detail.kind,
          issuedAt: detail.issuedAt,
          code: detail.code,
          verifyUrl: detail.verifyUrl,
          assessmentTitle: detail.source.assessmentTitle,
          courseTitle: detail.source.courseTitle,
          projectTitle: detail.source.projectTitle,
          pathLabel: detail.source.pathLabel,
        }}
      />

      <article className="mt-8 rounded-3xl border border-border bg-surface p-6 sm:p-8">
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-brand">
          {kindLabel(detail.kind)} credential
        </p>
        <h1 className="mt-3 font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          {detail.title}
        </h1>
        <p className="mt-3 text-base leading-relaxed text-ink-muted">{detail.summary}</p>

        <dl className="mt-8 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">
              Issued
            </dt>
            <dd className="mt-1 text-sm font-medium text-ink">
              {formatIssued(detail.issuedAt)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">
              Earner
            </dt>
            <dd className="mt-1 text-sm font-medium text-ink">
              {detail.earner.username ? (
                <Link
                  href={`/u/${encodeURIComponent(detail.earner.username)}`}
                  className="transition hover:text-brand"
                >
                  {detail.earner.name}
                </Link>
              ) : (
                detail.earner.name
              )}
            </dd>
          </div>
        </dl>

        {href ? (
          <Link
            href={href}
            className="mt-6 inline-flex text-sm font-semibold text-brand hover:underline"
          >
            {sourceLabel(detail)}
          </Link>
        ) : null}

        <div className="mt-8 rounded-2xl border border-border bg-surface-subtle p-4 sm:p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">
            Share credential
          </p>
          <p className="mt-2 break-all font-mono text-sm text-ink">{detail.verifyUrl}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void copyVerifyUrl()}
              className="inline-flex rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110"
            >
              {copied ? "Copied" : "Copy link"}
            </button>
            <Link
              href={`/verify/${encodeURIComponent(detail.code)}`}
              className="inline-flex rounded-xl border border-border bg-surface px-4 py-2 text-sm font-semibold text-ink transition hover:border-brand/40"
            >
              Open public page
            </Link>
          </div>
        </div>
      </article>
    </div>
  );
}

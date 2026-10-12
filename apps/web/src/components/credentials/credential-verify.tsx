"use client";

import { DownloadableCertificate } from "@/components/credentials/credential-certificate";
import { CredentialNotFound } from "@/components/credentials/credential-not-found";
import { VerifyHeader } from "@/components/credentials/verify-header";
import type { CredentialDetail } from "@/lib/credentials";

function VerifyChrome({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-canvas text-ink">
      <VerifyHeader />
      <main className="mx-auto w-full max-w-4xl px-5 py-12 sm:px-8">{children}</main>
    </div>
  );
}

export function CredentialVerifyView({
  credential,
}: {
  credential: CredentialDetail | null;
}) {
  if (!credential) {
    return (
      <VerifyChrome>
        <CredentialNotFound />
      </VerifyChrome>
    );
  }

  return (
    <VerifyChrome>
      <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
        Verified credential
      </p>
      <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
        Certificate for {credential.earner.name}
      </h1>
      <p className="mt-3 max-w-xl text-base leading-relaxed text-ink-muted">
        {credential.summary}
      </p>

      <DownloadableCertificate
        className="mt-10"
        data={{
          earnerName: credential.earner.name,
          title: credential.title,
          kind: credential.kind,
          issuedAt: credential.issuedAt,
          code: credential.code,
          verifyUrl: credential.verifyUrl,
          assessmentTitle: credential.source.assessmentTitle,
          courseTitle: credential.source.courseTitle,
          projectTitle: credential.source.projectTitle,
          pathLabel: credential.source.pathLabel,
        }}
      />

      <p className="mt-8 text-sm text-ink-muted">
        Credentials on Coddle Learn are free and tied to real learning achievements.
      </p>
    </VerifyChrome>
  );
}

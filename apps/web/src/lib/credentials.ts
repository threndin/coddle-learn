import type { CredentialKind } from "@coddle/shared";
import { apiRequest } from "@/lib/api-client";

export type CredentialSource = {
  kind: CredentialKind | string;
  assessmentId: string | null;
  assessmentTitle: string | null;
  courseSlug: string | null;
  courseTitle: string | null;
  projectSlug: string | null;
  projectTitle: string | null;
  pathLabel: string | null;
};

export type CredentialSummary = {
  id: string;
  code: string;
  kind: CredentialKind | string;
  title: string;
  summary: string;
  issuedAt: string;
  verifyUrl: string;
  source: CredentialSource;
};

export type CredentialDetail = CredentialSummary & {
  earner: {
    name: string;
    avatarUrl: string | null;
  };
};

export type IssuedCredential = {
  id: string;
  code: string;
  kind: CredentialKind | string;
  title: string;
  summary: string;
  issuedAt: string;
  verifyUrl: string;
};

export function fetchCredentials() {
  return apiRequest<{ credentials: CredentialSummary[] }>("/credentials");
}

export function fetchCredential(id: string) {
  return apiRequest<{ credential: CredentialDetail }>(
    `/credentials/${encodeURIComponent(id)}`,
  );
}

export function verifyCredential(code: string) {
  return apiRequest<{ credential: CredentialDetail }>(
    `/verify/${encodeURIComponent(code)}`,
  );
}

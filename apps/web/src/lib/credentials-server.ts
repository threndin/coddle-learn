import type { CredentialDetail, CredentialSummary } from "@/lib/credentials";
import { serverApiFetch } from "@/lib/server-api";

export async function loadCredentials(): Promise<CredentialSummary[] | null> {
  try {
    const res = await serverApiFetch("/credentials");
    if (!res.ok) return null;
    const body = (await res.json()) as { data: { credentials: CredentialSummary[] } };
    return body.data.credentials;
  } catch {
    return null;
  }
}

export async function loadCredential(id: string): Promise<CredentialDetail | null> {
  try {
    const res = await serverApiFetch(`/credentials/${encodeURIComponent(id)}`);
    if (!res.ok) return null;
    const body = (await res.json()) as { data: { credential: CredentialDetail } };
    return body.data.credential;
  } catch {
    return null;
  }
}

export async function loadVerifiedCredential(
  code: string,
): Promise<CredentialDetail | null> {
  try {
    const res = await serverApiFetch(`/verify/${encodeURIComponent(code)}`, {
      withCookies: false,
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { data: { credential: CredentialDetail } };
    return body.data.credential;
  } catch {
    return null;
  }
}

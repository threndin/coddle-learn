import { cookies } from "next/headers";
import type { CredentialDetail, CredentialSummary } from "@/lib/credentials";

const apiUrl = (process.env.API_URL ?? "http://localhost:4000").replace(/\/$/, "");

async function apiFetch(path: string, withCookies = true) {
  const headers: HeadersInit = {};
  if (withCookies) {
    const jar = await cookies();
    const cookieHeader = jar
      .getAll()
      .map((cookie) => `${cookie.name}=${cookie.value}`)
      .join("; ");
    if (cookieHeader) headers.cookie = cookieHeader;
  }

  return fetch(`${apiUrl}${path}`, {
    headers,
    cache: "no-store",
  });
}

export async function loadCredentials(): Promise<CredentialSummary[] | null> {
  try {
    const res = await apiFetch("/credentials");
    if (!res.ok) return null;
    const body = (await res.json()) as { data: { credentials: CredentialSummary[] } };
    return body.data.credentials;
  } catch {
    return null;
  }
}

export async function loadCredential(id: string): Promise<CredentialDetail | null> {
  try {
    const res = await apiFetch(`/credentials/${encodeURIComponent(id)}`);
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
    const res = await apiFetch(`/verify/${encodeURIComponent(code)}`, false);
    if (!res.ok) return null;
    const body = (await res.json()) as { data: { credential: CredentialDetail } };
    return body.data.credential;
  } catch {
    return null;
  }
}

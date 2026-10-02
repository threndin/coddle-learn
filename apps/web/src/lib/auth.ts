export type PublicUser = {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  bio: string | null;
  coddleUserId: string;
  lastLoginAt: string | null;
  createdAt: string;
};

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`));
  if (!match) return null;
  return decodeURIComponent(match.slice(name.length + 1));
}

export async function fetchMe(): Promise<PublicUser | null> {
  const res = await fetch("/api/auth/me", {
    credentials: "include",
    cache: "no-store",
  });
  if (res.status === 401) return null;
  if (!res.ok) throw new Error("Could not load session");
  const body = (await res.json()) as { data: { user: PublicUser; csrf?: string } };
  return body.data.user;
}

export async function logout(): Promise<void> {
  const csrf = readCookie("learn_csrf");
  await fetch("/api/auth/logout", {
    method: "POST",
    credentials: "include",
    headers: csrf ? { "x-csrf-token": csrf } : {},
  });
}

export function startCoddleLogin(): void {
  window.location.href = "/api/auth/coddle/start";
}

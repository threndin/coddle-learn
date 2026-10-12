import { cookies } from "next/headers";
import { AUTH_COOKIES } from "@/lib/auth-cookies";

const apiUrl = (process.env.API_URL ?? "http://localhost:4000").replace(/\/$/, "");

function cookieHeaderFromMap(map: Map<string, string>): string {
  return [...map.entries()].map(([name, value]) => `${name}=${value}`).join("; ");
}

function applySetCookies(map: Map<string, string>, response: Response) {
  const lines =
    typeof response.headers.getSetCookie === "function"
      ? response.headers.getSetCookie()
      : [];
  for (const line of lines) {
    const [pair] = line.split(";");
    const eq = pair.indexOf("=");
    if (eq <= 0) continue;
    const name = pair.slice(0, eq).trim();
    const value = pair.slice(eq + 1).trim();
    const attrs = line.toLowerCase();
    if (attrs.includes("max-age=0") || value === "") {
      map.delete(name);
      continue;
    }
    map.set(name, value);
  }
}

/**
 * Server-side API fetch with cookies. On 401, rotates the refresh cookie once
 * and retries so short-lived access JWTs do not blank authenticated pages.
 */
export async function serverApiFetch(
  path: string,
  init: RequestInit & { withCookies?: boolean } = {},
): Promise<Response> {
  const { withCookies = true, headers: initHeaders, ...rest } = init;
  const headers = new Headers(initHeaders);

  if (!withCookies) {
    return fetch(`${apiUrl}${path}`, {
      ...rest,
      headers,
      cache: "no-store",
    });
  }

  const jar = await cookies();
  const cookieMap = new Map(jar.getAll().map((cookie) => [cookie.name, cookie.value]));

  const send = (map: Map<string, string>) => {
    const next = new Headers(headers);
    const cookieHeader = cookieHeaderFromMap(map);
    if (cookieHeader) next.set("cookie", cookieHeader);
    return fetch(`${apiUrl}${path}`, {
      ...rest,
      headers: next,
      cache: "no-store",
    });
  };

  const res = await send(cookieMap);
  if (res.status !== 401 || !cookieMap.get(AUTH_COOKIES.refresh)) {
    return res;
  }

  const csrf = cookieMap.get(AUTH_COOKIES.csrf);
  if (!csrf) return res;

  const refreshRes = await fetch(`${apiUrl}/auth/refresh`, {
    method: "POST",
    headers: {
      cookie: cookieHeaderFromMap(cookieMap),
      "x-csrf-token": csrf,
    },
    cache: "no-store",
  });

  if (!refreshRes.ok) return res;

  applySetCookies(cookieMap, refreshRes);

  // Best-effort: persist rotated cookies on the browser response when allowed.
  try {
    const writable = await cookies();
    for (const name of [
      AUTH_COOKIES.session,
      AUTH_COOKIES.refresh,
      AUTH_COOKIES.csrf,
    ] as const) {
      const value = cookieMap.get(name);
      if (value) writable.set(name, value, { path: "/" });
    }
  } catch {
    // Server Components cannot always mutate cookies; the retry below still uses
    // the rotated access token for this request.
  }

  return send(cookieMap);
}
